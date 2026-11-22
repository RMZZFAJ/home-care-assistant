import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import {
  stockPreparationFixture,
  saveStockPreparation,
  stockPreparationPacket,
  stockPreparationFacts,
} from "./stock-preparation-fixtures.mjs";

test("private family stock keeps native management independent from balance reading and masks old private receipts", async () => {
  const f = await stockPreparationFixture("correction_in"),
    saved = await saveStockPreparation(f),
    packet = stockPreparationPacket(f, saved);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);`,
  );
  const current = await rpc(
    f.admin,
    "stock_movement_preparation_context",
    f.scope,
  );
  assert.ok(!Object.hasOwn(current.content.movement, "observedBalance"));
  assert.ok(!Object.hasOwn(current.content.movement, "referenceLabel"));
  const reference = await rpc(f.admin, "stock_movement_preparation_reference", {
    p_patient: f.patient,
    p_product: f.productId,
    p_reference: f.referenceId,
  });
  assert.equal(reference.canReadBalance, false);
  assert.equal(reference.balance, null);
  assert.equal(reference.origin.id, f.referenceId);
  for (const name of [
    "quantity",
    "sourceLocation",
    "destinationLocation",
    "recordedAt",
    "performedBy",
    "reason",
  ])
    assert.equal(reference.origin[name], null);
  await assert.rejects(() => saveStockPreparation(f, f.content, saved));
  const result = await rpc(
      f.admin,
      "commit_stock_movement_preparation",
      packet,
    ),
    receipt = result.consumedResult;
  assert.ok(!Object.hasOwn(receipt.preparedMovement, "observedBalance"));
  assert.ok(!Object.hasOwn(receipt.preparedMovement, "referenceLabel"));
  assert.equal(receipt.movement.referenceId, f.referenceId);
  assert.equal(receipt.movement.performedBy, fixtures.adminA.id);
  assert.deepEqual(
    (await rpc(f.admin, "commit_stock_movement_preparation", packet))
      .consumedResult,
    receipt,
  );
  assert.deepEqual(
    (await rpc(f.admin, "stock_movement_preparation_context", f.scope))
      .consumedResult,
    receipt,
  );
  const ack = {
    ...f.scope,
    p_id: result.id,
    p_expected: result.revision,
    p_key: randomUUID(),
    p_body: { action: "acknowledge" },
  };
  assert.deepEqual(
    (await rpc(f.admin, "stock_movement_preparation_command", ack))
      .consumedResult,
    receipt,
  );
  assert.deepEqual(
    (await rpc(f.admin, "stock_movement_preparation_command", ack))
      .consumedResult,
    receipt,
  );
});

test("private family stock delegated writer confirms without receiving family balance or another owner's preparation", async () => {
  const f = await stockPreparationFixture(),
    pro = await actor("professional", f.patient),
    before = stockPreparationFacts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.professional.id)},'stock.family.manage',true);`,
  );
  const ref = await rpc(pro, "stock_movement_preparation_reference", {
    p_patient: f.patient,
    p_product: f.productId,
    p_reference: null,
  });
  assert.equal(ref.balance, null);
  assert.equal(ref.canReadBalance, false);
  const content = globalThis.structuredClone(f.content);
  delete content.movement.observedBalance;
  delete content.movement.referenceLabel;
  const saved = await saveStockPreparation(f, content, null, randomUUID(), pro);
  assert.equal(
    await rpc(f.admin, "stock_movement_preparation_context", f.scope),
    null,
  );
  f.content = content;
  const result = await rpc(
    pro,
    "commit_stock_movement_preparation",
    stockPreparationPacket(f, saved),
  );
  assert.equal(result.consumedResult.actorId, fixtures.professional.id);
  assert.equal(
    stockPreparationFacts(f).ledger.length,
    before.ledger.length + 1,
  );
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.professional.id)} and capability='stock.family.manage';`,
  );
  assert.equal(
    (await pro.rpc("stock_movement_preparation_context", f.scope)).error?.code,
    "42501",
  );
});

test("private family stock masks a balance permission revoked after journal while keeping the authorized native act", async () => {
  const f = await stockPreparationFixture(),
    saved = await saveStockPreparation(f),
    packet = stockPreparationPacket(f, saved),
    before = stockPreparationFacts(f),
    probe = "probe_stock_read_" + randomUUID().replaceAll("-", "");
  sql(
    `create function private.${probe}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.idempotency_key=${q(packet.p_key)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);end if;return new;end;$$;create trigger ${probe} after insert on private.stock_movement_preparation_commands for each row execute function private.${probe}();`,
  );
  try {
    const result = await rpc(
      f.admin,
      "commit_stock_movement_preparation",
      packet,
    );
    assert.equal(
      stockPreparationFacts(f).ledger.length,
      before.ledger.length + 1,
    );
    assert.ok(
      !Object.hasOwn(result.consumedResult.preparedMovement, "observedBalance"),
    );
    assert.ok(
      !Object.hasOwn(
        (await rpc(f.admin, "commit_stock_movement_preparation", packet))
          .consumedResult.preparedMovement,
        "observedBalance",
      ),
    );
  } finally {
    sql(
      `drop trigger if exists ${probe} on private.stock_movement_preparation_commands;drop function if exists private.${probe}();`,
    );
  }
});

test("private family stock rejects misleading display facts and invalid native precision without consuming the draft", async () => {
  const f = await stockPreparationFixture(),
    before = stockPreparationFacts(f);
  let saved = null;
  const original = globalThis.structuredClone(f.content);
  for (const patch of [
    { observedBalance: "999" },
    { productLabel: "Outro material" },
    { unit: "Outra unidade" },
    { quantity: "0,5" },
  ]) {
    f.content = { ...original, movement: { ...original.movement, ...patch } };
    saved = await saveStockPreparation(f, f.content, saved);
    const result = await f.admin.rpc(
      "commit_stock_movement_preparation",
      stockPreparationPacket(f, saved),
    );
    assert.equal(result.error?.code, "quantity" in patch ? "22023" : "PT409");
    assert.deepEqual(stockPreparationFacts(f), before);
    const current = await rpc(
      f.admin,
      "stock_movement_preparation_context",
      f.scope,
    );
    assert.equal(current.state, "active");
    assert.equal(current.revision, saved.revision);
  }
  const other = await stockPreparationFixture();
  assert.equal(
    (
      await f.admin.rpc("stock_movement_preparation_reference", {
        p_patient: f.patient,
        p_product: other.productId,
        p_reference: other.referenceId,
      })
    ).error?.code,
    "42501",
  );
  const grantFacts = JSON.parse(
    sql(
      `select jsonb_build_object('public',(select jsonb_agg(jsonb_build_object('name',p.proname,'anon',has_function_privilege('anon',p.oid,'execute'),'auth',has_function_privilege('authenticated',p.oid,'execute'),'service',has_function_privilege('service_role',p.oid,'execute'),'config',p.proconfig)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('stock_movement_preparation_reference','stock_movement_preparation_context','stock_movement_preparation_command','commit_stock_movement_preparation')),'tables',(select jsonb_agg(jsonb_build_object('rls',c.relrowsecurity,'auth',has_table_privilege('authenticated',c.oid,'select'),'service',has_table_privilege('service_role',c.oid,'select'))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('stock_movement_preparations','stock_movement_preparation_commands')))::text;`,
    ),
  );
  assert.equal(grantFacts.public.length, 4);
  assert.equal(grantFacts.tables.length, 2);
  assert.ok(
    grantFacts.public.every(
      (x) =>
        !x.anon && x.auth && !x.service && x.config.includes('search_path=""'),
    ),
  );
  assert.ok(grantFacts.tables.every((x) => x.rls && !x.auth && !x.service));
});

for (const action of ["inbound", "outbound", "correction_in", "correction_out"])
  test(`private family stock ${action}:save preserves facts;atomic native movement and exact recovery`, async () => {
    const f = await stockPreparationFixture(action),
      before = stockPreparationFacts(f),
      saved = await saveStockPreparation(f);
    assert.deepEqual(stockPreparationFacts(f), before);
    const sameUser = await actor("adminA", f.patient),
      read = await rpc(sameUser, "stock_movement_preparation_context", f.scope);
    assert.deepEqual(read.content, f.content);
    assert.equal(read.kind, "STOCK");
    assert.equal(read.targetDocumentId, null);
    const packet = stockPreparationPacket(f, saved),
      result = await rpc(sameUser, "commit_stock_movement_preparation", packet);
    assert.equal(result.state, "consumed");
    assert.equal(result.revision, 2);
    const after = stockPreparationFacts(f);
    assert.equal(after.ledger.length, before.ledger.length + 1);
    assert.equal(after.documents, before.documents);
    const native = after.ledger.find((m) => m.id === result.consumedResourceId);
    assert.equal(native.reference_type, "family_manual");
    assert.equal(native.reference_id, f.referenceId);
    assert.equal(native.performed_by, fixtures.adminA.id);
    assert.equal(
      native.source_location,
      action.endsWith("out") || action === "outbound" ? "FAMILY" : null,
    );
    assert.equal(
      native.destination_location,
      action === "inbound" || action === "correction_in" ? "FAMILY" : null,
    );
    assert.equal(result.consumedResult.movement.id, native.id);
    assert.equal(result.consumedResult.command.idempotencyKey, packet.p_key);
    assert.equal(
      (await rpc(f.admin, "commit_stock_movement_preparation", packet))
        .replayed,
      true,
    );
    assert.deepEqual(stockPreparationFacts(f), after);
    const changed = await f.admin.rpc("commit_stock_movement_preparation", {
      ...packet,
      p_body: {
        ...packet.p_body,
        command: {
          ...packet.p_body.command,
          reason: "Outro motivo na mesma chave",
        },
      },
    });
    assert.equal(changed.error?.code, "23505");
    assert.deepEqual(stockPreparationFacts(f), after);
  });

test("private family stock CAS,owner/patient isolation,partial save and safe discard", async () => {
  const f = await stockPreparationFixture(),
    before = stockPreparationFacts(f),
    partial = {
      movement: { action: "inbound", reason: "Ainda sem material" },
      referenceHash: null,
    },
    saved = await saveStockPreparation(f, partial);
  const peer = await actor("adminA", f.patient),
    foreign = await actor("family", f.patient),
    pro = await actor("professional", f.patient);
  const changed = {
    ...partial,
    movement: { ...partial.movement, reason: "Outra sessão preservada" },
  };
  const race = await Promise.allSettled([
    saveStockPreparation(f, f.content, saved),
    saveStockPreparation(f, changed, saved, randomUUID(), peer),
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  const current = await rpc(
    f.admin,
    "stock_movement_preparation_context",
    f.scope,
  );
  assert.equal(current.revision, 2);
  assert.equal(
    await rpc(foreign, "stock_movement_preparation_context", f.scope),
    null,
  );
  await assert.rejects(() =>
    saveStockPreparation(f, f.content, current, randomUUID(), foreign),
  );
  assert.ok(
    (await pro.rpc("stock_movement_preparation_context", f.scope)).error,
  );
  assert.ok(
    (
      await peer.rpc("stock_movement_preparation_context", {
        ...f.scope,
        p_target: randomUUID(),
      })
    ).error,
  );
  await assert.rejects(() =>
    saveStockPreparation(
      f,
      { ...f.content, materials: [{ id: f.productId }] },
      current,
    ),
  );
  assert.deepEqual(stockPreparationFacts(f), before);
  const discarded = await rpc(f.admin, "stock_movement_preparation_command", {
    ...f.scope,
    p_id: current.id,
    p_expected: current.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(discarded.state, "discarded");
  assert.equal(
    await rpc(f.admin, "stock_movement_preparation_context", f.scope),
    null,
  );
  assert.deepEqual(stockPreparationFacts(f), before);
});

test("private family stock detects same-balance ledger changes and consumes only a newly adopted reference", async () => {
  const f = await stockPreparationFixture(),
    saved = await saveStockPreparation(f);
  for (const action of ["inbound", "outbound"])
    await rpc(f.admin, "family_stock_movement", {
      p_patient: f.patient,
      p_product: f.productId,
      p_quantity: "1",
      p_action: action,
      p_reason: "Mesmo saldo, nova história real",
      p_key: randomUUID(),
    });
  const before = stockPreparationFacts(f),
    stale = await f.admin.rpc(
      "commit_stock_movement_preparation",
      stockPreparationPacket(f, saved),
    );
  assert.equal(stale.error?.code, "PT409");
  assert.deepEqual(stockPreparationFacts(f), before);
  const reference = await rpc(f.admin, "stock_movement_preparation_reference", {
    p_patient: f.patient,
    p_product: f.productId,
    p_reference: null,
  });
  assert.equal(reference.balance, f.reference.balance);
  assert.notEqual(reference.referenceHash, f.reference.referenceHash);
  f.content.referenceHash = reference.referenceHash;
  const adopted = await saveStockPreparation(f, f.content, saved);
  const packet = stockPreparationPacket(f, adopted),
    race = await Promise.all([
      rpc(f.admin, "commit_stock_movement_preparation", packet),
      rpc(
        await actor("adminA", f.patient),
        "commit_stock_movement_preparation",
        packet,
      ),
    ]);
  assert.equal(new Set(race.map((r) => r.consumedResourceId)).size, 1);
  assert.equal(
    stockPreparationFacts(f).ledger.length,
    before.ledger.length + 1,
  );
});

test("private family stock rejects an old native key;own private replay survives loss of write authority", async () => {
  const f = await stockPreparationFixture(),
    key = randomUUID();
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: f.productId,
    p_quantity: "1",
    p_action: "inbound",
    p_reason: f.content.movement.reason,
    p_key: key,
  });
  const updatedReference = await rpc(
    f.admin,
    "stock_movement_preparation_reference",
    { p_patient: f.patient, p_product: f.productId, p_reference: null },
  );
  f.content.referenceHash = updatedReference.referenceHash;
  f.content.movement.observedBalance = updatedReference.balance;
  const saved = await saveStockPreparation(f),
    before = stockPreparationFacts(f);
  const collision = await f.admin.rpc(
    "commit_stock_movement_preparation",
    stockPreparationPacket(f, saved, key),
  );
  assert.equal(collision.error?.code, "23505");
  assert.match(collision.error.message, /native stock key/);
  assert.deepEqual(stockPreparationFacts(f), before);
  const packet = stockPreparationPacket(f, saved),
    result = await rpc(f.admin, "commit_stock_movement_preparation", packet),
    after = stockPreparationFacts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);`,
  );
  assert.equal(
    (await rpc(f.admin, "commit_stock_movement_preparation", packet))
      .consumedResourceId,
    result.consumedResourceId,
  );
  assert.equal(
    (await rpc(f.admin, "stock_movement_preparation_context", f.scope))
      .consumedResult.resourceId,
    result.consumedResourceId,
  );
  const done = await rpc(f.admin, "stock_movement_preparation_command", {
    ...f.scope,
    p_id: result.id,
    p_expected: result.revision,
    p_key: randomUUID(),
    p_body: { action: "acknowledge" },
  });
  assert.equal(done.state, "completed");
  await assert.rejects(() => saveStockPreparation(f));
  assert.deepEqual(stockPreparationFacts(f), after);
});

