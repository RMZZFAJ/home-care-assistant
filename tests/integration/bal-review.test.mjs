import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  legacyBalance,
  balCommand,
  balApply,
  balState,
  rpc,
  actor,
  receiveBalanceMaterials,
} from "./bal-review-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";

test("legacy BAL counter cannot approve their own count through the missing balanceContext guard", async () => {
  const f = await legacyBalance(),
    before = balState(f.document.id);
  assert.equal(f.document.status, "submitted");
  const result = await balCommand(f.admin, f.document, { group: "family" });
  assert.equal(
    result.error?.code,
    "42501",
    "The effective legacy counter approved their own count",
  );
  assert.equal(balState(f.document.id), before);
});

test("BAL review rows enforce live patient read authority, immutable history and narrow grants", async () => {
  const f = await legacyBalance({ policy: "optional" }),
    family = await actor("family", f.patient);
  const data = await rpc(family, "operational_document", {
    p_id: f.document.id,
  });
  const result = await balCommand(family, data, {
    group: "family",
    comment: "Parecer protegido por paciente.",
  });
  assert.ifError(result.error);
  const reviewId = result.data.balanceReview.reviews[0].id;
  const visible = await family
    .from("balance_reviews")
    .select("id,comment")
    .eq("id", reviewId);
  assert.ifError(visible.error);
  assert.equal(visible.data.length, 1);
  for (const mutation of [
    family
      .from("balance_reviews")
      .update({ comment: "Alteração indevida" })
      .eq("id", reviewId),
    family.from("balance_reviews").delete().eq("id", reviewId),
  ]) {
    assert.equal((await mutation).error?.code, "42501");
  }
  const outside = await actor("adminB", patientB);
  const hidden = await outside
    .from("balance_reviews")
    .select("id")
    .eq("id", reviewId);
  assert.ifError(hidden.error);
  assert.deepEqual(hidden.data, []);
  assert.equal(
    (await balCommand(outside, result.data, { group: "family" })).error?.code,
    "42501",
  );
  const before = balState(f.document.id);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.read',false);`,
  );
  const revoked = await family
    .from("balance_reviews")
    .select("id")
    .eq("id", reviewId);
  assert.ifError(revoked.error);
  assert.deepEqual(revoked.data, []);
  assert.equal(balState(f.document.id), before);
  assert.equal(
    sql(
      "select has_table_privilege('anon','public.balance_reviews','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('service_role','public.balance_reviews','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('authenticated','public.balance_reviews','INSERT,UPDATE,DELETE,TRUNCATE') or has_function_privilege('authenticated','private.command_bal_review(uuid,jsonb,uuid,integer)','EXECUTE');",
    ),
    "f",
  );
});

test("a later stock movement permits a historical opinion under either policy but blocks its application", async () => {
  for (const policy of ["required", "optional"]) {
    const f = await legacyBalance({ policy, quantity: "1" });
    await receiveBalanceMaterials(f);
    const family = await actor("family", f.patient),
      data = await rpc(family, "operational_document", { p_id: f.document.id });
    assert.equal(data.balanceReview.referenceState, "historical");
    const before = balState(data.id),
      ledger = JSON.parse(before).ledger;
    const result = await balCommand(family, data, {
      group: "family",
      comment:
        "Parecer sobre a contagem preservada, sem validar estoque posterior.",
      reviewReference: data.balanceReview.referenceHash,
    });
      assert.ifError(result.error);
      assert.equal(
        result.data.balanceReview.reviews[0].reference_state,
        "historical",
      );
      assert.deepEqual(JSON.parse(balState(data.id)).ledger, ledger);
    if (policy === "required") assert.equal((await balApply(family, result.data)).error?.code, "PT409");
  }
});

test("a distinct family reviewer records an independent comment without replacing count notes", async () => {
  const f = await legacyBalance(),
    family = await actor("family", f.patient);
  const data = await rpc(family, "operational_document", {
      p_id: f.document.id,
    }),
    context = data.balanceReview;
  assert.deepEqual(context.eligibleGroups, ["family"]);
  const response = await balCommand(family, data, {
    group: "family",
    comment: "Parecer próprio da família.",
    reviewReference: context.referenceHash,
  });
  assert.ifError(response.error);
  assert.equal(response.data.status, "submitted");
  assert.equal(response.data.balanceReview.reviewSatisfied, true);
  assert.equal(response.data.payload.notes, f.payload.notes);
  assert.equal(response.data.balanceReview.reviews.length, 1);
  assert.equal(
    response.data.balanceReview.reviews[0].comment,
    "Parecer próprio da família.",
  );
  assert.notEqual(
    response.data.balanceReview.reviews[0].reviewer_id,
    response.data.balanceReview.reviews[0].counter_id,
  );
});

