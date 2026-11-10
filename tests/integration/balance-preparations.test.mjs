import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  preparationPurposes,
  preparationFixture,
  savePreparation,
  preparationPacket,
  preparationFacts,
} from "./balance-preparation-fixtures.mjs";
import { rpc, env, actor } from "./v4-fixtures.mjs";
import { balanceCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";

test("BAL workspace cannot attach an old native key to a new private preparation;the same private packet still recovers", async () => {
  const f = await preparationFixture("request_deferral"),
    key = randomUUID();
  await rpc(f.client, "balance_command", {
    p_patient: f.patient,
    p_action: f.command.action,
    p_body: f.command.body,
    p_version: f.content.referenceVersion,
    p_key: key,
  });
  const before = preparationFacts(f),
    saved = await savePreparation(f),
    rejected = await f.client.rpc(
      "commit_balance_preparation",
      preparationPacket(f, saved, key),
    );
  assert.equal(rejected.error?.code, "23505");
  assert.match(rejected.error.message, /native balance idempotency key/);
  assert.deepEqual(preparationFacts(f), before);
  const current = await rpc(f.client, "balance_preparation_context", f.scope);
  assert.equal(current.state, "active");
  assert.equal(current.revision, saved.revision);
  assert.equal(
    sql(
      `select count(*) from private.balance_preparation_commands where owner_id=${q(f.identity.id)} and idempotency_key=${q(key)};`,
    ),
    "0",
  );
  const packet = preparationPacket(f, saved),
    confirmed = await rpc(f.client, "commit_balance_preparation", packet);
  assert.equal(confirmed.state, "consumed");
  assert.equal(
    (await rpc(f.client, "commit_balance_preparation", packet)).replayed,
    true,
  );
  const after = preparationFacts(f);
  assert.equal(after.requests.length, before.requests.length + 1);
  assert.deepEqual(after.ledger, before.ledger);
});

test("BAL private resource targets remain exact beyond the native request page;two intentions have independent cursor slots", async () => {
  const f = await preparationFixture("approve_deferral");
  for (let i = 0; i < 101; i++)
    await balanceCommand(
      f.pro.client,
      f.patient,
      "request_deferral",
      {
        assignmentId: f.assignment.id,
        targetShiftId: f.target.id,
        reason: "Outro pedido legítimo para cobertura de paginação " + i,
      },
      f.assignment.version,
    );
  const native = await rpc(f.client, "balance_workspace", {
    p_patient: f.patient,
  });
  assert.equal(
    native.deferrals.some((d) => d.id === f.targetResourceId),
    false,
  );
  const reference = await rpc(
    f.client,
    "balance_preparation_reference",
    f.scope,
  );
  assert.equal(
    reference.workspace.deferrals.some((d) => d.id === f.targetResourceId),
    true,
  );
  assert.equal(reference.referenceHash, f.content.referenceHash);
  const first = await savePreparation(f);
  const reject = {
    ...f,
    purpose: "reject_deferral",
    scope: { ...f.scope, p_purpose: "reject_deferral" },
  };
  const secondRef = await rpc(
    f.client,
    "balance_preparation_reference",
    reject.scope,
  );
  reject.content = { ...f.content, referenceHash: secondRef.referenceHash };
  const second = await savePreparation(reject);
  const page1 = await rpc(f.client, "balance_preparation_list", {
    p_patient: f.patient,
    p_limit: 1,
  });
  assert.equal(page1.total, 2);
  assert.equal(page1.items.length, 1);
  const page2 = await rpc(f.client, "balance_preparation_list", {
    p_patient: f.patient,
    p_limit: 1,
    p_before: page1.items[0].createdAt,
    p_before_id: page1.items[0].id,
  });
  assert.equal(page2.total, 2);
  assert.equal(page2.items.length, 1);
  assert.notEqual(page1.items[0].id, page2.items[0].id);
  assert.deepEqual(
    new Set([page1.items[0].id, page2.items[0].id]),
    new Set([first.id, second.id]),
  );
  const consumed = await rpc(
    f.client,
    "commit_balance_preparation",
    preparationPacket(f, first),
  );
  assert.equal(consumed.consumedResult.nativeResult.id, f.targetResourceId);
  assert.equal(
    (await rpc(f.client, "balance_preparation_context", reject.scope)).state,
    "active",
  );
});

for (const purpose of preparationPurposes)
  test(`BAL workspace ${purpose}:private raw save,real anchor,sealed native decision,one concurrent commit,and personal recovery after write loss`, async () => {
    const f = await preparationFixture(purpose),
      before = preparationFacts(f),
      saved = await savePreparation(f);
    assert.deepEqual(preparationFacts(f), before);
    const own = await rpc(f.client, "balance_preparation_context", f.scope);
    assert.deepEqual(own.content, f.content);
    assert.equal(own.targetDocumentId, null);
    assert.equal(own.targetResourceId, f.targetResourceId);
    const foreign = await actor("family", f.patient);
    assert.equal(
      await rpc(foreign, "balance_preparation_context", f.scope),
      null,
    );
    const list = await rpc(f.client, "balance_preparation_list", {
      p_patient: f.patient,
    });
    assert.equal(list.items[0].id, saved.id);
    const packet = preparationPacket(f, saved),
      wrong = {
        ...packet,
        p_key: randomUUID(),
        p_body: {
          ...packet.p_body,
          command: {
            ...f.command,
            body: {
              ...f.command.body,
              reason: "Outro motivo depois da revisão",
            },
          },
        },
      };
    assert.ok((await f.client.rpc("commit_balance_preparation", wrong)).error);
    assert.deepEqual(preparationFacts(f), before);
    const [a, b] = await Promise.all([
      f.client.rpc("commit_balance_preparation", packet),
      f.client.rpc("commit_balance_preparation", packet),
    ]);
    assert.ifError(a.error);
    assert.ifError(b.error);
    assert.equal([a, b].filter((r) => r.data.replayed).length, 1);
    assert.deepEqual(a.data.consumedResult, b.data.consumedResult);
    const result = a.data;
    assert.equal(result.state, "consumed");
    assert.equal(result.revision, saved.revision + 1);
    assert.equal(result.consumedDocumentId, null);
    assert.ok(result.consumedResourceId);
    assert.deepEqual(result.consumedResult.command, f.command);
    assert.equal(result.consumedResult.actorId, f.identity.id);
    assert.equal(result.consumedResult.targetResourceId, f.targetResourceId);
    const after = preparationFacts(f);
    assert.deepEqual(after.ledger, before.ledger);
    assert.equal(
      sql(
        `select count(*) from private.bal_commands where care_recipient_id=${q(f.patient)} and key=${q(packet.p_key)};`,
      ),
      "1",
    );
    const cap =
      purpose === "configure" || purpose === "assign"
        ? "bal.schedule.manage"
        : purpose === "request_deferral"
          ? "bal.defer.request"
          : "bal.defer.approve";
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},${q(cap)},false);`,
    );
    const current = await rpc(f.client, "balance_preparation_context", f.scope);
    assert.equal(current.state, "consumed");
    assert.equal(current.content, null);
    assert.equal(
      (await rpc(f.client, "commit_balance_preparation", packet)).replayed,
      true,
    );
    assert.deepEqual(preparationFacts(f), after);
    await rpc(f.client, "balance_preparation_command", {
      ...f.scope,
      p_id: result.id,
      p_expected: result.revision,
      p_key: randomUUID(),
      p_body: { action: "acknowledge" },
    });
    assert.equal(
      await rpc(f.client, "balance_preparation_context", f.scope),
      null,
    );
    assert.ok(
      (
        await f.client.rpc("balance_preparation_command", {
          ...f.scope,
          p_id: null,
          p_expected: null,
          p_key: randomUUID(),
          p_body: {
            action: "save",
            content: f.content,
            navigation: { version: 1, stage: "bal_" + purpose },
          },
        })
      ).error,
    );
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},'bal.read',false);`,
    );
    assert.equal(
      (await f.client.rpc("commit_balance_preparation", packet)).error?.code,
      "42501",
    );
  });

