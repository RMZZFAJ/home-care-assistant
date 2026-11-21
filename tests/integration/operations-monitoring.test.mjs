import assert from "node:assert/strict";
import test, { before, after, afterEach } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor, env, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { personalReminderFixture, reminderState } from "./notice-reference-fixtures.mjs";
import { sql, sqlLiteral, pauseLocalAutomationForTests } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

const service = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anonymous = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
const query = body => JSON.parse(sql(body));
let automation = [];
const owned = new Set();
before(() => {
  automation = query("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker');");
  pauseLocalAutomationForTests();
});
after(() => { for (const job of automation) sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${Number(job.id)} and jobname=${sqlLiteral(job.name)};`); });
afterEach(() => { if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(sqlLiteral).join(",")}]::uuid[]);`); owned.clear(); });
async function ownedFixture() { const f = await setup(); owned.add(f.patient); return f; }
const event = (overrides = {}) => ({ environment: "local", component: "application", code: "API_ERROR", idempotencyKey: randomUUID(), correlationId: randomUUID(), observedAt: new Date().toISOString(), metrics: { count: 1, sourceCode: "INTERNAL_ERROR" }, ...overrides });
const diagnostic = (client, environment = "local") => rpc(client, "operations_diagnostics", { p_environment: environment, p_state: "all" });
const configure = (version, policy, key = randomUUID(), environment = "local") => ({ p_environment: environment, p_action: "configure", p_id: null, p_expected: version, p_payload: { policy }, p_key: key });

test("technical diagnostics require current global Auth mode; local, anonymous and service cannot inspect incidents or private tables", async () => {
  const f = await ownedFixture(), local = await actor("adminA", f.patient), global = await actor("global");
  const data = await diagnostic(global);
  assert.equal(data.environment, "local"); assert.equal(data.operationalGo, false); assert.equal(data.externalAvailabilityProved, false);
  assert.equal(data.components.length, 11);
  for (const client of [local, anonymous, service]) {
    assert.ok((await client.rpc("operations_diagnostics", { p_environment: "local" })).error);
    assert.ok((await client.rpc("operations_history", { p_environment: "local" })).error);
    assert.ok((await client.rpc("operations_command", configure(data.policy.version, {}))).error);
  }
  await rpc(global, "select_active_context", { p_patient: f.patient });
  assert.equal((await global.rpc("operations_diagnostics", { p_environment: "local" })).error?.code, "42501");
  await rpc(global, "select_active_context", { p_patient: null });
  const serialized = JSON.stringify(await diagnostic(global));
  for (const forbidden of [f.patient, fixtures.global.id, fixtures.adminA.email, "care_recipient_id", "actor_id", "endpoint", "lease_hash", "Paciente fictício"]) assert.ok(!serialized.includes(forbidden), forbidden);
  assert.equal(sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'operations_%' and c.relkind='r' and (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));"), "0");
});

test("service events reject SQL NULL, private payloads, invalid codes and fabricated verified archives; exact replays deduplicate", async () => {
  const packet = event();
  const [a, b] = await Promise.all([rpc(service, "record_operations_event", { p_event: packet }), rpc(service, "record_operations_event", { p_event: packet })]);
  assert.equal(a.id, b.id); assert.equal([a.replayed, b.replayed].filter(Boolean).length, 1);
  assert.equal(sql(`select count(*) from private.operations_events where idempotency_key=${sqlLiteral(packet.idempotencyKey)};`), "1");
  assert.equal((await service.rpc("record_operations_event", { p_event: { ...packet, metrics: { count: 2 } } })).error?.code, "23505");
  for (const bad of [null, {}, event({ environment: null }), event({ component: "backup" }), event({ observedAt: "infinity" }), event({ observedAt: "2099-01-01T00:00:00Z" }), event({ metrics: { patientName: "PRIVATE_SENTINEL" } }), event({ metrics: { count: null } }), event({ metrics: { count: -1 } }), event({ metrics: { count: 1.5 } }), event({ metrics: { sourceCode: "PRIVATE_SENTINEL" } }), event({ code: "BACKUP_VERIFIED", component: "backup", metrics: {} }), event({ code: "RECOVERY_PROBE_VERIFIED", component: "recovery", metrics: { files: 0, bytes: 1 } })]) assert.equal((await service.rpc("record_operations_event", { p_event: bad })).error?.code, "22023", JSON.stringify(bad));
  assert.ok((await (await actor("global")).rpc("record_operations_event", { p_event: event() })).error);
  assert.ok((await anonymous.rpc("record_operations_event", { p_event: event() })).error);
  assert.equal(sql(`select count(*) from private.operations_events where metrics::text like '%PRIVATE_SENTINEL%';`), "0");
});

