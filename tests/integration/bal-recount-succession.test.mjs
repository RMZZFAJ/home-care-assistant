import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  pendingRecount,
  assignRecount,
  recountPacket,
  recountState,
  substitute,
  workspace,
  balanceCommand,
  actor,
  rpc,
} from "./bal-recount-fixtures.mjs";
import { shiftWorker, shiftCommand } from "./shift-fixtures.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
test("a same-window replacement keeps one executable recount on a counted cycle and preserves the original counter", async () => {
  const f = await pendingRecount(),
    target = f.initial.targets.find((s) => s.id === f.assignment.shift_id);
  const before = JSON.parse(recountState(f));
  const result = await assignRecount(f.family, f, target);
  assert.ifError(result.error);
  const old = (await workspace(f.family, f.patient)).eligibility.assignment;
  const second = await substitute(f),
    current = await workspace(second.client, f.patient);
  assert.equal(
    current.eligibility.assignment?.professional_id,
    second.id,
    "Counted cycle lost the executable recount after a same-window substitution",
  );
  assert.equal(current.eligibility.available, true);
  assert.equal(current.eligibility.assignment.kind, "recount");
  assert.equal(current.eligibility.assignment.ends_at, old.ends_at);
  assert.equal(current.eligibility.assignment.starts_at, old.starts_at);
  assert.equal(
    current.assignments.find((a) => a.id === old.id).status,
    "invalidated",
  );
  assert.equal(
    current.assignments.filter((a) => a.status === "active").length,
    1,
  );
  const prior = await rpc(second.client, "operational_document", {
    p_id: f.document.id,
  });
  assert.equal(prior.balanceReview.counter.id, f.pro.id);
  assert.equal(prior.payload.notes, f.payload.notes);
  assert.equal(prior.created_by, f.pro.id);
  const recount = current.eligibility.assignment,
    key = randomUUID(),
    payload = {
      lines: f.products.map((productId, i) => ({
        productId,
        quantity: i ? "0" : "1",
      })),
      notes:
        "Segunda contagem física por Sheila, sem substituir as observações de Juliana.",
      balanceAssignment: {
        id: recount.id,
        version: recount.version,
        referenceRevision: current.referenceRevision,
      },
    };
  const intent = {
    p_id: f.document.id,
    p_payload: payload,
    p_key: key,
    p_version: prior.version,
    p_recount: true,
  };
  assert.equal(
    (await f.pro.client.rpc("revise_supply_document", intent)).error?.code,
    "42501",
  );
  const recounted = await rpc(second.client, "revise_supply_document", intent);
  assert.equal(recounted.balanceReview.counter.id, second.id);
  assert.equal(recounted.balanceReview.countVersion, 2);
  assert.equal(recounted.created_by, f.pro.id);
  assert.equal(recounted.status, "submitted");
  assert.equal(recounted.balanceReview.reviews[0].count_version, 1);
  assert.equal(
    recounted.balanceReview.reviews[0].reviewed_snapshot.notes,
    f.payload.notes,
  );
  const afterCount = JSON.parse(recountState(f));
  assert.deepEqual(
    afterCount.events.slice(0, before.events.length),
    before.events,
  );
  assert.deepEqual(
    afterCount.obligations,
    before.obligations,
    "A recount must not change the first obligation's satisfaction or deadline facts",
  );
  assert.deepEqual(
    afterCount.ledger,
    before.ledger,
    "A pending required-review recount must not move stock",
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(second.id)},'bal.count',false);`,
  );
  assert.equal(
    (await rpc(second.client, "revise_supply_document", intent)).version,
    recounted.version,
  );
  assert.deepEqual(JSON.parse(recountState(f)).ledger, before.ledger);
  const supervisor = await shiftWorker(f.patient, "supervisor");
  const review = async (client, document, group) =>
    rpc(client, "supply_document_command", {
      p_id: document.id,
      p_action: "approve",
      p_body: {
        group,
        comment: "Parecer próprio sobre a nova contagem física",
        reviewReference: document.balanceReview.referenceHash,
      },
      p_key: randomUUID(),
      p_version: document.version,
    });
  const supervisorSource = await rpc(
    supervisor.client,
    "operational_document",
    { p_id: f.document.id },
  );
  const supervised = await review(
    supervisor.client,
    supervisorSource,
    "supervisor",
  );
  assert.equal(
    supervised.status,
    "submitted",
    "An old family review must not approve count two",
  );
  const familySource = await rpc(f.family, "operational_document", {
    p_id: f.document.id,
  });
  const approved = await review(f.family, familySource, "family");
  assert.equal(approved.status, "approved");
  assert.equal(
    approved.balanceReview.reviews.filter((r) => r.count_version === 2).length,
    2,
  );
  const final = JSON.parse(recountState(f)),
    adjustments = final.ledger.filter(
      (m) => m.reference_type === "bal" && m.reference_id === f.document.id,
    );
  assert.equal(
    final.cycleEvents.filter((e) => e.action === "bal.cycle.recount_recorded")
      .length,
    1,
  );
  assert.equal(adjustments.length, 1);
  assert.equal(Number(adjustments[0].quantity), 4);
  assert.deepEqual(final.obligations, before.obligations);
});
test("an unavailable recount counter leaves a visible recovery task for authorized designation instead of a false empty queue", async () => {
  const f = await pendingRecount(),
    target = f.initial.targets.find((s) => s.id === f.assignment.shift_id);
  assert.ifError((await assignRecount(f.family, f, target)).error);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal.count',false);`,
  );
  await balanceCommand(f.admin, f.patient, "refresh", {});
  const current = await workspace(f.family, f.patient);
  assert.equal(current.eligibility.assignment, null);
  assert.ok(
    current.recountRecovery?.items.some(
      (row) => row.documentId === f.document.id,
    ),
    "Unassigned recount disappeared from the patient's operational recovery queue",
  );
  assert.ok(current.recountRecovery.total >= 1);
  const replacement = await shiftWorker(f.patient);
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: target.id,
      professionalId: replacement.id,
      reason: "Nova responsabilidade explícita para o reconto indisponível",
    },
    target.version,
  );
  const source = await rpc(f.family, "balance_recount_context", {
    p_id: f.document.id,
  });
  assert.equal(source.canAssign, true);
  assert.equal(source.requiresDesignation, true);
  const newTarget = source.targets.find((s) => s.id === target.id);
  const result = await assignRecount(f.family, f, newTarget);
  assert.ifError(result.error);
  assert.equal(result.data.counter.id, f.pro.id);
  assert.equal(result.data.professionalId, replacement.id);
  const recovered = await workspace(replacement.client, f.patient);
  assert.equal(recovered.eligibility.available, true);
  assert.equal(recovered.eligibility.assignment.kind, "recount");
  assert.equal(
    recovered.recountRecovery.items.some(
      (row) => row.documentId === f.document.id,
    ),
    false,
  );
});