test("optional BAL closes without a universal review queue and later review never repeats the reconciliation", async () => {
  const f = await legacyBalance({ policy: "optional", quantity: "1" }),
    family = await actor("family", f.patient);
  assert.equal(f.document.status, "approved");
  const before = sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  const data = await rpc(family, "operational_document", {
    p_id: f.document.id,
  });
  assert.equal(data.balanceReview.reviewRequired, false);
  assert.equal(data.balanceReview.referenceState, "current");
  const body = {
      group: "family",
      comment: "Conferência facultativa posterior.",
      reviewReference: data.balanceReview.referenceHash,
    },
    key = randomUUID();
  const reviewed = await balCommand(family, data, body, key);
  assert.ifError(reviewed.error);
  const recovered = await balCommand(family, data, body, key);
  assert.ifError(recovered.error);
  assert.equal(recovered.data.balanceReview.reviews.length, 1);
  assert.equal(reviewed.data.status, "approved");
  assert.equal(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    before,
  );
});

test("review comment limit is 2000 UTF16 units in the database without truncation or partial effects", async () => {
  const f = await legacyBalance(),
    family = await actor("family", f.patient);
  const data = await rpc(family, "operational_document", {
      p_id: f.document.id,
    }),
    before = balState(data.id);
  for (const comment of ["x".repeat(2001), "😀".repeat(1001), null]) {
    const result = await balCommand(family, data, { group: "family", comment });
    assert.equal(result.error?.code, "22023");
    assert.equal(balState(data.id), before);
  }
  const valid = await balCommand(family, data, {
    group: "family",
    comment: "😀".repeat(1000),
  });
  assert.ifError(valid.error);
  assert.equal(valid.data.balanceReview.reviews[0].comment, "😀".repeat(1000));
});

test("a missing BAL reference cannot apply reconciliation through SQL NULL comparison", async () => {
  const f = await legacyBalance({
    policy: "optional",
    quantity: "1",
    draft: true,
  });
  sql(
    `update public.operational_documents set workflow_data=jsonb_set(workflow_data,'{referenceRevision}','null') where id=${sqlLiteral(f.document.id)};`,
  );
  const before = balState(f.document.id);
  const result = await f.admin.rpc("supply_document_command", {
    p_id: f.document.id,
    p_action: "submit",
    p_body: {},
    p_key: randomUUID(),
    p_version: f.document.version,
  });
  assert.ok(result.error, "NULL reference reconciled physical inventory");
  assert.equal(balState(f.document.id), before);
});

test("BAL review recovers own result with read authority after write loss, but never after read loss", async () => {
  const f = await legacyBalance(),
    family = await actor("family", f.patient),
    data = await rpc(family, "operational_document", { p_id: f.document.id });
  const key = randomUUID(),
    body = {
      group: "family",
      comment: "Parecer identificado e recuperável.",
      reviewReference: data.balanceReview.referenceHash,
    };
  assert.ifError((await balCommand(family, data, body, key)).error);
  const before = balState(data.id);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.approve.family',false);`,
  );
  assert.ifError((await balCommand(family, data, body, key)).error);
  assert.equal((await balCommand(family, data, body)).error?.code, "42501");
  assert.equal(
    (await balCommand(family, data, { ...body, comment: "Outro parecer" }, key))
      .error?.code,
    "23505",
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.read',false);`,
  );
  assert.equal(
    (await balCommand(family, data, body, key)).error?.code,
    "42501",
  );
  assert.equal(balState(data.id), before);
});

for (const wait of ["stock", "profile"]) {
  test(
    `BAL review revalidates authority after an observed ${wait} wait`,
    { timeout: 45_000 },
    async () => {
      const f = await legacyBalance({ quantity: "1" }),
        family = await actor("family", f.patient),
        data = await rpc(family, "operational_document", {
          p_id: f.document.id,
        });
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.approve.family',true);`,
      );
      const before = balState(data.id),
        send = () =>
          balCommand(family, data, {
            group: "family",
            comment: "Espera controlada da revisão.",
          });
      const revoke = () =>
        sql(
          `set statement_timeout='5s'; update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability='bal.approve.family';`,
        );
      const result =
        wait === "stock"
          ? await whileAdvisoryWaits(`stock:${f.patient}`, send, revoke)
          : await whileRowWaits(
              "profiles",
              fixtures.family.id,
              "supply_document_command",
              send,
              revoke,
            );
      assert.equal(result.error?.code, "42501");
      assert.equal(balState(data.id), before);
    },
  );
}