test("private family stock revocation after journal rolls back movement,consumption and audit atomically", async () => {
  const f = await stockPreparationFixture(),
    saved = await saveStockPreparation(f),
    packet = stockPreparationPacket(f, saved),
    before = stockPreparationFacts(f),
    probe = "probe_stock_preparation_" + randomUUID().replaceAll("-", "");
  sql(
    `create function private.${probe}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.idempotency_key=${q(packet.p_key)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);end if;return new;end;$$;create trigger ${probe} after insert on private.stock_movement_preparation_commands for each row execute function private.${probe}();`,
  );
  try {
    assert.equal(
      (await f.admin.rpc("commit_stock_movement_preparation", packet)).error
        ?.code,
      "42501",
    );
    assert.deepEqual(stockPreparationFacts(f), before);
    const current = await rpc(
      f.admin,
      "stock_movement_preparation_context",
      f.scope,
    );
    assert.equal(current.state, "active");
    assert.equal(current.revision, saved.revision);
    assert.equal(
      sql(
        `select count(*) from private.stock_movement_preparation_commands where owner_id=${q(fixtures.adminA.id)} and idempotency_key=${q(packet.p_key)};`,
      ),
      "0",
    );
  } finally {
    sql(
      `drop trigger if exists ${probe} on private.stock_movement_preparation_commands;drop function if exists private.${probe}();`,
    );
  }
});