test("recount designation freezes the source and target, rejects forged fields and exposes no cross-patient read", async () => {
  const f = await pendingRecount(),
    target = f.initial.targets.find((s) => s.id === f.assignment.shift_id),
    packet = await recountPacket(f.family, f, target),
    before = recountState(f);
  const outside = await actor("adminB", patientB);
  assert.equal(
    (await outside.rpc("balance_recount_context", { p_id: f.document.id }))
      .error?.code,
    "42501",
  );
  assert.equal(
    (await outside.rpc("balance_command", packet)).error?.code,
    "42501",
  );
  assert.equal(
    (await f.pro.client.rpc("balance_command", packet)).error?.code,
    "42501",
  );
  for (const change of [
    { targetShiftVersion: null },
    { targetShiftVersion: "1" },
    { targetShiftVersion: 2147483648 },
    { targetShiftVersion: 1e100 },
    { professionalId: f.pro.id },
    { designerId: fixtures.family.id },
    { reason: "😀".repeat(501) },
  ]) {
    const rejected = await f.family.rpc("balance_command", {
      ...packet,
      p_key: randomUUID(),
      p_body: { ...packet.p_body, ...change },
    });
    assert.equal(rejected.error?.code, "22023");
  }
  for (const change of [
    { referenceHash: "0".repeat(64) },
    { targetShiftVersion: 2147483647 },
  ]) {
    const stale = await f.family.rpc("balance_command", {
      ...packet,
      p_key: randomUUID(),
      p_body: { ...packet.p_body, ...change },
    });
    assert.equal(stale.error?.code, "PT409");
  }
  assert.equal(
    (
      await f.family.rpc("balance_command", {
        ...packet,
        p_version: packet.p_version + 1,
      })
    ).error?.code,
    "PT409",
  );
  assert.equal(recountState(f), before);
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.balance_recount_context(uuid)','EXECUTE') or has_function_privilege('service_role','public.balance_recount_context(uuid)','EXECUTE') or has_function_privilege('authenticated','private.assign_balance_recount(uuid,jsonb,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','private.bal_recount_context(uuid)','EXECUTE') or has_function_privilege('authenticated','private.bal_recount_recovery(uuid)','EXECUTE');",
    ),
    "f",
  );
});

