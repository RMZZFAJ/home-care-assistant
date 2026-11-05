import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
const deny = (f, cap, name = "adminA") =>
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures[name].id)},${sqlLiteral(cap)},false);`,
  );
const ledger = (f) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
async function report(structured = true) {
  const f = await setup(),
    args = {
      p_patient: f.patient,
      p_kind: "consumption",
      p_location: "FAMILY",
      p_text: "Relato fictício original para recuperação legítima",
      p_lines: structured ? [{ productId: f.products[0], quantity: "1" }] : [],
      p_key: randomUUID(),
    },
    id = await rpc(f.admin, "report_extraordinary_consumption", args);
  return { ...f, id, args };
}
const decision = (f) => ({
  p_id: f.id,
  p_accept: true,
  p_reason: null,
  p_key: randomUUID(),
  p_version: 1,
});
const facts = (f) =>
  sql(
    `select jsonb_build_object('report',to_jsonb(r),'revisions',(select jsonb_agg(to_jsonb(v) order by version) from public.consumption_report_revisions v where report_id=r.id),'decisions',(select jsonb_agg(to_jsonb(d)) from public.consumption_report_decisions d where report_id=r.id),'audit',(select count(*) from public.audit_events where entity_id=r.id)) from public.consumption_reports r where id=${sqlLiteral(f.id)};`,
  );

test("consumption recovery of an own submitted report needs live custody read, not the later report write capability", async () => {
  const f = await report(),
    before = ledger(f),
    initial = facts(f);
  deny(f, "consumption.report");
  const recovery = await f.admin.rpc(
    "report_extraordinary_consumption",
    f.args,
  );
  assert.ifError(recovery.error);
  assert.equal(recovery.data, f.id);
  assert.equal(ledger(f), before);
  assert.equal(facts(f), initial);
  assert.equal(
    (
      await f.admin.rpc("report_extraordinary_consumption", {
        ...f.args,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("report_extraordinary_consumption", {
        ...f.args,
        p_text: "Conteúdo diferente não é recuperação",
      })
    ).error?.code,
    "23505",
  );
});

test("consumption recovery of an own complement remains readable after closure and loss of report authority", async () => {
  const f = await report(false),
    args = {
      p_id: f.id,
      p_text: "Complemento próprio com uma unidade exata",
      p_lines: [{ productId: f.products[0], quantity: "1" }],
      p_key: randomUUID(),
      p_version: 1,
    };
  await rpc(f.admin, "supplement_consumption_report", args);
  await rpc(f.admin, "decide_consumption_report", {
    ...decision(f),
    p_version: 2,
  });
  const before = ledger(f),
    initial = facts(f);
  deny(f, "consumption.report");
  const recovery = await f.admin.rpc("supplement_consumption_report", args);
  assert.ifError(recovery.error);
  assert.equal(recovery.data.replayed, true);
  assert.equal(recovery.data.version, 2);
  assert.equal(recovery.data.status, "confirmed");
  assert.equal(recovery.data.revisions[0].actor_id, fixtures.adminA.id);
  assert.equal(ledger(f), before);
  assert.equal(facts(f), initial);
  assert.equal(
    (
      await f.admin.rpc("supplement_consumption_report", {
        ...args,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("supplement_consumption_report", {
        ...args,
        p_text: "Intenção alterada",
      })
    ).error?.code,
    "23505",
  );
});

test("consumption recovery of an own confirmed decision never duplicates a debit after management authority loss", async () => {
  const f = await report(),
    args = decision(f);
  await rpc(f.admin, "decide_consumption_report", args);
  const before = ledger(f),
    initial = facts(f);
  deny(f, "stock.family.manage");
  const recovery = await f.admin.rpc("decide_consumption_report", args);
  assert.ifError(recovery.error);
  assert.equal(recovery.data.replayed, true);
  assert.equal(recovery.data.movements.length, 1);
  assert.equal(recovery.data.decision.actor_id, fixtures.adminA.id);
  assert.equal(ledger(f), before);
  assert.equal(facts(f), initial);
  assert.equal(
    (
      await f.admin.rpc("decide_consumption_report", {
        ...args,
        p_key: randomUUID(),
      })
    ).error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("decide_consumption_report", {
        ...args,
        p_accept: false,
        p_reason: "Decisão oposta não é uma recuperação",
      })
    ).error?.code,
    "23505",
  );
});

test("legacy consumption own-key recovery retains opposite-decision rejection and requires only live read", async () => {
  const f = await report(),
    args = { p_id: f.id, p_accept: true };
  await rpc(f.admin, "confirm_extraordinary_consumption", args);
  const before = ledger(f),
    initial = facts(f);
  deny(f, "stock.family.manage");
  const recovery = await f.admin.rpc("confirm_extraordinary_consumption", args);
  assert.ifError(recovery.error);
  assert.equal(ledger(f), before);
  assert.equal(facts(f), initial);
  assert.equal(
    (
      await f.admin.rpc("confirm_extraordinary_consumption", {
        ...args,
        p_accept: false,
      })
    ).error?.code,
    "P0001",
  );
});

test("consumption recovery rechecks read authority after an observed patient wait and cannot replay another actor key", async () => {
  const f = await report(),
    args = decision(f);
  await rpc(f.admin, "decide_consumption_report", args);
  const before = ledger(f),
    initial = facts(f),
    family = await actor("family", f.patient);
  deny(f, "stock.family.manage", "family");
  assert.equal(
    (await family.rpc("decide_consumption_report", args)).error?.code,
    "42501",
  );
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () => f.admin.rpc("decide_consumption_report", args),
    async () => deny(f, "stock.family.read"),
  );
  assert.equal(result.error?.code, "42501");
  assert.equal(ledger(f), before);
  assert.equal(facts(f), initial);
});
