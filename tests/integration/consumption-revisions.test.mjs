import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

const ledger = (patient) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
const row = (id) =>
  JSON.parse(
    sql(
      `select to_jsonb(r) from public.consumption_reports r where id=${sqlLiteral(id)};`,
    ),
  );
async function report(lines = true, kind = "consumption") {
  const f = await setup();
  const id = await rpc(f.admin, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: kind,
    p_location: "FAMILY",
    p_text: "Relato fictício original para conferência",
    p_lines: lines ? [{ productId: f.products[0], quantity: "1" }] : [],
    p_key: randomUUID(),
  });
  return { ...f, id };
}

test("consumption NULL is invalid and preserves the pending report, audit and ledger", async () => {
  const f = await report(),
    initial = row(f.id),
    stock = ledger(f.patient);
  const audit = sql(
    `select count(*) from public.audit_events where entity_id=${sqlLiteral(f.id)};`,
  );
  const result = await f.admin.rpc("confirm_extraordinary_consumption", {
    p_id: f.id,
    p_accept: null,
  });
  assert.ok(result.error, "SQL NULL must not become a rejection");
  assert.deepEqual(row(f.id), initial);
  assert.equal(ledger(f.patient), stock);
  assert.equal(
    sql(
      `select count(*) from public.audit_events where entity_id=${sqlLiteral(f.id)};`,
    ),
    audit,
  );
});

const view = (f) => rpc(f.admin, "consumption_report", { p_id: f.id });
const supplement = (
  f,
  client,
  text = "Esclarecimento fictício com estrutura exata",
  lines = [{ productId: f.products[0], quantity: "2" }],
  version = 1,
  key = randomUUID(),
) =>
  rpc(client, "supplement_consumption_report", {
    p_id: f.id,
    p_text: text,
    p_lines: lines,
    p_key: key,
    p_version: version,
  });
const decide = (f, accept, version = 1, key = randomUUID(), reason = null) => ({
  p_id: f.id,
  p_accept: accept,
  p_reason: reason,
  p_key: key,
  p_version: version,
});
async function sendAs(client, name, args) {
  const session = (await client.auth.getSession()).data.session;
  assert.ok(session);
  const response = await fetch(env.url + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      authorization: "Bearer " + session.access_token,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(20_000),
  });
  return { ok: response.ok, body: await response.json() };
}

test("text-only consumption can be supplemented by another real author and confirmed once at its exact version", async () => {
  const f = await report(false),
    family = await actor("family", f.patient),
    initial = row(f.id),
    stock = ledger(f.patient);
  const insufficient = await f.admin.rpc(
    "decide_consumption_report",
    decide(f, true),
  );
  assert.equal(insufficient.error?.code, "22023");
  assert.match(insufficient.error.message, /supplement required/);
  assert.equal(ledger(f.patient), stock);
  const key = randomUUID(),
    completed = await supplement(f, family, undefined, undefined, 1, key);
  assert.equal(completed.version, 2);
  assert.equal(completed.body, initial.body);
  assert.deepEqual(completed.lines, initial.lines);
  assert.equal(completed.reported_by, fixtures.adminA.id);
  assert.equal(completed.revisions[0].actor_id, fixtures.family.id);
  assert.notEqual(completed.reported_name, completed.revisions[0].actor_name);
  assert.equal(ledger(f.patient), stock);
  assert.equal(
    (await supplement(f, family, undefined, undefined, 1, key)).replayed,
    true,
  );
  assert.equal((await view(f)).revisions.length, 1);
  const stale = await f.admin.rpc(
    "decide_consumption_report",
    decide(f, true, 1),
  );
  assert.match(stale.error?.message ?? "", /stale consumption report/);
  const legacy = await f.admin.rpc("confirm_extraordinary_consumption", {
    p_id: f.id,
    p_accept: true,
  });
  assert.equal(legacy.error?.code, "22023");
  assert.equal(ledger(f.patient), stock);
  const outcomes = await Promise.all([
    sendAs(f.admin, "decide_consumption_report", decide(f, true, 2)),
    sendAs(f.admin, "decide_consumption_report", decide(f, true, 2)),
  ]);
  assert.ok(outcomes.every((outcome) => outcome.ok));
  const result = await view(f);
  assert.equal(result.status, "confirmed");
  assert.equal(result.decision.version, 2);
  assert.equal(result.movements.length, 1);
  assert.equal(Number(result.movements[0].quantity), 2);
  assert.deepEqual(result.decision.snapshot.lines, result.current_lines);
  assert.equal(result.decision.snapshot.revision.actor_id, fixtures.family.id);
  const balance = await f.admin
    .from("current_stock_balances")
    .select("balance")
    .eq("care_recipient_id", f.patient)
    .eq("product_id", f.products[0])
    .eq("location", "FAMILY")
    .single();
  assert.ifError(balance.error);
  assert.ok(balance.data && balance.data.balance !== null);
  assert.equal(Number(balance.data.balance), 28);
  assert.deepEqual(row(f.id).lines, initial.lines);
  assert.equal(row(f.id).body, initial.body);
});

