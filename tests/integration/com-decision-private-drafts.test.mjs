import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import {
  decisionFixture,
  decisionPacket,
  decisionFacts,
  decisionCommit,
  decisionStages,
} from "./com-decision-fixtures.mjs";
const read = (client, f, purpose) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "COM",
    p_purpose: purpose,
    p_target: f.document.id,
  });

test("COM decision drafts keep receipt selection and four purposes private across Auth devices with CAS and safe discard", async () => {
  const f = await decisionFixture(),
    peer = await draftDevice(f.patient, "adminA"),
    other = await actor("global", f.patient),
    before = decisionFacts(f),
    ids = [];
  for (const purpose of Object.keys(decisionStages)) {
    const packet = decisionPacket(f, purpose),
      saved = await rpc(f.admin, "supply_draft_command", packet);
    ids.push(saved.id);
    assert.equal(
      (await read(peer, f, purpose)).content.fields.receiptId,
      f.secondReceipt.id,
    );
    assert.equal(await read(other, f, purpose), null);
    assert.equal(
      (
        await other.rpc("supply_draft_command", {
          ...packet,
          p_id: saved.id,
          p_expected: 1,
          p_key: randomUUID(),
        })
      ).error?.code,
      "42501",
    );
    const races = await Promise.all(
      [f.admin, peer].map((client, i) =>
        client.rpc("supply_draft_command", {
          ...packet,
          p_id: saved.id,
          p_expected: 1,
          p_key: randomUUID(),
          p_body: {
            ...packet.p_body,
            content: {
              ...packet.p_body.content,
              fields: {
                ...packet.p_body.content.fields,
                reason: "Edição concorrente " + i,
              },
            },
          },
        }),
      ),
    );
    assert.equal(races.filter((r) => !r.error).length, 1);
    assert.equal(races.find((r) => r.error).error.code, "PT409");
    assert.equal(decisionFacts(f), before);
  }
  assert.equal(new Set(ids).size, 4);
  const packet = decisionPacket(f, "reject_receipt"),
    saved = await read(f.admin, f, "reject_receipt");
  await rpc(f.admin, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: saved.revision,
    p_body: { action: "discard" },
    p_key: randomUUID(),
  });
  assert.equal(await read(f.admin, f, "reject_receipt"), null);
  assert.equal((await read(f.admin, f, "validate_receipt")).state, "active");
  assert.equal(decisionFacts(f), before);
});

for (const purpose of Object.keys(decisionStages))
  test(`COM ${purpose} consumes its exact private scope once and preserves the selected receipt and stock consequences`, async () => {
    const f = await decisionFixture(purpose !== "cancel"),
      packet = decisionPacket(f, purpose),
      saved = await rpc(f.admin, "supply_draft_command", packet),
      before = decisionFacts(f),
      command = decisionCommit(f, purpose, saved);
    if (["validate_receipt", "reject_receipt"].includes(purpose)) {
      assert.equal(
        (
          await f.admin.rpc("commit_supply_draft", {
            ...command,
            p_body: {
              ...command.p_body,
              body: { ...command.p_body.body, receiptId: f.firstReceipt.id },
            },
          })
        ).error?.code,
        "22023",
      );
      assert.equal(decisionFacts(f), before);
    }
    const wrongPurpose = purpose === "cancel" ? "close_expectation" : "cancel";
    assert.equal(
      (
        await f.admin.rpc("commit_supply_draft", {
          ...command,
          p_body: { ...command.p_body, action: wrongPurpose },
        })
      ).error?.code,
      "22023",
    );
    assert.equal(decisionFacts(f), before);
    const result = await rpc(f.admin, "commit_supply_draft", command),
      after = decisionFacts(f);
    assert.equal(result.state, "consumed");
    assert.deepEqual(
      (await rpc(f.admin, "commit_supply_draft", command)).result,
      result.result,
    );
    assert.equal(decisionFacts(f), after);
    assert.equal(
      (
        await f.admin.rpc("commit_supply_draft", {
          ...command,
          p_key: randomUUID(),
        })
      ).error?.code,
      "PT409",
    );
    if (f.firstReceipt)
      assert.equal(
        result.result.receipts.find((r) => r.id === f.firstReceipt.id).state,
        "pending",
      );
    if (purpose === "validate_receipt" || purpose === "reject_receipt")
      assert.equal(
        result.result.receipts.find((r) => r.id === f.secondReceipt.id).state,
        purpose === "validate_receipt" ? "approved" : "rejected",
      );
    if (purpose === "close_expectation") {
      assert.equal(result.result.purchaseProgress.expectationClosed, true);
      assert.equal(result.result.purchaseProgress.physicalPending, true);
    }
    if (purpose === "cancel") assert.equal(result.result.status, "cancelled");
    assert.equal(
      sql(
        `select coalesce(sum(quantity),0)=${purpose === "validate_receipt" ? 2 : 0} from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`,
      ),
      "t",
    );
    await rpc(f.admin, "supply_draft_command", {
      ...packet,
      p_id: saved.id,
      p_expected: result.revision,
      p_body: { action: "acknowledge" },
      p_key: randomUUID(),
    });
    assert.equal(await read(f.admin, f, purpose), null);
    assert.equal(decisionFacts(f), after);
  });

test("COM receipt rejection refuses a validation capability revoked during the observed private slot lock", async () => {
  const f = await decisionFixture(),
    packet = decisionPacket(f, "reject_receipt"),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    command = decisionCommit(f, "reject_receipt", saved),
    before = decisionFacts(f);
  const result = await whileAdvisoryWaits(
    `supply-draft-slot:${fixtures.adminA.id}:${f.patient}:COM:reject_receipt:${f.document.id}`,
    () => f.admin.rpc("commit_supply_draft", command),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.validate',false);`,
      ),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal((await read(f.admin, f, "reject_receipt")).revision, 1);
  assert.equal(decisionFacts(f), before);
  assert.equal(
    sql(
      `select count(*) from private.creation_draft_commands where owner_id=${sqlLiteral(fixtures.adminA.id)} and idempotency_key=${sqlLiteral(command.p_key)};`,
    ),
    "0",
  );
});

test("COM closure cannot turn an unchecked saved acknowledgement into an official confirmation", async () => {
  const f = await decisionFixture(),
    packet = decisionPacket(f, "close_expectation", { confirmed: "" }),
    saved = await rpc(f.admin, "supply_draft_command", packet),
    before = decisionFacts(f),
    command = decisionCommit(f, "close_expectation", saved);
  assert.equal(
    (await f.admin.rpc("commit_supply_draft", command)).error?.code,
    "22023",
  );
  assert.equal(decisionFacts(f), before);
  const checked = await rpc(f.admin, "supply_draft_command", {
    ...packet,
    p_id: saved.id,
    p_expected: 1,
    p_key: randomUUID(),
    p_body: {
      ...packet.p_body,
      content: {
        ...packet.p_body.content,
        fields: { ...packet.p_body.content.fields, confirmed: "on" },
      },
    },
  });
  await rpc(f.admin, "commit_supply_draft", {
    ...command,
    p_expected: checked.revision,
  });
});
