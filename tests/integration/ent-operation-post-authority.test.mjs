import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import {
  entOperationFixture,
  entPacket,
  entCommit,
  entFacts,
} from "./ent-operation-fixtures.mjs";

test("ENT commit rechecks write authority after its nested business event and rolls every effect back", async () => {
  const f = await entOperationFixture(),
    family = await actor("family", f.patient);
  f.document = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason: "Pessoa indicada pelo emissor fictício",
      lines: f.products.map((productId) => ({ productId, quantity: "2" })),
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  const packet = entPacket(f, "reassign"),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    before = entFacts(f),
    command = entCommit(f, "reassign", saved),
    name = "ent_draft_role_" + randomUUID().replaceAll("-", "");
  // Local structural probe: change the real patient's membership inside the nested
  // business event. Read remains allowed; the final write-authority guard must refuse.
  sql(`create function private.${name}() returns trigger language plpgsql security definer set search_path='' as $$ begin
    if new.document_id=${sqlLiteral(f.document.id)}::uuid and new.action='ent.reassign' then
      update public.care_recipient_memberships set role='reader' where care_recipient_id=${sqlLiteral(f.patient)}::uuid and user_id=${sqlLiteral(fixtures.adminA.id)}::uuid;
      if not private.member_can(${sqlLiteral(f.patient)}::uuid,${sqlLiteral(fixtures.adminA.id)}::uuid,'ent.read') then raise exception 'fixture must retain read';end if;
    end if;return new;end;$$;
    create trigger ${name} after insert on public.document_events for each row execute function private.${name}();`);
  try {
    const result = await f.admin.rpc("commit_supply_draft", command);
    assert.equal(result.error?.code, "42501");
    assert.equal(entFacts(f), before);
    assert.equal(
      sql(
        `select role::text from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`,
      ),
      "admin",
    );
    assert.equal(
      sql(
        `select revision from private.creation_drafts where id=${sqlLiteral(saved.id)};`,
      ),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from private.creation_draft_commands where owner_id=${sqlLiteral(fixtures.adminA.id)} and idempotency_key=${sqlLiteral(command.p_key)};`,
      ),
      "0",
    );
  } finally {
    sql(
      `drop trigger ${name} on public.document_events;drop function private.${name}();`,
    );
  }
});

test("ENT private resolution cannot turn a saved personal-receipt choice into authority for another manager", async () => {
  const f = await entOperationFixture("disputed"),
    packet = entPacket(f, "resolve", { resolution: "received" }),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    before = entFacts(f),
    command = entCommit(f, "resolve", saved);
  command.p_body.body.resolution = "received";
  const result = await f.admin.rpc("commit_supply_draft", command);
  assert.equal(result.error?.code, "42501");
  assert.equal(entFacts(f), before);
  assert.equal(
    sql(
      `select revision from private.creation_drafts where id=${sqlLiteral(saved.id)};`,
    ),
    "1",
  );
});
