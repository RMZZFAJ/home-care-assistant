import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import {
  transferDecisionFixture,
  decisionPacket,
  decisionCommit,
  decisionRead,
  decisionFacts,
} from "./transfer-decision-draft-fixtures.mjs";
for (const action of ["agree", "decline", "dispatch"]) {
  test(
    "transfer " +
      action +
      " recovers an exact committed result after write loss and acknowledges it without another effect",
    async () => {
      const f = await transferDecisionFixture(action),
        packet = decisionPacket(f),
        saved = await rpc(f.client, "supply_draft_command", packet);
      const command = decisionCommit(f, saved),
        result = await rpc(f.client, "commit_supply_draft", command),
        after = decisionFacts(f);
      const capability = action === "dispatch" ? "ent.create" : "ent.receive";
      sql(
        "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writer.id) +
          "," +
          q(capability) +
          ",false) on conflict(care_recipient_id,subject_user,capability) where subject_user is not null do update set enabled=false;",
      );
      assert.equal(
        (await rpc(f.client, "commit_supply_draft", command)).replayed,
        true,
      );
      assert.equal(
        (await decisionRead(f.client, f)).consumedDocumentId,
        f.document.id,
      );
      assert.equal(
        (
          await f.client.rpc("commit_supply_draft", {
            ...command,
            p_key: randomUUID(),
          })
        ).error?.code,
        "42501",
      );
      await rpc(f.client, "supply_draft_command", {
        ...packet,
        p_id: saved.id,
        p_expected: result.revision,
        p_key: randomUUID(),
        p_body: { action: "acknowledge" },
      });
      assert.equal(await decisionRead(f.client, f), null);
      assert.equal(decisionFacts(f), after);
    },
  );
}
test("transfer commit rechecks counterpart authority after an observed private slot wait", async () => {
  const f = await transferDecisionFixture("agree"),
    saved = await rpc(f.client, "supply_draft_command", decisionPacket(f)),
    before = decisionFacts(f);
  const result = await whileAdvisoryWaits(
    "supply-draft-slot:" +
      f.writer.id +
      ":" +
      f.patient +
      ":ENT:" +
      f.purpose +
      ":" +
      f.document.id,
    () => f.client.rpc("commit_supply_draft", decisionCommit(f, saved)),
    () =>
      sql(
        "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writer.id) +
          ",'ent.receive',false);",
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(decisionFacts(f), before);
  assert.equal((await decisionRead(f.client, f)).revision, saved.revision);
});
