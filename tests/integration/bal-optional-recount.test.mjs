import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  pendingRecount,
  assignRecount,
  substitute,
  recountState,
  workspace,
  rpc,
  balanceCommand,
} from "./bal-recount-fixtures.mjs";
import { optionalLegacyRecount } from "./bal-optional-recount-fixtures.mjs";
import { shiftWorker, shiftCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileRowWaits } from "./lock-barrier.mjs";
const physicalIntent = (f, current, document, quantity = "1") => ({
  p_id: document.id,
  p_version: document.version,
  p_key: randomUUID(),
  p_recount: true,
  p_payload: {
    lines: f.products.map((productId, i) => ({
      productId,
      quantity: i ? "0" : quantity,
    })),
    notes: "Nova contagem pessoal e explícita após conciliação anterior",
    balanceAssignment: {
      id: current.eligibility.assignment.id,
      version: current.eligibility.assignment.version,
      referenceRevision: current.referenceRevision,
    },
  },
});

test("an optional scheduled BAL can receive a formal recount after reconciliation without rolling back its first effect", async () => {
  const f = await pendingRecount({
    reviewPolicy: "optional",
    firstReview: false,
    referenceQuantity: "20",
    countQuantity: "18",
  });
  assert.equal(f.document.status, "approved");
  assert.equal(f.document.balanceReview.reviews.length, 0);
  const source = await rpc(f.family, "balance_recount_context", {
    p_id: f.document.id,
  });
  assert.equal(
    source.canAssign,
    true,
    "A reconciled optional count has no formal recount path",
  );
  const target = source.targets.find((s) => s.id === f.assignment.shift_id);
  const before = sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  const assigned = await assignRecount(f.family, f, target);
  assert.ifError(assigned.error);
  assert.equal(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    before,
  );
  assert.equal(
    (await rpc(f.family, "operational_document", { p_id: f.document.id }))
      .status,
    "approved",
    "Designation itself must not withdraw or repeat the reconciled count",
  );
  const second = await substitute(f),
    current = await workspace(second.client, f.patient),
    intent = physicalIntent(f, current, f.document, "17"),
    prior = JSON.parse(recountState(f));
  const counted = await rpc(second.client, "revise_supply_document", intent);
  assert.equal(counted.status, "approved");
  assert.equal(counted.balanceReview.reviewRequired, false);
  assert.deepEqual(counted.balanceReview.reviews, []);
  assert.equal(counted.balanceReview.counter.id, second.id);
  assert.equal(counted.balanceReview.countVersion, 2);
  assert.equal(counted.created_by, f.pro.id);
  const after = JSON.parse(recountState(f)),
    adjustments = after.ledger.filter(
      (m) => m.reference_type === "bal" && m.reference_id === f.document.id,
    );
  assert.deepEqual(after.events.slice(0, prior.events.length), prior.events);
  assert.deepEqual(after.obligations, prior.obligations);
  assert.equal(adjustments.length, 2);
  assert.deepEqual(adjustments.map((m) => Number(m.quantity)).sort(), [1, 2]);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(second.id)},'bal.count',false);`,
  );
  assert.equal(
    (await rpc(second.client, "revise_supply_document", intent)).version,
    counted.version,
  );
  const source2 = await rpc(f.family, "operational_document", {
    p_id: f.document.id,
  });
  const reviewed = await rpc(f.family, "supply_document_command", {
    p_id: f.document.id,
    p_action: "approve",
    p_body: {
      group: "family",
      comment:
        "Revisão facultativa da nova contagem, sem reaplicar conciliação",
      reviewReference: source2.balanceReview.referenceHash,
    },
    p_key: randomUUID(),
    p_version: source2.version,
  });
  assert.equal(reviewed.status, "approved");
  assert.deepEqual(JSON.parse(recountState(f)).ledger, after.ledger);
});

test("a legacy optional BAL can be recounted only by an explicitly assigned real shift without activating weekly obligations", async () => {
  const f = await optionalLegacyRecount(),
    { family, pro, source } = f;
  assert.equal(
    source.canAssign,
    true,
    "A legacy optional balance cannot be assigned to a new real counter",
  );
  const target = source.targets.find((s) => s.professional_id === pro.id);
  assert.ok(target);
  const assigned = await assignRecount(family, f, target);
  assert.ifError(assigned.error);
  const current = await workspace(pro.client, f.patient);
  assert.equal(current.enabled, false);
  assert.equal(current.regime, null);
  assert.deepEqual(current.obligations, []);
  assert.equal(current.eligibility.available, true);
  assert.equal(current.eligibility.assignment.kind, "recount");
  const recounted = await rpc(pro.client, "revise_supply_document", {
    p_id: f.document.id,
    p_version: f.document.version,
    p_key: randomUUID(),
    p_recount: true,
    p_payload: {
      lines: f.products.map((productId) => ({ productId, quantity: "1" })),
      notes: "Novo ato físico do contador formalmente designado",
      balanceAssignment: {
        id: current.eligibility.assignment.id,
        version: current.eligibility.assignment.version,
        referenceRevision: current.referenceRevision,
      },
    },
  });
  assert.equal(recounted.status, "approved");
  assert.equal(recounted.created_by, f.document.created_by);
  assert.equal(recounted.balanceReview.counter.id, pro.id);
  assert.deepEqual(recounted.payload.balanceContext.weeks, []);
  assert.equal((await workspace(pro.client, f.patient)).obligations.length, 0);
  assert.equal(
    sql(
      `select origin from public.bal_cycles where document_id=${sqlLiteral(f.document.id)};`,
    ),
    "legacy_recount",
  );
});

test("a count approved while its formal recount is pending remains executable and preserves the earlier applied fact", async () => {
  const f = await pendingRecount(),
    target = f.initial.targets.find((s) => s.id === f.assignment.shift_id);
  assert.ifError((await assignRecount(f.family, f, target)).error);
  const supervisor = await shiftWorker(f.patient, "supervisor"),
    source = await rpc(supervisor.client, "operational_document", {
      p_id: f.document.id,
    });
  const reviewed = await rpc(supervisor.client, "supply_document_command", {
    p_id: f.document.id,
    p_action: "approve",
    p_body: {
      group: "supervisor",
      comment: "Conclusão legítima da revisão um antes do novo ato físico",
      reviewReference: source.balanceReview.referenceHash,
    },
    p_key: randomUUID(),
    p_version: source.version,
  });
  assert.equal(reviewed.status, "submitted");
  const approved = await rpc(supervisor.client, "supply_document_command", {
    p_id: reviewed.id, p_action: "apply_balance", p_body: { group: "supervisor", reviewReference: reviewed.balanceReview.referenceHash },
    p_key: randomUUID(), p_version: reviewed.version,
  });
  assert.equal(approved.status, "approved");
  const before = JSON.parse(recountState(f)),
    current = await workspace(f.pro.client, f.patient);
  const counted = await rpc(
    f.pro.client,
    "revise_supply_document",
    physicalIntent(f, current, approved),
  );
  assert.equal(counted.status, "submitted");
  assert.equal(counted.balanceReview.countVersion, 2);
  assert.equal(counted.balanceReview.reviewRequired, true);
  assert.deepEqual(
    counted.balanceReview.reviews.map((r) => r.count_version),
    [1, 1],
  );
  assert.deepEqual(
    JSON.parse(recountState(f)).ledger,
    before.ledger,
    "Required count two must await its own reviews; the prior applied movement remains",
  );
});

test(
  "an optional physical recount rechecks count authority after a late movement/profile wait and rolls back the new delta",
  { timeout: 45000 },
  async () => {
    const f = await pendingRecount({
        reviewPolicy: "optional",
        firstReview: false,
      }),
      target = f.initial.targets.find((s) => s.id === f.assignment.shift_id);
    assert.ifError((await assignRecount(f.family, f, target)).error);
    const current = await workspace(f.pro.client, f.patient),
      intent = physicalIntent(f, current, f.document);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal.count',true);`,
    );
    const before = recountState(f),
      result = await whileRowWaits(
        "profiles",
        f.pro.id,
        "revise_supply_document",
        () => f.pro.client.rpc("revise_supply_document", intent),
        () =>
          sql(
            `set statement_timeout='5s';update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.pro.id)} and capability='bal.count';`,
          ),
      );
    assert.equal(result.error?.code, "42501");
    assert.equal(recountState(f), before);
  },
);

