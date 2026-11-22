import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  newWindowRecount,
  workspace,
  recountState,
  rpc,
} from "./bal-recount-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";

test("a distinct count window preserves Juliana18 as count1 and attributes Sheila17 count2 with new independent reviews", async () => {
  const f = await newWindowRecount(),
    before = JSON.parse(recountState(f)),
    current = await workspace(f.second.client, f.patient),
    assignment = current.eligibility.assignment;
  assert.equal(current.eligibility.available, true);
  assert.equal(assignment.professional_id, f.second.id);
  assert.notEqual(assignment.shift_id, f.assignment.shift_id);
  assert.notEqual(
    assignment.starts_at + "|" + assignment.ends_at,
    f.assignment.starts_at + "|" + f.assignment.ends_at,
  );
  const original = await rpc(f.second.client, "operational_document", {
    p_id: f.document.id,
  });
  const intent = {
    p_id: f.document.id,
    p_payload: {
      lines: f.products.map((productId, i) => ({
        productId,
        quantity: i ? "0" : "17",
      })),
      notes: "Reconto2 pessoal de Sheila em uma janela nova",
      balanceAssignment: {
        id: assignment.id,
        version: assignment.version,
        referenceRevision: current.referenceRevision,
      },
    },
    p_key: randomUUID(),
    p_version: original.version,
    p_recount: true,
  };
  assert.equal(
    (await f.pro.client.rpc("revise_supply_document", intent)).error?.code,
    "42501",
  );
  const counted = await rpc(f.second.client, "revise_supply_document", intent);
  assert.equal(counted.created_by, f.pro.id);
  assert.equal(counted.balanceReview.counter.id, f.second.id);
  assert.equal(counted.balanceReview.countVersion, 2);
  assert.equal(counted.status, "submitted");
  assert.equal(counted.payload.balanceContext.startsAt, assignment.starts_at);
  const after = JSON.parse(recountState(f));
  assert.deepEqual(after.ledger, before.ledger);
  assert.deepEqual(after.obligations, before.obligations);
  assert.deepEqual(after.events.slice(0, before.events.length), before.events);
  assert.equal(counted.balanceReview.reviews.length, 1);
  assert.equal(counted.balanceReview.reviews[0].count_version, 1);
  assert.equal(
    counted.balanceReview.reviews[0].reviewed_snapshot.notes,
    f.payload.notes,
  );
  const supervisor = await shiftWorker(f.patient, "supervisor");
  async function review(client, group) {
    const source = await rpc(client, "operational_document", {
      p_id: f.document.id,
    });
    return rpc(client, "supply_document_command", {
      p_id: f.document.id,
      p_action: "approve",
      p_body: {
        group,
        comment:
          "Parecer independente sobre a contagem2, sem aproveitar aprovação1",
        reviewReference: source.balanceReview.referenceHash,
      },
      p_key: randomUUID(),
      p_version: source.version,
    });
  }
  assert.equal(
    (await review(supervisor.client, "supervisor")).status,
    "submitted",
  );
  const reviewed = await review(f.family, "family");
  assert.equal(reviewed.status, "submitted");
  assert.deepEqual(JSON.parse(recountState(f)).ledger, before.ledger,
    "Independent opinions on count two must not apply stock");
  const closed = await rpc(f.family, "supply_document_command", {
    p_id: reviewed.id,
    p_action: "apply_balance",
    p_body: { group: "family", reviewReference: reviewed.balanceReview.referenceHash },
    p_key: randomUUID(),
    p_version: reviewed.version,
  });
  assert.equal(closed.status, "approved");
  assert.equal(
    closed.balanceReview.reviews.filter((r) => r.count_version === 2).length,
    2,
  );
  const final = JSON.parse(recountState(f)),
    adjustments = final.ledger.filter(
      (m) => m.reference_type === "bal" && m.reference_id === f.document.id,
    );
  assert.equal(adjustments.length, 1);
  assert.equal(Number(adjustments[0].quantity), 3);
  assert.deepEqual(final.obligations, before.obligations);
});
