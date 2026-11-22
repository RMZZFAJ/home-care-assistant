import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  progressPreparationFixture as fixture,
  privateProgressCommand as command,
  privateProgressCommit as commit,
  progressFacts,
  actor,
  rpc,
  fixtures,
  sql,
  q,
} from "./progress-preparation-fixtures.mjs";
const read = (f, client = f.family) =>
  rpc(client, "progress_preparation_context", f.scope);
for (const type of ["REQ", "COM", "ENT", "BAL"])
  test(`private ${type} note saves incomplete text then publishes once without changing documentary or stock facts`, async () => {
    const f = await fixture(type),
      before = progressFacts(f),
      key = randomUUID();
    const saved = await command(
      f,
      f.family,
      "save",
      null,
      { ...f.content, note: { ...f.content.note, text: "" } },
      key,
    );
    assert.equal(
      (
        await command(
          f,
          f.family,
          "save",
          null,
          { ...f.content, note: { ...f.content.note, text: "" } },
          key,
        )
      ).replayed,
      true,
    );
    assert.equal((await read(f)).content.note.text, "");
    assert.equal(progressFacts(f), before);
    assert.equal(
      sql(
        `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
      ),
      "0",
    );
    const ready = await command(f, f.family, "save", saved),
      packet = commit(f, ready);
    const [a, b] = await Promise.all([
      rpc(f.family, "commit_progress_preparation", packet),
      rpc(f.family, "commit_progress_preparation", packet),
    ]);
    assert.equal(a.receipt.resourceId, b.receipt.resourceId);
    assert.equal(a.receipt.nativeResult.note.authorId, fixtures.family.id);
    assert.equal(a.receipt.command.content.text, f.content.note.text);
    assert.equal([a.replayed, b.replayed].filter(Boolean).length, 1);
    assert.equal(
      sql(
        `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
      ),
      "1",
    );
    assert.equal(progressFacts(f), before);
    assert.equal((await read(f)).content, null);
    assert.equal((await read(f)).state, "consumed");
    assert.equal(
      (
        await command(
          f,
          f.family,
          "save",
          null,
          { ...f.content, note: { ...f.content.note, text: "" } },
          key,
        )
      ).state,
      "active",
    ); // The original save acknowledgement is recoverable;live read stays consumed.
    assert.equal((await read(f)).state, "consumed");
  });