test("confirmed own designation recovers its frozen result after write loss, never read loss or a changed intent", async () => {
  const f = await pendingRecount(),
    target = f.initial.targets.find((s) => s.id === f.assignment.shift_id),
    packet = await recountPacket(f.family, f, target);
  const result = await f.family.rpc("balance_command", packet);
  assert.ifError(result.error);
  const after = recountState(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.approve.family',false);`,
  );
  assert.deepEqual(
    (await f.family.rpc("balance_command", packet)).data,
    result.data,
  );
  assert.equal(
    (await f.family.rpc("balance_command", { ...packet, p_key: randomUUID() }))
      .error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.family.rpc("balance_command", {
        ...packet,
        p_body: {
          ...packet.p_body,
          reason: "Outra intenção com a mesma chave",
        },
      })
    ).error?.code,
    "23505",
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.read',false);`,
  );
  assert.equal(
    (await f.family.rpc("balance_command", packet)).error?.code,
    "42501",
  );
  assert.equal(
    (await f.family.rpc("balance_recount_context", { p_id: f.document.id }))
      .error?.code,
    "42501",
  );
  assert.equal(recountState(f), after);
});

test("concurrent family and supervision designations commit one actual recount", async () => {
  const f = await pendingRecount(),
    target = f.initial.targets.find((s) => s.id === f.assignment.shift_id),
    supervisor = await shiftWorker(f.patient, "supervisor");
  const familyPacket = await recountPacket(f.family, f, target),
    supervisorPacket = await recountPacket(supervisor.client, f, target);
  const results = await Promise.all([
    f.family.rpc("balance_command", familyPacket),
    supervisor.client.rpc("balance_command", supervisorPacket),
  ]);
  assert.equal(results.filter((r) => !r.error).length, 1);
  assert.equal(results.find((r) => r.error).error.code, "PT409");
  const after = JSON.parse(recountState(f));
  assert.equal(
    after.assignments.filter((a) => a.status === "active").length,
    1,
  );
  assert.equal(
    after.cycleEvents.filter((e) => e.action === "bal.cycle.recount_assigned")
      .length,
    1,
  );
  assert.equal(
    after.ledger.filter((m) => m.reference_type === "bal").length,
    0,
  );
});

for (const wait of ["bal", "profile"]) {
  test(
    `recount designation revalidates family authority after an observed ${wait} wait`,
    { timeout: 45000 },
    async () => {
      const f = await pendingRecount(),
        target = f.initial.targets.find((s) => s.id === f.assignment.shift_id),
        packet = await recountPacket(f.family, f, target);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.approve.family',true);`,
      );
      const before = recountState(f),
        send = () => f.family.rpc("balance_command", packet),
        revoke = () =>
          sql(
            `set statement_timeout='5s';update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability='bal.approve.family';`,
          );
      const result =
        wait === "bal"
          ? await whileAdvisoryWaits(`bal:${f.patient}`, send, revoke)
          : await whileRowWaits(
              "profiles",
              fixtures.family.id,
              "balance_command",
              send,
              revoke,
            );
      assert.equal(result.error?.code, "42501");
      assert.equal(recountState(f), before);
    },
  );
}
test(
  "recount designation revalidates the target counter after a late profile wait",
  { timeout: 45000 },
  async () => {
    const f = await pendingRecount(),
      target = f.initial.targets.find((s) => s.id === f.assignment.shift_id),
      packet = await recountPacket(f.family, f, target);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal.count',true);`,
    );
    const before = recountState(f),
      result = await whileRowWaits(
        "profiles",
        fixtures.family.id,
        "balance_command",
        () => f.family.rpc("balance_command", packet),
        () =>
          sql(
            `set statement_timeout='5s';update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.pro.id)} and capability='bal.count';`,
          ),
      );
    assert.equal(result.error?.code, "42501");
    assert.equal(recountState(f), before);
  },
);
