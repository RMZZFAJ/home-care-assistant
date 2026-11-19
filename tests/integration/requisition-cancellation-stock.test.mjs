import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { rpc, fixtures } from "./v4-fixtures.mjs";
import {
  countedReqDecisionFixture,
  issueCountedRequisition,
  moveTeamStock,
  reqDecisionFacts,
} from "./requisition-decision-draft-fixtures.mjs";

const read = (f) => rpc(f.admin, "requisition_decision_context", { p_id: f.req.id });
const cancel = (f, reference, stockChoice) => ({
  p_document: f.req.id,
  p_key: randomUUID(),
  p_intention: {
    domain: "requisition",
    action: "cancel",
    expectedVersion: reference.documentVersion,
    referenceHash: reference.referenceHash,
    body: {
      reason: "Cancelamento fictício após conferência da contagem.",
      ...(stockChoice ? { stockChoice, stockReference: reference.stockCancellation.reference } : {}),
    },
  },
});
const stock = (f) => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(f.products[0])},'CARE_TEAM')`));

test("REQ cancellation reverses only the issuance adjustment and recovers one official result", async () => {
  const f = await countedReqDecisionFixture();
  moveTeamStock(f, 12);
  const early = await read(f);
  assert.equal(Number(early.stockCancellation.lines[0].current), 20);
  moveTeamStock(f, -2);
  const before = JSON.parse(reqDecisionFacts(f));
  const noChoice = await f.admin.rpc("execute_document_decision", cancel(f, early));
  assert.equal(noChoice.error?.code, "PT409");
  const direct = await f.admin.rpc("transition_requisition_status", {
    p_requisition_id: f.req.id, p_to_status: "cancelled", p_reason: "Caminho anterior sem escolha de estoque",
  });
  assert.equal(direct.error?.code, "PT409");
  const stale = await f.admin.rpc("execute_document_decision", cancel(f, early, "reverse"));
  assert.equal(stale.error?.code, "PT409");
  assert.deepEqual(JSON.parse(reqDecisionFacts(f)), before);

  const reference = await read(f);
  const [line] = reference.stockCancellation.lines;
  assert.deepEqual([line.beforeIssuance, line.counted, line.current, line.afterReversal].map(Number), [12, 8, 18, 22]);
  const request = cancel(f, reference, "reverse");
  const applied = await rpc(f.admin, "execute_document_decision", request);
  const settled = await rpc(f.admin, "settle_document_decision", { p_document: f.req.id, p_key: request.p_key });
  assert.deepEqual(settled, applied);
  assert.deepEqual(await rpc(f.admin, "execute_document_decision", request), applied);
  assert.equal(applied.result.stockChoice, "reverse");
  assert.equal(stock(f), 22);
  const after = JSON.parse(reqDecisionFacts(f));
  const reversals = after.stock.filter((row) => row.reference_type === "requisition_count_reversal");
  assert.equal(reversals.length, 1);
  assert.deepEqual(after.stock.filter((row) => row.id !== reversals[0].id), before.stock);
  assert.equal(after.events.find((event) => event.action === "req.status").body.event.stockChoice, "reverse");
});

for (const laterCount of ["REQ", "BAL"]) {
  test(`REQ cancellation preserves a later ${laterCount} count that required no movement`, async () => {
    const f = await countedReqDecisionFixture();
    const originalMovements = JSON.parse(reqDecisionFacts(f)).stock;
    if (laterCount === "REQ") {
      await issueCountedRequisition(f, 8, "Nova contagem fictícia confirmou a quantidade");
    } else {
      await rpc(f.admin, "create_supply_document", {
        p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false,
        p_payload: { lines: f.products.map((productId, index) => ({
          productId, quantity: index === 0 ? "8" : "0",
        })) },
      });
    }
    assert.equal(stock(f), 8);
    const before = JSON.parse(reqDecisionFacts(f));
    assert.deepEqual(before.stock, originalMovements);
    const reference = await read(f);
    assert.equal(reference.stockCancellation.canReverse, false);
    assert.equal(reference.stockCancellation.lines[0].block, "later_count");
    assert.equal(reference.stockCancellation.lines[0].afterReversal, null);
    const rejected = await f.admin.rpc("execute_document_decision", cancel(f, reference, "reverse"));
    assert.equal(rejected.error?.code, "PT409");
    assert.deepEqual(JSON.parse(reqDecisionFacts(f)), before);

    const preserved = await rpc(f.admin, "execute_document_decision", cancel(f, reference, "keep"));
    assert.equal(preserved.result.stockChoice, "keep");
    assert.equal(preserved.result.status, "cancelled");
    assert.deepEqual(JSON.parse(reqDecisionFacts(f)).stock, before.stock);
  });
}

test("REQ cancellation does not expose the stock comparison without permission", async () => {
  const f = await countedReqDecisionFixture();
  sql(`insert into public.capability_overrides(care_recipient_id, subject_user, capability, enabled)
    values (${q(f.patient)}, ${q(fixtures.adminA.id)}, 'stock.team.read', false)`);
  const reference = await read(f);
  assert.deepEqual(reference.stockCancellation, {
    reference: reference.stockCancellation.reference, canReadStock: false, canReverse: false, lines: [],
  });
  const rejected = await f.admin.rpc("execute_document_decision", cancel(f, reference, "reverse"));
  assert.equal(rejected.error?.code, "42501");
  const preserved = await rpc(f.admin, "execute_document_decision", cancel(f, reference, "keep"));
  assert.equal(preserved.result.stockChoice, "keep");
  assert.equal(stock(f), 8);
});
