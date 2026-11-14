import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { entFacts } from "./ent-operation-fixtures.mjs";
import {
  consentFixture,
  consentPacket,
  consentCommit,
  consentRead,
  consentAllocations,
  addConsentConsumption,
} from "./ent-consent-fixtures.mjs";
const facts = (f) => JSON.stringify([entFacts(f), consentAllocations(f)]);
const save = (client, packet, saved, content = packet.p_body.content) =>
  rpc(client, "supply_draft_command", {
    ...packet,
    p_id: saved?.id ?? null,
    p_expected: saved?.revision ?? null,
    p_key: randomUUID(),
    p_body: { ...packet.p_body, content },
  });

test("ENT consent keeps incomplete actual returns across two Auth devices with CAS and no official effect", async () => {
  const f = await consentFixture(),
    peer = await draftDevice(f.patient, "professional"),
    packet = consentPacket(f, "2,"),
    before = facts(f);
  const saved = await save(f.pro, packet),
    read = await consentRead(peer, f);
  assert.deepEqual(read.content, packet.p_body.content);
  assert.equal(facts(f), before);
  assert.equal(await consentRead(f.admin, f), null);
  assert.equal(
    (await f.admin.rpc("supply_draft_command", packet)).error?.code,
    "42501",
  );
  const newer = await save(peer, packet, saved, {
    ...read.content,
    fields: {
      ...read.content.fields,
      reason: "Motivo preservado da segunda sessão",
    },
  });
  assert.equal(
    (
      await f.pro.rpc("supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: saved.revision,
        p_key: randomUUID(),
      })
    ).error?.code,
    "PT409",
  );
  assert.equal(
    (await f.pro.rpc("commit_supply_draft", consentCommit(f, newer))).error
      ?.code,
    "22023",
  );
  assert.equal((await consentRead(f.pro, f)).revision, newer.revision);
  assert.equal(facts(f), before);
});

test("ENT consent binds request, sealed source and every return before one immutable result and replay", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet),
    before = facts(f),
    command = consentCommit(f, saved);
  for (const changed of [
    { requestId: randomUUID() },
    { referenceHash: "f".repeat(64) },
    {
      lines: command.p_body.body.lines.map((line, i) => ({
        ...line,
        returnQuantity: i ? "2" : "1",
      })),
    },
    { lines: command.p_body.body.lines.slice(0, 1) },
    { lines: [command.p_body.body.lines[0], command.p_body.body.lines[0]] },
  ]) {
    assert.equal(
      (
        await f.pro.rpc("commit_supply_draft", {
          ...command,
          p_key: randomUUID(),
          p_body: {
            ...command.p_body,
            body: { ...command.p_body.body, ...changed },
          },
        })
      ).error?.code,
      "22023",
    );
    assert.equal(facts(f), before);
  }
  const other = await actor("global", f.patient);
  assert.equal(
    (await other.rpc("commit_supply_draft", command)).error?.code,
    "42501",
  );
  const result = await rpc(f.pro, "commit_supply_draft", command),
    after = facts(f);
  assert.equal(result.result.status, "cancelled");
  assert.equal(result.state, "consumed");
  assert.equal(
    (await rpc(f.pro, "commit_supply_draft", command)).replayed,
    true,
  );
  assert.equal(facts(f), after);
  assert.equal(
    (
      await f.pro.rpc("commit_supply_draft", {
        ...command,
        p_key: randomUUID(),
      })
    ).error?.code,
    "PT409",
  );
  assert.equal(
    sql(
      `select count(*) from public.document_events where document_id=${q(f.document.id)} and action='ent.consent_cancel';`,
    ),
    "1",
  );
  assert.equal(
    sql(
      `select sum(quantity)::text from public.delivery_consumption_allocations where document_id=${q(f.document.id)};`,
    ),
    "2.000000",
  );
});

test("ENT consent detects a changed consumption hash at the same document version and requires a new private revision", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet),
    old = consentCommit(f, saved);
  const current = await addConsentConsumption(f);
  assert.equal(current.version, f.document.version);
  assert.notEqual(
    current.deliveryCancellation.referenceHash,
    f.document.deliveryCancellation.referenceHash,
  );
  const before = facts(f),
    fresh = { ...f, document: current };
  assert.equal(
    (
      await f.pro.rpc("commit_supply_draft", {
        ...consentCommit(fresh, saved, "1"),
        p_key: randomUUID(),
      })
    ).error?.code,
    "22023",
  );
  assert.equal(
    (await f.pro.rpc("commit_supply_draft", old)).error?.message,
    "stale delivery consumption reference",
  );
  assert.equal(facts(f), before);
  assert.equal((await consentRead(f.pro, f)).revision, 1);
  const replacement = consentPacket(fresh, "1"),
    updated = await save(f.pro, replacement, saved);
  const result = await rpc(
    f.pro,
    "commit_supply_draft",
    consentCommit(fresh, updated, "1"),
  );
  assert.equal(result.result.status, "cancelled");
  assert.equal(
    sql(
      `select sum(quantity)::text from public.delivery_consumption_allocations where document_id=${q(f.document.id)};`,
    ),
    "4.000000",
  );
});