test("professional author can clarify their own team report without changing the original or assuming family custody", async () => {
  const f = await setup(),
    professional = await actor("professional", f.patient);
  const id = await rpc(professional, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "consumption",
    p_location: "CARE_TEAM",
    p_text: "Usamos material, sem quantidade inicialmente informada",
    p_lines: [],
    p_key: randomUUID(),
  });
  const original = row(id),
    stock = ledger(f.patient);
  const result = await supplement(
    { ...f, id },
    professional,
    "Esclarecimento próprio: duas unidades na equipe",
  );
  assert.equal(result.revisions[0].actor_id, fixtures.professional.id);
  assert.equal(result.reported_by, fixtures.professional.id);
  assert.equal(result.version, 2);
  assert.equal(ledger(f.patient), stock);
  assert.deepEqual(row(id).lines, original.lines);
  const familyId = await rpc(f.admin, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "shortage",
    p_location: "FAMILY",
    p_text: "Falta fictícia da família",
    p_lines: [],
    p_key: randomUUID(),
  });
  const forbidden = await professional.rpc("supplement_consumption_report", {
    p_id: familyId,
    p_text: "Não pode assumir a custódia familiar",
    p_lines: [],
    p_key: randomUUID(),
    p_version: 1,
  });
  assert.equal(forbidden.error?.code, "42501");
  assert.equal(row(familyId).version, 1);
});