test("heartbeat observations are monotonic and do not flood the immutable journal or resolve genuine incidents", async () => {
  const fault = await rpc(service, "record_operations_event", { p_event: event({ component: "database", code: "DATABASE_UNAVAILABLE" }) });
  const before = query("select jsonb_build_object('events',(select count(*) from private.operations_events),'history',(select count(*) from private.operations_history));");
  const now = new Date().toISOString();
  await rpc(service, "record_operations_event", { p_event: event({ component: "database", code: "HEARTBEAT", observedAt: now, metrics: {} }) });
  await rpc(service, "record_operations_event", { p_event: event({ component: "database", code: "HEARTBEAT", observedAt: "2020-01-01T00:00:00Z", metrics: {} }) });
  assert.deepEqual(query("select jsonb_build_object('events',(select count(*) from private.operations_events),'history',(select count(*) from private.operations_history));"), before);
  assert.equal(Date.parse(sql("select observed_at from private.operations_components where environment='local' and component='database';")), Date.parse(now));
  assert.notEqual(sql(`select state from private.operations_incidents where last_event_id=${sqlLiteral(fault.id)};`), "resolved");
  assert.equal((await service.rpc("record_operations_event", { p_event: event({ code: "HEARTBEAT", metrics: { count: 1 } }) })).error?.code, "22023");
});

test("policy CAS preserves exact snapshots; commands replay and conflicting operators cannot both write", async () => {
  const global = await actor("global"), original = (await diagnostic(global)).policy;
  const packet = configure(original.version, { jobWarningSeconds: 121, severity: { outbox: "critical" } });
  try {
    const [a, b] = await Promise.all([global.rpc("operations_command", packet), global.rpc("operations_command", packet)]);
    assert.ifError(a.error); assert.ifError(b.error); assert.deepEqual(a.data, b.data);
    const saved = (await diagnostic(global)).policy;
    assert.equal(saved.version, original.version + 1); assert.equal(saved.values.jobWarningSeconds, 121); assert.equal(saved.values.severity.outbox, "critical");
    assert.equal((await global.rpc("operations_command", { ...packet, p_payload: { policy: { jobWarningSeconds: 122 } } })).error?.code, "23505");
    const race = await Promise.all([global.rpc("operations_command", configure(saved.version, { jobWarningSeconds: 123 })), global.rpc("operations_command", configure(saved.version, { jobWarningSeconds: 124 }))]);
    assert.equal(race.filter(r => !r.error).length, 1); assert.equal(race.find(r => r.error)?.error.code, "PT409");
    const version = (await diagnostic(global)).policy.version;
    for (const bad of [{ jobWarningSeconds: null }, { jobWarningSeconds: 0 }, { jobWarningSeconds: 2592001 }, { jobWarningSeconds: 1.5 }, { heartbeatWarningSeconds: 2, heartbeatCriticalSeconds: 1 }, { securityWarningCount: 2, securityCriticalCount: 1 }, { patient: "PRIVATE_SENTINEL" }, { severity: { outbox: "none" } }, { severity: { patient: "critical" } }]) assert.equal((await global.rpc("operations_command", configure(version, bad))).error?.code, "22023");
    assert.equal((await diagnostic(global)).policy.version, version);
    const history = await rpc(global, "operations_history", { p_environment: "local" });
    const entry = history.data.find(h => h.version === saved.version);
    assert.equal(entry.policy.jobWarningSeconds, 121); assert.match(entry.policyHash, /^[a-f0-9]{64}$/);
  } finally {
    const current = (await diagnostic(global)).policy;
    await rpc(global, "operations_command", configure(current.version, original.values));
  }
});