test("ENT consent does not cache source facts and own discard survives lost write while source access and foreign ownership stay closed", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet),
    before = facts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'stock.team.read',${q(fixtures.professional.id)},false);`,
  );
  const current = await rpc(f.pro, "operational_document", {
    p_id: f.document.id,
  });
  assert.equal(current.deliveryCancellation.sourceAccess, false);
  assert.deepEqual(current.deliveryCancellation.lines, []);
  const read = await consentRead(f.pro, f);
  assert.equal(JSON.stringify(read.content).includes("movementId"), false);
  assert.equal(
    JSON.stringify(read.content).includes("consumptionReferences"),
    false,
  );
  assert.equal(
    (await f.pro.rpc("commit_supply_draft", consentCommit(f, saved))).error
      ?.code,
    "42501",
  );
  assert.equal(facts(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'ent.receive',${q(fixtures.professional.id)},false);`,
  );
  assert.equal(
    (
      await f.pro.rpc("supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: 1,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  const discard = {
    ...packet,
    p_id: saved.id,
    p_expected: 1,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  };
  assert.equal(
    (await f.admin.rpc("supply_draft_command", discard)).error?.code,
    "42501",
  );
  await rpc(f.pro, "supply_draft_command", discard);
  assert.equal(await consentRead(f.pro, f), null);
  assert.equal(facts(f), before);
});

test("ENT consent rechecks personal authority after an observed private slot wait", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet),
    before = facts(f);
  const result = await whileAdvisoryWaits(
    `supply-draft-slot:${fixtures.professional.id}:${f.patient}:ENT:consent_cancel:${f.document.id}`,
    () => f.pro.rpc("commit_supply_draft", consentCommit(f, saved)),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'ent.receive',${q(fixtures.professional.id)},false);`,
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(facts(f), before);
  assert.equal((await consentRead(f.pro, f)).revision, 1);
});

test("ENT consent source hash changes during its observed slot wait roll back every private and official effect", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet);
  let atBarrier;
  const result = await whileAdvisoryWaits(
    `supply-draft-slot:${fixtures.professional.id}:${f.patient}:ENT:consent_cancel:${f.document.id}`,
    () => f.pro.rpc("commit_supply_draft", consentCommit(f, saved)),
    async () => {
      const current = await addConsentConsumption(f);
      assert.equal(current.version, f.document.version);
      atBarrier = facts(f);
    },
  );
  assert.equal(result.error?.code, "P0001");
  assert.equal(result.error?.message, "stale delivery consumption reference");
  assert.equal(facts(f), atBarrier);
  assert.equal((await consentRead(f.pro, f)).revision, 1);
});

test("ENT consent post-event loss of real recipient authority rolls back document, allocations, stock and private result", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet),
    before = facts(f),
    command = consentCommit(f, saved);
  const name = "consent_draft_role_" + randomUUID().replaceAll("-", "");
  sql(`create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$ begin
    if new.document_id=${q(f.document.id)}::uuid and new.action='ent.consent_cancel' then
      update public.care_recipient_memberships set role='reader' where care_recipient_id=${q(f.patient)}::uuid and user_id=${q(fixtures.professional.id)}::uuid;
      if not private.member_can(${q(f.patient)}::uuid,${q(fixtures.professional.id)}::uuid,'ent.read') then raise exception 'fixture must retain read';end if;
    end if;return new;end;$$;
    create trigger ${name} after insert on public.document_events for each row execute function private.${name}();`);
  try {
    assert.equal(
      (await f.pro.rpc("commit_supply_draft", command)).error?.code,
      "42501",
    );
    assert.equal(facts(f), before);
    assert.equal(
      sql(
        `select revision from private.creation_drafts where id=${q(saved.id)};`,
      ),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from private.creation_draft_commands where owner_id=${q(fixtures.professional.id)} and idempotency_key=${q(command.p_key)};`,
      ),
      "0",
    );
    assert.equal(
      sql(
        `select role from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.professional.id)};`,
      ),
      "professional",
    );
  } finally {
    sql(
      `drop trigger ${name} on public.document_events;drop function private.${name}();`,
    );
  }
});

test("ENT consumed consent remains recoverable and acknowledgeable after write revocation while patient read and private grants stay enforced", async () => {
  const f = await consentFixture(),
    packet = consentPacket(f),
    saved = await save(f.pro, packet),
    command = consentCommit(f, saved);
  const applied = await rpc(f.pro, "commit_supply_draft", command),
    before = facts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'ent.receive',${q(fixtures.professional.id)},false);`,
  );
  assert.equal((await consentRead(f.pro, f)).state, "consumed");
  assert.equal(
    (await rpc(f.pro, "commit_supply_draft", command)).replayed,
    true,
  );
  await rpc(f.pro, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: applied.revision,
    p_key: randomUUID(),
    p_body: { action: "acknowledge" },
  });
  assert.equal(await consentRead(f.pro, f), null);
  assert.equal(facts(f), before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'ent.read',${q(fixtures.professional.id)},false);`,
  );
  assert.equal(
    (
      await f.pro.rpc("supply_draft_context", {
        p_patient: f.patient,
        p_kind: "ENT",
        p_purpose: "consent_cancel",
        p_target: f.document.id,
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    sql(
      "select has_function_privilege('authenticated','private.require_ent_consent_draft_intent(jsonb,jsonb)','execute') or has_function_privilege('anon','private.require_ent_consent_draft_intent(jsonb,jsonb)','execute') or has_function_privilege('service_role','private.require_ent_consent_draft_intent(jsonb,jsonb)','execute');",
    ),
    "f",
  );
});
