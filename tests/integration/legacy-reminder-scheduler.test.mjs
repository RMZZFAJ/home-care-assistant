import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor, env, fixtures, rpc } from "./v4-fixtures.mjs";
import { balanceSetup } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const service = () =>
  createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const owned = new Set();
const query = (body) => JSON.parse(sql(body));
const todaySql = "(now() at time zone 'America/Sao_Paulo')::date";
const days = ["0", "1", "2", "3", "4", "5", "6"];
const policy = (user = fixtures.professional.id) => ({
  balReminderUsers: [],
  shiftReminder: { enabled: true, hour: 0, days, userIds: [user] },
});
function configure(ids, settings = policy()) {
  sql(`insert into public.patient_settings(care_recipient_id,settings)
    select id,${sqlLiteral(JSON.stringify(settings))}::jsonb from unnest(array[${ids.map(sqlLiteral).join(",")}]::uuid[]) id
    on conflict(care_recipient_id) do update set settings=public.patient_settings.settings||excluded.settings,version=public.patient_settings.version+1,updated_at=clock_timestamp();`);
}
async function patients(count = 1) {
  const global = await actor("global"),
    ids = [];
  for (let start = 0; start < count; start += 10) {
    await Promise.all(
      Array.from({ length: Math.min(10, count - start) }, async () => {
        const row = await rpc(global, "admin_upsert_recipient", {
          p_id: null,
          p_display_name: "Rotação fictícia " + randomUUID(),
          p_is_active: true,
          p_is_development: true,
        });
        owned.add(row.id);
        ids.push(row.id);
      }),
    );
  }
  sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values
    ${ids.map((id) => `(${sqlLiteral(id)},${sqlLiteral(fixtures.professional.id)},'professional')`).join(",")};`);
  configure(ids);
  return ids;
}
afterEach(() => {
  if (owned.size)
    sql(
      `update public.care_recipients set is_active=false where id=any(array[${[...owned].map(sqlLiteral).join(",")}]::uuid[]);`,
    );
  owned.clear();
});
const schedule = () => rpc(service(), "run_operational_schedule", {});
const count = (ids) =>
  Number(
    sql(
      `select count(*) from public.operational_reminders where care_recipient_id=any(array[${ids.map(sqlLiteral).join(",")}]::uuid[]) and kind='shift';`,
    ),
  );
function rewind(patient, daysAgo) {
  // Controlled downtime fixture only. No HTTP or production clock override.
  sql(
    `update private.legacy_reminder_checkpoints set closed_through=${todaySql}-${daysAgo},observed_at=now()-interval '${daysAgo + 1} days' where care_recipient_id=${sqlLiteral(patient)};`,
  );
}
function businessFacts(patient) {
  return sql(`select jsonb_build_object('documents',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(patient)}),
  'stock',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(patient)}),
  'reports',(select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(patient)}));`);
}

test("101 eligible legacy configurations rotate within three bounded rounds without duplicate periods", async () => {
  const ids = await patients(101),
    results = [];
  for (let round = 0; round < 3; round++) results.push(await schedule());
  assert.equal(
    count(ids),
    101,
    "all 101 eligible configurations must be reached; empty defaults cannot occupy the batch",
  );
  for (const result of results) assert.ok(result.legacyReminderPatients <= 100);
  const rows = query(
    `select jsonb_agg(to_jsonb(x)) from (select care_recipient_id,count(*) rows,count(distinct period) periods from public.operational_reminders where care_recipient_id=any(array[${ids.map(sqlLiteral).join(",")}]::uuid[]) and kind='shift' group by 1) x;`,
  );
  assert.equal(rows.length, 101);
  assert.ok(rows.every((r) => r.rows === 1 && r.periods === 1));
  assert.equal(
    Number(
      sql(
        `select count(*) from public.requisition_notifications n join public.operational_reminders r on r.id=n.reminder_id where r.care_recipient_id=any(array[${ids.map(sqlLiteral).join(",")}]::uuid[]) and n.channel='internal';`,
      ),
    ),
    101,
  );
  const pro = await actor("professional", ids[0]);
  assert.ok((await pro.rpc("run_operational_schedule")).error);
  const anon = createClient(env.url, env.anonKey, {
    auth: { persistSession: false },
  });
  assert.ok((await anon.rpc("run_operational_schedule")).error);
  assert.equal(
    sql(
      "select bool_and(not has_function_privilege(r,p.oid,'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join unnest(array['anon','authenticated','service_role'])r where n.nspname='private' and p.proname in ('legacy_reminder_policy','enqueue_scheduled_reminders');",
    ),
    "t",
  );
});

test("downtime D to D+1 recovers the original period exactly once through the real authenticated reminder consumer", async () => {
  const [patient] = await patients(),
    before = businessFacts(patient);
  await schedule();
  rewind(patient, 2);
  await schedule();
  assert.equal(count([patient]), 2);
  await Promise.all([schedule(), schedule()]);
  assert.equal(count([patient]), 2);
  const row = query(
    `select row_to_json(r) from public.operational_reminders r where care_recipient_id=${sqlLiteral(patient)} and kind='shift' and period=${todaySql}-1;`,
  );
  assert.equal(row.acknowledged_at, null);
  assert.equal(
    sql(
      `select (${sqlLiteral(row.expected_at)}::timestamptz at time zone 'America/Sao_Paulo')::date=${todaySql}-1;`,
    ),
    "t",
  );
  const pro = await actor("professional", patient);
  const target = await rpc(pro, "notification_reference", {
    p_patient: patient,
    p_ref: row.id,
    p_area: "consumption",
    p_namespace: "reminder",
  });
  assert.equal(target.kind, "shift_reminder");
  assert.equal(target.period, row.period);
  assert.equal(target.acknowledgedAt, null);
  assert.equal(target.canAcknowledge, true);
  assert.equal(businessFacts(patient), before);
});

test("long downtime advances seven dates per visit without skipping backlog or fabricating operational facts", async () => {
  const [patient] = await patients(),
    before = businessFacts(patient);
  await schedule();
  rewind(patient, 22);
  for (const expected of [8, 15, 22, 22]) {
    await schedule();
    assert.equal(count([patient]), expected);
  }
  assert.equal(
    sql(
      `select closed_through=${todaySql}-1 from private.legacy_reminder_checkpoints where care_recipient_id=${sqlLiteral(patient)};`,
    ),
    "t",
  );
  assert.equal(
    Number(
      sql(
        `select count(distinct period) from public.operational_reminders where care_recipient_id=${sqlLiteral(patient)} and kind='shift';`,
      ),
    ),
    22,
  );
  assert.equal(businessFacts(patient), before);
});

test("a changed configuration version records the unknown historical gap instead of applying today's recipients retroactively", async () => {
  const [patient] = await patients();
  await schedule();
  rewind(patient, 3);
  // Same fingerprint alone cannot prove historical continuity.
  configure([patient]);
  await schedule();
  assert.equal(count([patient]), 1);
  const gaps = query(
    `select jsonb_agg(to_jsonb(g)) from private.legacy_reminder_gaps g where care_recipient_id=${sqlLiteral(patient)};`,
  );
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].reason, "policy_changed");
  assert.equal(
    sql(
      `select period_from=${todaySql}-2 and period_to=${todaySql}-1 from private.legacy_reminder_gaps where care_recipient_id=${sqlLiteral(patient)};`,
    ),
    "t",
  );
  await schedule();
  assert.equal(
    Number(
      sql(
        `select count(*) from private.legacy_reminder_gaps where care_recipient_id=${sqlLiteral(patient)};`,
      ),
    ),
    1,
  );
});

test("malformed legacy policy is diagnosed independently, valid patients progress and recovery preserves the failed interval", async () => {
  const [bad, good] = await patients(2);
  await schedule();
  rewind(bad, 3);
  const malformed = policy();
  malformed.shiftReminder.hour = "bad";
  configure([bad], malformed);
  const result = await schedule();
  assert.ok(result.legacyReminderFailures >= 1);
  const failure = query(
    `select row_to_json(f) from private.legacy_reminder_failures f where care_recipient_id=${sqlLiteral(bad)};`,
  );
  assert.equal(failure.sqlstate, "22023");
  assert.equal(failure.resolved_at, null);
  assert.equal(count([good]), 1);
  sql(
    `update private.legacy_reminder_failures set first_failure_at=now()-interval '2 days' where care_recipient_id=${sqlLiteral(bad)};`,
  );
  configure([bad]);
  await schedule();
  assert.equal(
    sql(
      `select resolved_at is not null and attempts>=1 from private.legacy_reminder_failures where care_recipient_id=${sqlLiteral(bad)};`,
    ),
    "t",
  );
  assert.equal(
    sql(
      `select exists(select 1 from private.legacy_reminder_gaps where care_recipient_id=${sqlLiteral(bad)} and reason='invalid_configuration');`,
    ),
    "t",
  );
  assert.equal(count([bad]), 1);
});

test("a rolled-back batch advances neither cursor nor reminders and modern BAL keeps its existing producer", async () => {
  const [patient] = await patients();
  const beforeCursor = sql(
    "select row_to_json(p) from private.legacy_reminder_progress p;",
  );
  sql("begin;select private.enqueue_scheduled_reminders();rollback;");
  assert.equal(count([patient]), 0);
  assert.equal(
    sql("select row_to_json(p) from private.legacy_reminder_progress p;"),
    beforeCursor,
  );
  const f = await balanceSetup();
  owned.add(f.patient);
  const yesterday = Number(
    sql(`select extract(dow from ${todaySql}-1)::integer;`),
  );
  configure([f.patient], {
    balDay: yesterday,
    balReminderUsers: [f.pro.id],
    shiftReminder: { enabled: false },
  });
  await schedule();
  rewind(f.patient, 2);
  await schedule();
  assert.equal(
    Number(
      sql(
        `select count(*) from public.operational_reminders where care_recipient_id=${sqlLiteral(f.patient)} and kind='bal';`,
      ),
    ),
    0,
  );
  assert.equal(
    sql(
      `select enabled from public.bal_regimes where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    "t",
  );
});