test("private family stock inactive patient allows own recovery and cleanup but no new private save or physical act", async () => {
  const f = await stockPreparationFixture(),
    saved = await saveStockPreparation(f),
    packet = stockPreparationPacket(f, saved),
    result = await rpc(f.admin, "commit_stock_movement_preparation", packet),
    after = stockPreparationFacts(f);
  sql(
    `update public.care_recipients set is_active=false where id=${q(f.patient)};`,
  );
  assert.equal(
    (await rpc(f.admin, "commit_stock_movement_preparation", packet))
      .consumedResourceId,
    result.consumedResourceId,
  );
  const ack = await rpc(f.admin, "stock_movement_preparation_command", {
    ...f.scope,
    p_id: result.id,
    p_expected: result.revision,
    p_key: randomUUID(),
    p_body: { action: "acknowledge" },
  });
  assert.equal(ack.state, "completed");
  await assert.rejects(() => saveStockPreparation(f));
  assert.deepEqual(stockPreparationFacts(f), after);
  const partial = await stockPreparationFixture(),
    active = await saveStockPreparation(partial),
    before = stockPreparationFacts(partial);
  sql(
    `update public.care_recipients set is_active=false where id=${q(partial.patient)};`,
  );
  assert.equal(
    (
      await partial.admin.rpc(
        "commit_stock_movement_preparation",
        stockPreparationPacket(partial, active),
      )
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await rpc(partial.admin, "stock_movement_preparation_command", {
        ...partial.scope,
        p_id: active.id,
        p_expected: active.revision,
        p_key: randomUUID(),
        p_body: { action: "discard" },
      })
    ).state,
    "discarded",
  );
  assert.deepEqual(stockPreparationFacts(partial), before);
});