test("acknowledge/resolve race uses CAS, preserves history and does not change any operational record", async () => {
  const global = await actor("global"), recorded = await rpc(service, "record_operations_event", { p_event: event({ component: "integrity", code: "INTEGRITY_FAILURE" }) });
  const row = (await diagnostic(global)).data.find(x => x.correlationId && sql(`select correlation_id::text from private.operations_events where id=${sqlLiteral(recorded.id)};`) === x.correlationId);
  assert.ok(row);
  const business = () => sql("select jsonb_build_object('documents',(select count(*) from public.operational_documents),'science',(select count(*) from public.requisition_science_events),'stock',(select count(*) from public.stock_movements));");
  const before = business(), base = { p_environment: "local", p_id: row.id, p_expected: row.version };
  const race = await Promise.all([global.rpc("operations_command", { ...base, p_action: "acknowledge", p_payload: { reason: "investigating" }, p_key: randomUUID() }), global.rpc("operations_command", { ...base, p_action: "resolve", p_payload: { reason: "corrected" }, p_key: randomUUID() })]);
  assert.equal(race.filter(r => !r.error).length, 1); assert.equal(race.find(r => r.error)?.error.code, "PT409");
  const current = query(`select to_jsonb(i) from private.operations_incidents i where id=${sqlLiteral(row.id)};`);
  assert.equal(current.version, row.version + 1); assert.equal(business(), before);
  const history = await rpc(global, "operations_history", { p_environment: "local", p_incident: row.id });
  assert.ok(history.data.some(h => ["acknowledged", "resolved"].includes(h.action)));
});

test("complete incident and policy history remains reachable beyond the hundredth record", async () => {
  const global = await actor("global"), packet = event({ environment: "operator", component: "recovery", code: "RECOVERY_FAILURE" });
  const saved = await rpc(service, "record_operations_event", { p_event: packet });
  const id = sql(`select id from private.operations_incidents where last_event_id=${sqlLiteral(saved.id)};`);
  // Controlled 101 historical technical observations, no clinical fixture data.
  sql(`insert into private.operations_history(environment,incident_id,action,version,recorded_at) select 'operator',${sqlLiteral(id)},'observed',x,now()-make_interval(secs=>x) from generate_series(1,101) x;`);
  const first = await rpc(global, "operations_history", { p_environment: "operator", p_incident: id, p_size: 50 });
  const third = await rpc(global, "operations_history", { p_environment: "operator", p_incident: id, p_size: 50, p_page: 3 });
  assert.ok(first.total >= 102); assert.equal(first.data.length, 50); assert.ok(third.data.length >= 2);
  assert.equal(new Set([...first.data, ...third.data].map(r => r.id)).size, first.data.length + third.data.length);
  assert.equal((await global.rpc("operations_history", { p_environment: "local", p_incident: id })).error?.code, "42501");
  sql("insert into private.operations_history(environment,action,version,policy_version,policy_hash,policy_snapshot,recorded_at) select 'operator','configured',version,version,encode(extensions.digest(policy::text,'sha256'),'hex'),policy,now()-make_interval(secs=>x) from private.operations_config cross join generate_series(1,101) x where environment='operator';");
  const policies = await rpc(global, "operations_history", { p_environment: "operator", p_size: 50, p_page: 3 });
  assert.ok(policies.total >= 102); assert.ok(policies.data.length >= 2);
  assert.ok(policies.data.every(line => line.policy && /^[a-f0-9]{64}$/.test(line.policyHash)));
});