test("BAL workspace two real sessions CAS;foreign owner;material copy;wrong patient and purpose remain rejected", async () => {
  const f = await preparationFixture("configure"),
    saved = await savePreparation(f),
    before = preparationFacts(f);
  const peer = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (
      await peer.auth.signInWithPassword({
        email: f.identity.email,
        password: fixturePassword,
      })
    ).error,
  );
  await rpc(peer, "select_active_context", { p_patient: f.patient });
  const one = {
      ...f.content,
      values: { ...f.content.values, reason: "Minha edição de uma sessão" },
    },
    two = {
      ...f.content,
      values: { ...f.content.values, reason: "Outra edição de sessão real" },
    };
  const race = await Promise.allSettled([
    savePreparation(f, one, saved),
    savePreparation(f, two, saved, randomUUID(), peer),
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  const current = await rpc(f.client, "balance_preparation_context", f.scope);
  assert.equal(current.revision, 2);
  assert.ok(
    [one.values.reason, two.values.reason].includes(
      current.content.values.reason,
    ),
  );
  const foreign = await actor("family", f.patient);
  await assert.rejects(() =>
    savePreparation(f, f.content, current, randomUUID(), foreign),
  );
  await assert.rejects(() =>
    savePreparation(
      f,
      { ...f.content, materials: [{ id: f.products[0] }] },
      current,
    ),
  );
  const other = await preparationFixture("configure");
  assert.ok(
    (
      await peer.rpc("balance_preparation_context", {
        ...f.scope,
        p_target: other.patient,
      })
    ).error,
  );
  assert.ok(
    (
      await peer.rpc("balance_preparation_context", {
        ...f.scope,
        p_purpose: "approve_deferral",
      })
    ).error,
  );
  assert.deepEqual(preparationFacts(f), before);
});

for (const purpose of ["configure", "request_deferral", "approve_deferral"])
  test(`BAL workspace ${purpose}:authority revoked after private journal rolls back native decision and private consumption`, async () => {
    const f = await preparationFixture(purpose),
      saved = await savePreparation(f),
      packet = preparationPacket(f, saved),
      before = preparationFacts(f),
      name = "probe_bal_preparation_" + randomUUID().replaceAll("-", "");
    const cap =
      purpose === "configure"
        ? "bal.schedule.manage"
        : purpose === "request_deferral"
          ? "bal.defer.request"
          : "bal.defer.approve";
    sql(
      `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.idempotency_key=${q(packet.p_key)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},${q(cap)},false);end if;return new;end;$$;create trigger ${name} after insert on private.balance_preparation_commands for each row execute function private.${name}();`,
    );
    try {
      assert.equal(
        (await f.client.rpc("commit_balance_preparation", packet)).error?.code,
        "42501",
      );
      assert.deepEqual(preparationFacts(f), before);
      const current = await rpc(
        f.client,
        "balance_preparation_context",
        f.scope,
      );
      assert.equal(current.state, "active");
      assert.equal(current.revision, saved.revision);
      assert.equal(
        sql(
          `select count(*) from private.balance_preparation_commands where idempotency_key=${q(packet.p_key)};`,
        ),
        "0",
      );
    } finally {
      sql(
        `drop trigger ${name} on private.balance_preparation_commands;drop function private.${name}();`,
      );
    }
  });

test("BAL workspace fresh reference is sealed;late regime mutation after journal rolls back the native command", async () => {
  const f = await preparationFixture("configure"),
    saved = await savePreparation(f),
    packet = preparationPacket(f, saved),
    name = "probe_bal_preparation_ref_" + randomUUID().replaceAll("-", "");
  sql(
    `create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$begin if new.idempotency_key=${q(packet.p_key)}::uuid then update public.bal_regimes set version=version+1 where care_recipient_id=${q(f.patient)}::uuid;end if;return new;end;$$;create trigger ${name} after insert on private.balance_preparation_commands for each row execute function private.${name}();`,
  );
  try {
    assert.equal(
      (await f.client.rpc("commit_balance_preparation", packet)).error?.code,
      "PT409",
    );
    assert.equal(
      (await rpc(f.client, "balance_preparation_context", f.scope)).revision,
      saved.revision,
    );
  } finally {
    sql(
      `drop trigger ${name} on private.balance_preparation_commands;drop function private.${name}();`,
    );
  }
  await balanceCommand(
    f.client,
    f.patient,
    "configure",
    { ...f.command.body, enabled: true },
    f.content.referenceVersion,
  );
  const before = preparationFacts(f);
  assert.equal(
    (await f.client.rpc("commit_balance_preparation", packet)).error?.code,
    "PT409",
  );
  assert.deepEqual(preparationFacts(f), before);
});