test("concurrent reviews never reconcile and separate concurrent applications cannot apply the same count twice", async () => {
  const f = await legacyBalance({ quantity: "1" }),
    family = await actor("family", f.patient),
    peer = await actor("global", f.patient);
  const a = await rpc(family, "operational_document", { p_id: f.document.id }),
    b = await rpc(peer, "operational_document", { p_id: f.document.id });
  const responses = await Promise.all([
    balCommand(family, a, {
      group: "family",
      comment: "Parecer A",
      reviewReference: a.balanceReview.referenceHash,
    }),
    balCommand(peer, b, {
      group: "family",
      comment: "Parecer B",
      reviewReference: b.balanceReview.referenceHash,
    }),
  ]);
  assert.equal(responses.filter((r) => !r.error).length, 1);
  assert.equal(responses.find((r) => r.error).error.code, "PT409");
  assert.equal(
    sql(
      `select count(*) from public.balance_reviews where document_id=${sqlLiteral(a.id)};`,
    ),
    "1",
  );
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='bal' and reference_id=${sqlLiteral(a.id)};`,
    ),
    "0",
  );
  const own = await rpc(family, "operational_document", { p_id: a.id });
  const other = await rpc(peer, "operational_document", { p_id: a.id });
  const applications = await Promise.all([balApply(family, own), balApply(peer, other)]);
  assert.equal(applications.filter(r => !r.error).length, 1);
  assert.equal(applications.find(r => r.error).error.code, "PT409");
  assert.equal(sql(`select count(*) from public.stock_movements where reference_type='bal' and reference_id=${sqlLiteral(a.id)}`), "2");
  assert.equal(sql(`select count(*) from private.balance_applications where document_id=${sqlLiteral(a.id)}`), "1");
});

test("recount preserves first authors and invalidates old review eligibility instead of confusing creator with counter", async () => {
  const f = await legacyBalance({ requirement: "all" }),
    supervisor = await shiftWorker(f.patient, "supervisor");
  const reviewed = await balCommand(supervisor.client, f.document, {
    group: "supervisor",
    comment: "Parecer da contagem um.",
  });
  assert.ifError(reviewed.error);
  assert.equal(reviewed.data.status, "submitted");
  const nextCounter = await actor("global", f.patient),
    payload = {
      lines: f.products.map((productId) => ({ productId, quantity: "1" })),
      notes: "Observação da segunda contagem, por outra pessoa.",
    };
  const recounted = await rpc(nextCounter, "revise_supply_document", {
    p_id: f.document.id,
    p_payload: payload,
    p_key: randomUUID(),
    p_version: reviewed.data.version,
    p_recount: true,
  });
  assert.equal(recounted.created_by, fixtures.adminA.id);
  assert.equal(recounted.balanceReview.counter.id, fixtures.global.id);
  assert.equal(recounted.balanceReview.countVersion, 2);
  assert.equal(
    (await balCommand(nextCounter, recounted, { group: "family" })).error?.code,
    "42501",
  );
  const originalCounterView = await rpc(f.admin, "operational_document", {
    p_id: f.document.id,
  });
  assert.ok(
    originalCounterView.balanceReview.eligibleGroups.includes("family"),
  );
  const newFamily = await balCommand(f.admin, originalCounterView, {
    group: "family",
    comment: "O primeiro contador revisa a segunda contagem de outra pessoa.",
  });
  assert.ifError(newFamily.error);
  assert.equal(newFamily.data.status, "submitted");
  assert.equal(
    newFamily.data.balanceReview.reviews[0].reviewed_snapshot.notes,
    f.payload.notes,
  );
  const approved = await balCommand(supervisor.client, newFamily.data, {
    group: "supervisor",
    comment: "Parecer independente da segunda contagem.",
  });
  assert.ifError(approved.error);
  assert.equal(approved.data.status, "submitted");
  const applied = await balApply(supervisor.client, approved.data, "supervisor");
  assert.ifError(applied.error);
  assert.equal(applied.data.status, "approved");
  assert.equal(approved.data.payload.notes, payload.notes);
  assert.equal(approved.data.balanceReview.reviews.length, 3);
});