test("legacy recount substitution and loss of eligibility remain actionable without activating weekly processing", async () => {
  const f = await optionalLegacyRecount();
  assert.ifError((await assignRecount(f.family, f, f.target)).error);
  const before = JSON.parse(recountState(f)),
    replacement = await shiftWorker(f.patient);
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: f.target.id,
      professionalId: replacement.id,
      reason: "Substituição no mesmo plantão do reconto legado",
    },
    f.target.version,
  );
  await balanceCommand(f.admin, f.patient, "refresh", {});
  const transferred = await workspace(replacement.client, f.patient);
  assert.equal(transferred.regime, null);
  assert.equal(transferred.eligibility.available, true);
  assert.equal(
    transferred.eligibility.assignment.professional_id,
    replacement.id,
  );
  assert.equal(transferred.eligibility.assignment.kind, "recount");
  assert.equal(
    sql(
      `select count(*) from private.balance_scheduler_candidates() where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    "1",
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(replacement.id)},'bal.count',false);`,
  );
  await balanceCommand(f.admin, f.patient, "refresh", {});
  const pending = await workspace(f.family, f.patient);
  assert.equal(pending.eligibility.assignment, null);
  assert.equal(
    pending.recountRecovery.items.find((r) => r.documentId === f.document.id)
      .canAssign,
    true,
  );
  const after = JSON.parse(recountState(f));
  assert.deepEqual(after.document, before.document);
  assert.deepEqual(after.ledger, before.ledger);
  assert.equal(after.obligations, null);
  assert.equal(
    sql(
      `select count(*) from public.bal_obligations where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    "0",
  );
  assert.equal(
    sql(
      "select has_function_privilege('authenticated','private.process_bal_recounts(uuid,timestamptz)','EXECUTE') or has_function_privilege('service_role','private.balance_scheduler_candidates()','EXECUTE');",
    ),
    "f",
  );
});
