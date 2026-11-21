import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import {
  decisionActions,
  decisionReason,
  transferDecisionFixture,
  decisionPeer,
  decisionPacket,
  decisionCommit,
  decisionRead,
  decisionFacts,
} from "./transfer-decision-draft-fixtures.mjs";

for (const action of decisionActions) {
  test(
    "transfer " +
      action +
      " keeps raw private text across Auth sessions,CAS,privacy and no operational effect",
    async () => {
      const f = await transferDecisionFixture(action),
        peer = await decisionPeer(f),
        other = await actor("global", f.patient);
      const before = decisionFacts(f),
        packet = decisionPacket(f);
      const saved = await rpc(f.client, "supply_draft_command", packet);
      assert.equal(
        (await decisionRead(peer, f)).content.fields.reason,
        action === "dispatch" ? "" : decisionReason,
      );
      assert.equal(await decisionRead(other, f), null);
      assert.equal(
        (
          await other.rpc("supply_draft_command", {
            ...packet,
            p_id: saved.id,
            p_expected: saved.revision,
            p_key: randomUUID(),
            p_body: { action: "discard" },
          })
        ).error?.code,
        "42501",
      );
      const race = await Promise.all(
        [f.client, peer].map((client, i) =>
          client.rpc("supply_draft_command", {
            ...packet,
            p_id: saved.id,
            p_expected: saved.revision,
            p_key: randomUUID(),
            p_body: {
              ...packet.p_body,
              content: {
                ...packet.p_body.content,
                fields: {
                  reason: action === "dispatch" ? "" : "Texto concorrente " + i,
                },
              },
            },
          }),
        ),
      );
      assert.equal(race.filter((r) => !r.error).length, 1);
      assert.equal(race.find((r) => r.error).error.code, "PT409");
      assert.equal(decisionFacts(f), before);
    },
  );
  test(
    "transfer " +
      action +
      " seals action,version and own text before one official commit and replay",
    async () => {
      const f = await transferDecisionFixture(action),
        packet = decisionPacket(f),
        saved = await rpc(f.client, "supply_draft_command", packet),
        before = decisionFacts(f);
      const command = decisionCommit(f, saved);
      for (const wrong of [
        {
          ...command,
          p_key: randomUUID(),
          p_body: {
            ...command.p_body,
            action: action === "agree" ? "decline" : "agree",
          },
        },
        {
          ...command,
          p_key: randomUUID(),
          p_body: {
            ...command.p_body,
            expectedVersion: f.document.version + 1,
          },
        },
        decisionCommit(f, saved, {
          reason: "Texto substituído na confirmação",
        }),
      ]) {
        const { error } = await f.client.rpc("commit_supply_draft", wrong);
        assert.ok(error, "mismatched intent must fail");
        assert.equal(decisionFacts(f), before);
      }
      const result = await rpc(f.client, "commit_supply_draft", command);
      assert.equal(result.state, "consumed");
      assert.equal(
        result.result.transfer.state,
        {
          agree: "agreed",
          decline: "declined",
          withdraw: "withdrawn",
          dispatch: "dispatched",
        }[action],
      );
      assert.equal(result.result.version, f.document.version + 1);
      if (action !== "dispatch")
        assert.deepEqual(
          JSON.parse(decisionFacts(f)).ledger,
          JSON.parse(before).ledger,
        );
      else {
        assert.equal(result.result.status, "pending_receipt");
        assert.equal(result.result.transfer.agreement.decision, "agree");
        assert.ok(result.result.transfer.dispatchedAt);
        assert.equal(result.result.receipts.length, 0);
      }
      const after = decisionFacts(f);
      assert.equal(
        (await rpc(f.client, "commit_supply_draft", command)).replayed,
        true,
      );
      assert.equal(decisionFacts(f), after);
      const row = await decisionRead(f.client, f);
      assert.equal(row.content, null);
      assert.equal(row.consumedDocumentId, f.document.id);
      await rpc(f.client, "supply_draft_command", {
        ...packet,
        p_id: row.id,
        p_expected: row.revision,
        p_key: randomUUID(),
        p_body: { action: "acknowledge" },
      });
      assert.equal(decisionFacts(f), after);
    },
  );
  test(
    "transfer " +
      action +
      " rechecks live authority after the private journal and rolls back every effect",
    async () => {
      const f = await transferDecisionFixture(action),
        packet = decisionPacket(f),
        saved = await rpc(f.client, "supply_draft_command", packet),
        before = decisionFacts(f);
      const name = "probe_transfer_private_" + randomUUID().replaceAll("-", "");
      const capability =
        action === "withdraw"
          ? "ent.read"
          : action === "dispatch"
            ? "ent.create"
            : "ent.receive";
      sql(
        "create function private." +
          name +
          "() returns trigger language plpgsql security definer set search_path='' as $$begin if new.draft_id=" +
          q(saved.id) +
          "::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writer.id) +
          "," +
          q(capability) +
          ",false) on conflict(care_recipient_id,subject_user,capability) where subject_user is not null do update set enabled=false;end if;return new;end;$$;create trigger " +
          name +
          " after insert on private.creation_draft_commands for each row execute function private." +
          name +
          "();",
      );
      const command = decisionCommit(f, saved);
      try {
        assert.equal(
          (await f.client.rpc("commit_supply_draft", command)).error?.code,
          "42501",
        );
        assert.equal(decisionFacts(f), before);
        assert.equal(
          (await decisionRead(f.client, f)).revision,
          saved.revision,
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
    },
  );
}
test("transfer read-only recovery retains own discard,denies revoked read and rejects a different actor", async () => {
  const f = await transferDecisionFixture(),
    packet = decisionPacket(f),
    saved = await rpc(f.client, "supply_draft_command", packet),
    reader = await actor("reader", f.patient),
    before = decisionFacts(f);
  sql(
    "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
      q(f.patient) +
      "," +
      q(f.recipient.id) +
      ",'ent.receive',false);",
  );
  assert.equal((await decisionRead(f.client, f)).id, saved.id);
  assert.equal(
    (
      await f.client.rpc("supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: saved.revision,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await reader.rpc("supply_draft_command", {
        ...packet,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  await rpc(f.client, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: randomUUID(),
    p_body: { action: "discard" },
  });
  assert.equal(decisionFacts(f), before);
  sql(
    "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
      q(f.patient) +
      "," +
      q(f.writer.id) +
      ",'ent.read',false);",
  );
  assert.equal(
    (
      await f.client.rpc("supply_draft_context", {
        p_patient: f.patient,
        p_kind: "ENT",
        p_purpose: f.purpose,
        p_target: f.document.id,
      })
    ).error?.code,
    "42501",
  );
});