for (const change of ["context", "expiry"]) test(`global ${change} is rechecked after a real database lock without journaling the refused command`, async () => {
  const f = await ownedFixture();
  const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.ifError((await client.auth.signInWithPassword({ email: fixtures.global.email, password: fixturePassword })).error);
  await rpc(client, "select_active_context", { p_patient: null });
  const original = (await diagnostic(client)).policy, key = randomUUID();
  const result = await whileAdvisoryWaits("hca:operations:local", () => client.rpc("operations_command", configure(original.version, { jobWarningSeconds: 125 }, key)), async () => {
    if (change === "context") await rpc(client, "select_active_context", { p_patient: f.patient });
    else {
      const session = (await client.auth.getSession()).data.session;
      const claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url"));
      sql(`update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${sqlLiteral(claims.session_id)};`);
    }
  });
  assert.equal(result.error?.code, "42501");
  assert.equal(sql(`select count(*) from private.operations_commands where idempotency_key=${sqlLiteral(key)};`), "0");
  assert.equal(Number(sql("select version from private.operations_config where environment='local';")), original.version);
});

test("personal impact reads only currently authorized own origins and never creates acknowledgement, science or stock", async () => {
  const f = await personalReminderFixture();
  owned.add(f.patient);
  sql(`update public.requisition_notifications set next_attempt_at=now()-interval '2 hours' where reminder_id=${sqlLiteral(f.reminder)} and channel='internal';`);
  const before = reminderState(f), own = await rpc(f.pro.client, "patient_delivery_impact", { p_patient: f.patient });
  assert.ok(own.delayedNotices >= 1); assert.equal(own.acknowledgementCreated, false); assert.equal(reminderState(f), before);
  const stranger = await actor("reader", f.patient);
  assert.equal((await rpc(stranger, "patient_delivery_impact", { p_patient: f.patient })).delayedNotices, 0);
  assert.equal((await f.pro.client.rpc("patient_delivery_impact", { p_patient: randomUUID() })).error?.code, "42501");
  sql(`update public.care_recipient_memberships set role='reader' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)};`);
  assert.equal((await rpc(f.pro.client, "patient_delivery_impact", { p_patient: f.patient })).delayedNotices, 0);
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)};`);
  assert.equal((await f.pro.client.rpc("patient_delivery_impact", { p_patient: f.patient })).error?.code, "42501");
  assert.equal(reminderState(f), before);
});

test("collector records current conditions without repeated history and monitoring failure cannot roll back the business scheduler", async () => {
  const observed = await rpc(service, "collect_operations_status", {}); assert.equal(observed.observed, true);
  const before = Number(sql("select count(*) from private.operations_history;"));
  await rpc(service, "collect_operations_status", {});
  assert.equal(Number(sql("select count(*) from private.operations_history;")), before);
  assert.ok((await (await actor("global")).rpc("collect_operations_status", {})).error);
  // Only the probe connection replaces the private collector inside a rollback.
  // Run the actual public worker body; its independent legacy/REQ/BAL writes
  // must remain visible even when the monitoring subtransaction is rejected.
  const result = sql(`begin;
    create or replace function private.collect_operations_status() returns jsonb language plpgsql security definer set search_path='' as $$begin raise exception 'controlled monitor fault';end;$$;
    select set_config('request.jwt.claims','{"role":"service_role"}',true);
    set local role service_role;
    select public.run_operational_schedule();
    reset role;
    select jsonb_build_object('health',(select last_run is not null from private.scheduler_health));
    rollback;`);
  const values = result.split(/\r?\n/).filter(s => s.startsWith("{")).map(s => JSON.parse(s));
  assert.ok(values.some(v => v.operationsObserved === false)); assert.ok(values.some(v => v.health === true));
});

test("real service collection detects delayed and uncertain native notices, stalled PDF, legacy failure and configured security thresholds", async () => {
  const f = await personalReminderFixture(); owned.add(f.patient);
  const global = await actor("global"), original = (await diagnostic(global)).policy;
  const sharedPolicy = (await diagnostic(global, "shared_database")).policy;
  const owner = await actor("family", f.patient);
  const document = await rpc(owner, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  const issuance = await rpc(owner, "reserve_pdf_issuance", { p_document: document.id, p_key: randomUUID(), p_version: null });
  await rpc(service, "claim_pdf_issuance", { p_id: issuance.id });
  const second = randomUUID();
  sql(`insert into public.operational_reminders(id,care_recipient_id,user_id,kind,period,expected_at) values(${sqlLiteral(second)},${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'shift',(now() at time zone 'America/Sao_Paulo')::date-1,now()-interval '1 day');
    select private.enqueue_notice(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'shift.reminder',p_reminder=>${sqlLiteral(second)});
    update public.requisition_notifications set state='uncertain' where reminder_id=${sqlLiteral(f.reminder)} and channel='internal';
    update public.requisition_notifications set next_attempt_at=now()-interval '2 days' where reminder_id=${sqlLiteral(second)} and channel='internal';
    update private.pdf_issuances set lease_until=now()-interval '1 day' where id=${sqlLiteral(issuance.id)};
    insert into private.legacy_reminder_failures(care_recipient_id,policy_fingerprint,sqlstate,first_failure_at,last_failure_at) values(${sqlLiteral(f.patient)},repeat('a',64),'22023',now(),now());`);
  const facts = reminderState(f);
  try {
    await rpc(global, "operations_command", configure(sharedPolicy.version, { pdfWarningSeconds: 1, pdfCriticalSeconds: 2 }, randomUUID(), "shared_database"));
    const started = Date.now();
    while (sql(`select (clock_timestamp()-requested_at>=interval '2 seconds')::text from private.pdf_issuances where id=${sqlLiteral(issuance.id)};`) !== "true") {
      assert.ok(Date.now() - started < 10000, "The real immutable request must cross the configured age");
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    await rpc(global, "operations_command", configure(original.version, { securityWarningCount: 2, securityCriticalCount: 3 }));
    for (let i = 0; i < 3; i++) await rpc(service, "record_operations_event", { p_event: event({ component: "security", code: "SECURITY_REJECTED", metrics: { sourceCode: "INVALID_ORIGIN", count: 1 } }) });
    await rpc(service, "collect_operations_status", {});
    const shared = await diagnostic(global, "shared_database");
    for (const [component, code] of [["outbox", "OUTBOX_UNCERTAIN"], ["outbox", "JOB_DELAY"], ["signature", "SIGNATURE_PENDING"], ["legacy", "LEGACY_FAILURE"]]) {
      const found = shared.data.find(row => row.component === component && row.code === code && row.state !== "resolved");
      assert.ok(found, component + "/" + code); assert.ok(found.metricCount >= 1);
      if (code === "JOB_DELAY" || code === "SIGNATURE_PENDING") assert.equal(found.severity, "critical");
    }
    const security = (await diagnostic(global)).data.find(row => row.code === "SECURITY_REJECTED" && row.state !== "resolved");
    assert.ok(security?.metricCount >= 3); assert.equal(security.severity, "critical");
    assert.equal(reminderState(f), facts);
    assert.equal(sql(`select state from private.pdf_issuances where id=${sqlLiteral(issuance.id)};`), "processing");
  } finally {
    const sharedLatest = (await diagnostic(global, "shared_database")).policy;
    await rpc(global, "operations_command", configure(sharedLatest.version, sharedPolicy.values, randomUUID(), "shared_database"));
    const latest = (await diagnostic(global)).policy;
    await rpc(global, "operations_command", configure(latest.version, original.values));
  }
});
