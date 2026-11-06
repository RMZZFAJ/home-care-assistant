import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  deferralFixture,
  decideDeferral,
  deferralState,
  actor,
  workspace,
} from "./bal-deferral-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
test("an obsolete BAL deferral can be rejected exactly once without approving a changed target or moving the original deadline", async () => {
  const f = await deferralFixture(),
    family = await actor("family", f.patient),
    before = deferralState(f.patient);
  const context = (await workspace(family, f.patient)).deferrals.find(
    (d) => d.id === f.proposal.id,
  ).decisionContext;
  assert.equal(context.canApprove, false);
  assert.equal(context.canReject, true);
  assert.equal(context.targetState, "changed");
  const invalidApproval = await decideDeferral(family, f, true);
  assert.equal(invalidApproval.error?.code, "PT409");
  assert.match(invalidApproval.error.message, /obsolete balance deferral/);
  assert.deepEqual(deferralState(f.patient), before);
  const key = randomUUID(),
    reason =
      "Recusa da proposta cujo plantão foi alterado; o prazo vigente permanece.";
  const rejected = await decideDeferral(family, f, false, reason, key);
  assert.ifError(rejected.error);
  const after = deferralState(f.patient);
  assert.equal(after.requests[0].status, "rejected");
  assert.equal(after.requests[0].decision_reason, reason);
  assert.deepEqual(
    after.requests[0].target_snapshot,
    before.requests[0].target_snapshot,
  );
  assert.deepEqual(after.assignments, before.assignments);
  assert.deepEqual(after.obligations, before.obligations);
  assert.deepEqual(after.ledger, before.ledger);
  assert.equal(
    after.events.filter((e) => e.action === "bal.cycle.deferral_rejected")
      .length,
    1,
  );
  assert.deepEqual(
    (await decideDeferral(family, f, false, reason, key)).data,
    rejected.data,
  );
  assert.deepEqual(deferralState(f.patient), after);
});
test("a valid family approval applies only its frozen target and preserves the original due date and stock", async () => {
  const f = await deferralFixture(false),
    family = await actor("family", f.patient),
    before = deferralState(f.patient);
  assert.equal(
    (await workspace(family, f.patient)).deferrals.find(
      (d) => d.id === f.proposal.id,
    ).decisionContext.canApprove,
    true,
  );
  const result = await decideDeferral(family, f, true);
  assert.ifError(result.error);
  const after = deferralState(f.patient);
  assert.equal(after.requests[0].status, "approved");
  assert.equal(
    after.requests[0].decision_snapshot.actor.id,
    fixtures.family.id,
  );
  assert.equal(
    after.requests[0].decision_snapshot.proposal.target_shift_version,
    f.target.version,
  );
  assert.equal(
    after.assignments.find((a) => a.status === "active").shift_id,
    f.target.id,
  );
  assert.equal(
    after.obligations[0].original_due,
    before.obligations[0].original_due,
  );
  assert.equal(
    Date.parse(after.obligations[0].effective_due),
    Date.parse(f.target.ends_at),
  );
  assert.deepEqual(after.ledger, before.ledger);
});
test("deferral decisions reject forged destination/authorship and invalid reasons without changing a valid pending request", async () => {
  const f = await deferralFixture(false),
    family = await actor("family", f.patient),
    before = deferralState(f.patient);
  for (const change of [
    { approve: "false" },
    { approve: 0 },
    { reason: null },
    { reason: "😀".repeat(501) },
    { targetShiftId: randomUUID() },
    { decidedBy: fixtures.adminA.id },
  ]) {
    const result = await family.rpc("balance_command", {
      p_patient: f.patient,
      p_action: "decide_deferral",
      p_body: {
        id: f.proposal.id,
        approve: false,
        reason: "Recusa explícita com autoria própria",
        ...change,
      },
      p_key: randomUUID(),
      p_version: null,
    });
    assert.equal(result.error?.code, "22023");
  }
  assert.deepEqual(deferralState(f.patient), before);
});
test("own confirmed deferral recovery survives write loss but never read loss or changed intent", async () => {
  const f = await deferralFixture(),
    family = await actor("family", f.patient),
    key = randomUUID(),
    reason = "Recusa própria recuperável sem outra decisão.";
  const result = await decideDeferral(family, f, false, reason, key);
  assert.ifError(result.error);
  const before = deferralState(f.patient);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.defer.approve',false);`,
  );
  assert.deepEqual(
    (await decideDeferral(family, f, false, reason, key)).data,
    result.data,
  );
  assert.equal(
    (await decideDeferral(family, f, false, reason)).error?.code,
    "42501",
  );
  assert.equal(
    (await decideDeferral(family, f, false, "Outro motivo", key)).error?.code,
    "23505",
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.read',false);`,
  );
  assert.equal(
    (await decideDeferral(family, f, false, reason, key)).error?.code,
    "42501",
  );
  assert.deepEqual(deferralState(f.patient), before);
});
for (const wait of ["bal", "profile"]) {
  test(
    `deferral decision revalidates family authority after an observed ${wait} wait`,
    { timeout: 45000 },
    async () => {
      const f = await deferralFixture(false),
        family = await actor("family", f.patient);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.defer.approve',true);`,
      );
      const before = deferralState(f.patient),
        send = () => decideDeferral(family, f, true),
        revoke = () =>
          sql(
            `set statement_timeout='5s'; update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability='bal.defer.approve';`,
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
      assert.deepEqual(deferralState(f.patient), before);
    },
  );
}
test(
  "deferral approval rechecks the target's count authority after a late profile wait",
  { timeout: 45000 },
  async () => {
    const f = await deferralFixture(false),
      family = await actor("family", f.patient);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal.count',true);`,
    );
    const before = deferralState(f.patient),
      result = await whileRowWaits(
        "profiles",
        fixtures.family.id,
        "balance_command",
        () => decideDeferral(family, f, true),
        () =>
          sql(
            `set statement_timeout='5s'; update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(f.pro.id)} and capability='bal.count';`,
          ),
      );
    assert.equal(result.error?.code, "42501");
    assert.deepEqual(deferralState(f.patient), before);
  },
);
test("concurrent approval and rejection commit only one decision and cannot be exercised by another patient or the requester", async () => {
  const f = await deferralFixture(false),
    family = await actor("family", f.patient),
    before = deferralState(f.patient),
    outside = await actor("adminB", patientB);
  assert.equal(
    (await decideDeferral(f.pro.client, f, false)).error?.code,
    "42501",
  );
  assert.equal((await decideDeferral(outside, f, false)).error?.code, "42501");
  assert.deepEqual(deferralState(f.patient), before);
  const result = await Promise.all([
    decideDeferral(family, f, true),
    decideDeferral(f.admin, f, false),
  ]);
  assert.equal(result.filter((r) => !r.error).length, 1);
  assert.equal(result.find((r) => r.error).error.code, "PT409");
  const after = deferralState(f.patient);
  assert.equal(
    after.events.filter((e) =>
      ["bal.cycle.deferred", "bal.cycle.deferral_rejected"].includes(e.action),
    ).length,
    1,
  );
  assert.equal(
    after.obligations[0].original_due,
    before.obligations[0].original_due,
  );
  assert.deepEqual(after.ledger, before.ledger);
});
test("NULL is not a legitimate rejection decision and leaves a valid BAL deferral pending", async () => {
  const f = await deferralFixture(false),
    family = await actor("family", f.patient),
    before = deferralState(f.patient);
  const result = await decideDeferral(family, f, null);
  assert.equal(result.error?.code, "22023");
  assert.deepEqual(deferralState(f.patient), before);
});
