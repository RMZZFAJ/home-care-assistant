import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { fixtures, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import {
  transferDecisionFixture,
  decisionPacket,
  decisionCommit,
  decisionFacts,
} from "./transfer-decision-draft-fixtures.mjs";
test("private transfer administrative closure requires the real local role before and after its journal", async () => {
  const f = await transferDecisionFixture("withdraw"),
    packet = decisionPacket(f),
    before = decisionFacts(f);
  sql(
    "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
      q(f.patient) +
      "," +
      q(f.recipient.id) +
      ",'access.manage',true);",
  );
  assert.equal(
    (await f.recipient.client.rpc("supply_draft_command", packet)).error?.code,
    "42501",
  );
  const saved = await rpc(f.admin, "supply_draft_command", packet),
    command = decisionCommit(f, saved);
  const name = "probe_transfer_admin_" + randomUUID().replaceAll("-", "");
  sql(
    "create function private." +
      name +
      "() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=" +
      q(saved.id) +
      "::uuid then update public.care_recipient_memberships set role='reader' where care_recipient_id=" +
      q(f.patient) +
      " and user_id=" +
      q(fixtures.adminA.id) +
      ";end if;return new;end;$$;create trigger " +
      name +
      " after insert on private.creation_draft_commands for each row execute function private." +
      name +
      "();",
  );
  try {
    assert.equal(
      (await f.admin.rpc("commit_supply_draft", command)).error?.code,
      "42501",
    );
    assert.equal(decisionFacts(f), before);
    assert.equal(
      sql(
        "select role from public.care_recipient_memberships where care_recipient_id=" +
          q(f.patient) +
          " and user_id=" +
          q(fixtures.adminA.id) +
          ";",
      ),
      "admin",
    );
    assert.equal(
      sql(
        "select count(*) from private.creation_draft_commands where idempotency_key=" +
          q(command.p_key) +
          ";",
      ),
      "0",
    );
  } finally {
    sql(
      "drop trigger " +
        name +
        " on private.creation_draft_commands;drop function private." +
        name +
        "();",
    );
  }
  const result = await rpc(f.admin, "commit_supply_draft", command);
  assert.equal(result.result.transfer.withdrawal.kind, "administrative_close");
  assert.equal(result.result.transfer.withdrawal.actor.id, fixtures.adminA.id);
  assert.deepEqual(
    JSON.parse(decisionFacts(f)).ledger,
    JSON.parse(before).ledger,
  );
  assert.deepEqual(
    result.result.transfer.declaration,
    f.document.transfer.declaration,
  );
});
