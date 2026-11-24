import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { adjustCapability } from "./v4-fixtures.mjs";
import { referenceFixture, rpc, sql, sqlLiteral as q } from "./notice-reference-fixtures.mjs";

test("inbox pages, unread count, detail and seen use the current destination's read permission", async () => {
  const f = await referenceFixture();
  const client = f.pro.client;
  const report = await rpc(client, "report_extraordinary_consumption", {
    p_patient: f.patient, p_kind: "shortage", p_location: "CARE_TEAM",
    p_text: "Contagem fictícia para o teste de autorização do aviso", p_lines: [], p_key: randomUUID(),
  });
  const rows = {
    report: ["consumption_report_id", report, "consumption.reported", false],
    alert: ["alert_event_id", f.alert, "stock.alert", false],
    shift: ["reminder_id", f.reminder, "shift.reminder", false],
    schedule: ["reminder_id", f.scheduleRef, "schedule.change", false],
    balance: ["reminder_id", f.balanceRef, "bal.cycle.generated", true],
    oldBalance: ["reminder_id", f.legacyBalance, "bal.reminder", false],
  };
  const ids = {};
  sql(`update public.requisition_notifications set seen_at=now() where care_recipient_id=${q(f.patient)} and recipient_user_id=${q(f.pro.id)};`);
  for (const [key, [column, target, event, silent]] of Object.entries(rows)) {
    ids[key] = randomUUID();
    // Replace the generated internal fixture notice for this target with a deterministic entry.
    sql(`delete from public.requisition_notifications where care_recipient_id=${q(f.patient)} and recipient_user_id=${q(f.pro.id)} and ${column}=${q(target)} and channel='internal';
      insert into public.requisition_notifications(id,care_recipient_id,recipient_user_id,recipient_group,recipient_label,channel,event_key,silent,${column})
      values(${q(ids[key])},${q(f.patient)},${q(f.pro.id)},'care_team','Profissional fictício','internal',${q(event)},${silent},${q(target)});`);
  }
  const inbox = (overrides = {}) => rpc(client, "read_personal_inbox", {
    p_patient: f.patient, p_offset: 0, p_size: 50, p_surface: "center", p_unread: true, ...overrides,
  });
  const deny = (capability) => adjustCapability(f.admin, f.patient, {
    capability, enabled: false, subjectUser: f.pro.id, reviewedRole: "professional",
  });

  const original = await inbox();
  assert.equal(original.total, 6);
  assert.equal(original.unreadCount, 5);
  assert.deepEqual(new Set(original.data.map(row => row.id)), new Set(Object.values(ids)));
  const bell = await inbox({ p_surface: "bell", p_size: 2, p_offset: 2 });
  assert.equal(bell.total, 5);
  assert.equal(bell.data.length, 2);
  assert.ok(bell.data.every(row => !row.silent));

  await deny("stock.team.read");
  await deny("schedule.read.own");
  const remaining = await inbox();
  assert.equal(remaining.total, 2);
  assert.equal(remaining.unreadCount, 1);
  assert.deepEqual(new Set(remaining.data.map(row => row.id)), new Set([ids.balance, ids.oldBalance]));
  await deny("bal.read");
  assert.deepEqual(await inbox(), { data: [], total: 0, unreadCount: 0 });
  assert.deepEqual(await inbox({ p_surface: "bell" }), { data: [], total: 0, unreadCount: 0 });
  for (const id of Object.values(ids)) {
    assert.deepEqual(await inbox({ p_id: id, p_unread: false }), { data: [], total: 0, unreadCount: 0 });
    const raw = await client.from("requisition_notifications").select("id", { count: "exact" }).eq("id", id);
    assert.equal(raw.error, null);
    assert.equal(raw.count, 0);
    assert.equal((await client.rpc("mark_notification_seen", { p_id: id })).error?.code, "42501");
  }
  assert.equal(sql(`select count(*) from public.requisition_notifications where id in (${Object.values(ids).map(q).join(",")}) and seen_at is null;`), "6");
});