test("progress private state isolates owner/patient and serializes real concurrent CAS saves", async () => {
  const f = await fixture(),
    saved = await command(f, f.family),
    reader = await actor("reader", f.patient);
  assert.equal(await read(f, reader), null);
  assert.equal(
    (
      await reader.rpc("progress_preparation_command", {
        ...f.scope,
        p_id: saved.id,
        p_expected: saved.revision,
        p_key: randomUUID(),
        p_body: { action: "discard" },
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.family.rpc("progress_preparation_context", {
        ...f.scope,
        p_patient: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  const packets = ["A", "B"].map((text) => ({
    ...f.scope,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      content: { ...f.content, note: { ...f.content.note, text } },
      navigation: { version: 1, stage: "progress_note" },
    },
  }));
  const results = await Promise.all(
    packets.map((p) => f.family.rpc("progress_preparation_command", p)),
  );
  assert.equal(results.filter((x) => !x.error).length, 1);
  assert.equal(results.find((x) => x.error).error.code, "PT409");
  const current = await read(f);
  assert.equal(current.revision, 2);
  assert.ok(["A", "B"].includes(current.content.note.text));
});
test("progress private validation preserves the native payload and rejects stale/foreign references and native key collisions", async () => {
  const f = await fixture(),
    foreign = await fixture();
  await actor("family", f.patient);
  for (const content of [
    { ...f.content, note: { ...f.content.note, stage: "count" } },
    { ...f.content, note: { ...f.content.note, text: "😀".repeat(1001) } },
    { ...f.content, note: { ...f.content.note, references: [f.id, f.id] } },
  ])
    await assert.rejects(command(f, f.family, "save", null, content));
  let saved = await command(f, f.family, "save", null, {
    ...f.content,
    note: { ...f.content.note, references: [foreign.id] },
  });
  assert.equal(
    (
      await f.family.rpc(
        "commit_progress_preparation",
        commit(f, saved, randomUUID(), {
          ...f.content.note,
          references: [foreign.id],
        }),
      )
    ).error?.code,
    "42501",
  );
  assert.equal((await read(f)).state, "active");
  saved = await command(f, f.family, "save", saved, {
    ...f.content,
    note: { ...f.content.note, text: "\u00a0\ufeff" },
  });
  assert.equal(
    (
      await f.family.rpc(
        "commit_progress_preparation",
        commit(f, saved, randomUUID(), {
          ...f.content.note,
          text: "\u00a0\ufeff",
        }),
      )
    ).error?.code,
    "22023",
  );
  const key = randomUUID();
  await rpc(f.family, "document_progress_publish", {
    p_document: f.id,
    p_key: key,
    p_body: f.content.note,
  });
  saved = await command(f, f.family, "save", saved, {
    ...f.content,
    note: { ...f.content.note, text: "Novo texto preservado" },
  });
  assert.equal(
    (
      await f.family.rpc(
        "commit_progress_preparation",
        commit(f, saved, key, {
          ...f.content.note,
          text: "Novo texto preservado",
        }),
      )
    ).error?.code,
    "22023",
  );
  assert.equal((await read(f)).state, "active");
  assert.equal(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
    ),
    "1",
  );
});
test("private progress receipts reconstruct authorized reference labels and remain recoverable after write loss and inactive patient", async () => {
  const f = await fixture();
  const com = await rpc(f.family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_key: randomUUID(),
    p_draft: false,
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "1" }],
    },
  });
  const content = {
    ...f.content,
    note: { ...f.content.note, references: [com.id] },
  };
  let saved = await command(f, f.family, "save", null, content);
  const packet = commit(f, saved, randomUUID(), content.note),
    first = await rpc(f.family, "commit_progress_preparation", packet);
  assert.equal(first.receipt.nativeResult.note.references[0].code, com.code);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'com.read',${q(fixtures.family.id)},false),(${q(f.patient)},'document.progress.create',${q(fixtures.family.id)},false)`,
  );
  const current = await read(f);
  assert.deepEqual(current.consumedResult.nativeResult.note.references, []);
  assert.ok(
    !sql(
      `select consumed_result::text from private.progress_preparations where id=${q(saved.id)}`,
    ).includes(com.code),
  );
  sql(
    `update public.care_recipients set is_active=false where id=${q(f.patient)}`,
  );
  const replay = await rpc(f.family, "commit_progress_preparation", packet);
  assert.equal(replay.receipt.resourceId, first.receipt.resourceId);
  assert.deepEqual(replay.receipt.nativeResult.note.references, []);
  assert.equal(
    (
      await f.family.rpc("progress_preparation_command", {
        ...f.scope,
        p_id: null,
        p_expected: null,
        p_key: randomUUID(),
        p_body: {
          action: "save",
          content: f.content,
          navigation: { version: 1, stage: "progress_note" },
        },
      })
    ).error?.code,
    "42501",
  );
  saved = { id: saved.id, revision: current.revision };
  const acknowledged = await command(f, f.family, "acknowledge", saved);
  assert.equal(acknowledged.state, "completed");
  assert.equal(await read(f), null);
  assert.equal(
    (await rpc(f.family, "commit_progress_preparation", packet)).draft.state,
    "completed",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)}`,
  );
  assert.equal(
    (await f.family.rpc("progress_preparation_context", f.scope)).error?.code,
    "42501",
  );
});
test("lost progress creation permission still allows own discard without publishing", async () => {
  const f = await fixture(),
    saved = await command(f, f.family);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'document.progress.create',${q(fixtures.family.id)},false)`,
  );
  assert.equal((await read(f)).id, saved.id);
  assert.equal(
    (await command(f, f.family, "discard", saved)).state,
    "discarded",
  );
  assert.equal(await read(f), null);
  assert.equal(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
    ),
    "0",
  );
});
test("late journal revocation rolls back native publication,private consumption,journal and audit", async () => {
  const f = await fixture(),
    saved = await command(f, f.family),
    packet = commit(f, saved);
  const before = progressFacts(f),
    audit = sql(
      `select count(*) from public.audit_events where entity_id=${q(saved.id)} or metadata->>'document_id'=${q(f.id)}`,
    );
  assert.equal(
    sql("select to_regprocedure('private.phase_d3_progress_probe()') is null"),
    "t",
  );
  try {
    sql(
      `create function private.phase_d3_progress_probe() returns trigger language plpgsql security definer set search_path='' as $$begin if new.idempotency_key=${q(packet.p_key)}::uuid then insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'document.progress.create',${q(fixtures.family.id)},false);end if;return new;end;$$;create trigger phase_d3_progress_probe after insert on private.progress_preparation_commands for each row execute function private.phase_d3_progress_probe()`,
    );
    assert.equal(
      (await f.family.rpc("commit_progress_preparation", packet)).error?.code,
      "42501",
    );
    assert.equal((await read(f)).state, "active");
    assert.equal((await read(f)).revision, saved.revision);
    assert.equal(progressFacts(f), before);
    assert.equal(
      sql(
        `select count(*) from private.document_progress_notes where document_id=${q(f.id)}`,
      ),
      "0",
    );
    assert.equal(
      sql(
        `select count(*) from private.progress_preparation_commands where idempotency_key=${q(packet.p_key)}`,
      ),
      "0",
    );
    assert.equal(
      sql(
        `select count(*) from public.audit_events where entity_id=${q(saved.id)} or metadata->>'document_id'=${q(f.id)}`,
      ),
      audit,
    );
  } finally {
    sql(
      "drop trigger phase_d3_progress_probe on private.progress_preparation_commands;drop function private.phase_d3_progress_probe()",
    );
  }
  const acl = JSON.parse(
    sql(
      "select jsonb_build_object('anon',has_function_privilege('anon','public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)','execute'),'service',has_function_privilege('service_role','public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)','execute'),'auth',has_function_privilege('authenticated','public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)','execute'),'tableAuth',has_table_privilege('authenticated','private.progress_preparations','select,insert,update,delete'),'rls',(select relrowsecurity from pg_class where oid='private.progress_preparations'::regclass))",
    ),
  );
  assert.deepEqual(acl, {
    anon: false,
    service: false,
    auth: true,
    tableAuth: false,
    rls: true,
  });
});