test("opposing concurrent consumption decisions keep one first decision and at most one debit", async () => {
  const f = await report(),
    other = await actor("global", f.patient);
  const results = await Promise.all([
    sendAs(f.admin, "decide_consumption_report", decide(f, true)),
    sendAs(
      other,
      "decide_consumption_report",
      decide(f, false, 1, randomUUID(), "Discordância fictícia sobre o relato"),
    ),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.match(
    results.find((result) => !result.ok).body.message,
    /consumption decision conflict/,
  );
  const result = await view(f);
  assert.equal(result.movements.length, result.status === "confirmed" ? 1 : 0);
  assert.equal(result.status === "confirmed", result.decision.accepted);
  assert.equal(
    Number(
      sql(
        `select count(*) from public.consumption_report_decisions where report_id=${sqlLiteral(f.id)};`,
      ),
    ),
    1,
  );
  assert.equal(
    Number(
      sql(
        `select count(*) from public.audit_events where entity_id=${sqlLiteral(f.id)} and action='consumption.reviewed';`,
      ),
    ),
    1,
  );
  const repeated = await rpc(
    f.admin,
    "decide_consumption_report",
    decide(
      f,
      result.decision.accepted,
      1,
      randomUUID(),
      result.decision.reason,
    ),
  );
  assert.equal(repeated.replayed, true);
});

test("shortage confirmation and reasoned rejection preserve facts without a stock debit", async () => {
  const f = await report(true, "shortage"),
    stock = ledger(f.patient);
  const confirmed = await rpc(
    f.admin,
    "decide_consumption_report",
    decide(f, true),
  );
  assert.equal(confirmed.status, "confirmed");
  assert.deepEqual(confirmed.movements, []);
  assert.equal(ledger(f.patient), stock);
  const rejected = await report(false);
  const before = row(rejected.id),
    initial = ledger(rejected.patient);
  for (const args of [
    decide(rejected, null),
    decide(rejected, false),
    decide(
      rejected,
      true,
      1,
      randomUUID(),
      "Texto que não pertence a uma confirmação",
    ),
  ])
    assert.equal(
      (await rejected.admin.rpc("decide_consumption_report", args)).error?.code,
      "22023",
    );
  assert.deepEqual(row(rejected.id), before);
  const result = await rpc(
    rejected.admin,
    "decide_consumption_report",
    decide(
      rejected,
      false,
      1,
      randomUUID(),
      "Quantidade não comprovada no relato fictício",
    ),
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.body, before.body);
  assert.equal(
    result.decision.reason,
    "Quantidade não comprovada no relato fictício",
  );
  assert.equal(ledger(rejected.patient), initial);
});

test("consumption keys bind immutable supplement and decision content", async () => {
  const f = await report(false),
    key = randomUUID();
  await supplement(f, f.admin, undefined, undefined, 1, key);
  const original = await view(f),
    stock = ledger(f.patient);
  const changed = await f.admin.rpc("supplement_consumption_report", {
    p_id: f.id,
    p_text: "Outro conteúdo com a mesma chave",
    p_lines: [],
    p_key: key,
    p_version: 1,
  });
  assert.match(changed.error?.message ?? "", /idempotency conflict/);
  assert.deepEqual(await view(f), original);
  assert.equal(ledger(f.patient), stock);
  const decisionKey = randomUUID();
  await rpc(
    f.admin,
    "decide_consumption_report",
    decide(f, true, 2, decisionKey),
  );
  const opposite = await f.admin.rpc(
    "decide_consumption_report",
    decide(f, false, 2, decisionKey, "Outro resultado com a mesma chave"),
  );
  assert.match(opposite.error?.message ?? "", /idempotency conflict/);
  assert.equal((await view(f)).movements.length, 1);
});

test("consumption exact structured input rejects NULL, nonfinite and excess precision before storing a report", async () => {
  const f = await setup();
  const before = sql(
    `select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  for (const quantity of [null, "NaN", "Infinity", "1.0000001"]) {
    const result = await f.admin.rpc("report_extraordinary_consumption", {
      p_patient: f.patient,
      p_kind: "consumption",
      p_location: "FAMILY",
      p_text: "Quantidade inválida de ensaio",
      p_lines: [{ productId: f.products[0], quantity }],
      p_key: randomUUID(),
    });
    assert.equal(result.error?.code, "22023");
  }
  assert.equal(
    sql(
      `select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    before,
  );
});

test("consumption decision revalidates effective authority after an observed patient lock wait", async () => {
  const f = await report(),
    initial = row(f.id),
    stock = ledger(f.patient);
  const result = await whileAdvisoryWaits(
    "stock:" + f.patient,
    () => sendAs(f.admin, "decide_consumption_report", decide(f, true)),
    async () => {
      sql(
        `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'stock.family.manage',${sqlLiteral(fixtures.adminA.id)},false);`,
      );
    },
  );
  assert.equal(result.body.code, "42501");
  assert.deepEqual(row(f.id), initial);
  assert.equal(ledger(f.patient), stock);
  assert.equal(
    sql(
      `select count(*) from public.consumption_report_decisions where report_id=${sqlLiteral(f.id)};`,
    ),
    "0",
  );
});

test("consumption supplement and decision recheck authority after later report-row waits", async () => {
  for (const action of ["supplement", "decision"]) {
    const f = await report(),
      initial = row(f.id),
      stock = ledger(f.patient),
      name =
        action === "supplement"
          ? "supplement_consumption_report"
          : "decide_consumption_report";
    const args =
      action === "supplement"
        ? {
            p_id: f.id,
            p_text: "Complemento fictício concorrente",
            p_lines: [],
            p_key: randomUUID(),
            p_version: 1,
          }
        : decide(f, false, 1, randomUUID(), "Rejeição fictícia concorrente");
    const result = await whileRowWaits(
      "consumption_reports",
      f.id,
      name,
      () => sendAs(f.admin, name, args),
      async () =>
        sql(
          `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(action === "supplement" ? "consumption.report" : "stock.family.manage")},${sqlLiteral(fixtures.adminA.id)},false);`,
        ),
    );
    assert.equal(result.body.code, "42501");
    assert.deepEqual(row(f.id), initial);
    assert.equal(ledger(f.patient), stock);
    assert.equal(
      sql(
        `select count(*) from public.consumption_report_revisions where report_id=${sqlLiteral(f.id)};`,
      ),
      "0",
    );
    assert.equal(
      sql(
        `select count(*) from public.consumption_report_decisions where report_id=${sqlLiteral(f.id)};`,
      ),
      "0",
    );
  }
});

test("consumption immutable children have scoped RLS, no direct writes and no anonymous/private execute grants", async () => {
  const f = await report(false);
  await supplement(f, f.admin);
  await rpc(f.admin, "decide_consumption_report", decide(f, true, 2));
  const other = await setup();
  const client = await actor("adminA", other.patient);
  for (const table of [
    "consumption_report_revisions",
    "consumption_report_decisions",
  ]) {
    const result = await client.from(table).select("id").eq("report_id", f.id);
    assert.ifError(result.error);
    assert.deepEqual(result.data, []);
    assert.equal(
      sql(
        `select has_table_privilege('authenticated','public.${table}','INSERT') or has_table_privilege('authenticated','public.${table}','UPDATE') or has_table_privilege('authenticated','public.${table}','DELETE');`,
      ),
      "f",
    );
  }
  assert.equal(
    (await client.rpc("consumption_report", { p_id: f.id })).error?.code,
    "42501",
  );
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.decide_consumption_report(uuid,boolean,text,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','private.consumption_current_lines(uuid)','EXECUTE');",
    ),
    "f",
  );
});

test("consumption legacy replay recovers the same decision and refuses the opposite", async () => {
  const f = await report();
  await rpc(f.admin, "confirm_extraordinary_consumption", {
    p_id: f.id,
    p_accept: true,
  });
  const confirmed = row(f.id),
    stock = ledger(f.patient);
  await rpc(f.admin, "confirm_extraordinary_consumption", {
    p_id: f.id,
    p_accept: true,
  });
  const opposite = await f.admin.rpc("confirm_extraordinary_consumption", {
    p_id: f.id,
    p_accept: false,
  });
  assert.ok(
    opposite.error,
    "An opposite decision must not be reported as success",
  );
  assert.match(opposite.error.message, /decision conflict/i);
  assert.deepEqual(row(f.id), confirmed);
  assert.equal(ledger(f.patient), stock);
});
