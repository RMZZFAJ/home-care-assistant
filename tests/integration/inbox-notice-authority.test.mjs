import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { actor, adjustCapability, fixtures, issue, setup } from "./v4-fixtures.mjs";
import { balCommand, legacyBalance } from "./bal-review-fixtures.mjs";
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
  const empty = { data: [], total: 0, unreadCount: 0, actionCount: 0 };
  assert.deepEqual(await inbox(), empty);
  assert.deepEqual(await inbox({ p_surface: "bell" }), empty);
  for (const id of Object.values(ids)) {
    assert.deepEqual(await inbox({ p_id: id, p_unread: false }), empty);
    const raw = await client.from("requisition_notifications").select("id", { count: "exact" }).eq("id", id);
    assert.equal(raw.error, null);
    assert.equal(raw.count, 0);
    assert.equal((await client.rpc("mark_notification_seen", { p_id: id })).error?.code, "42501");
  }
  assert.equal(sql(`select count(*) from public.requisition_notifications where id in (${Object.values(ids).map(q).join(",")}) and seen_at is null;`), "6");
});

test("inbox search and task filters share the authorized total and keep seen separate from science", async () => {
  const f = await setup();
  const req = await issue(f.patient, f.products);
  const family = await actor("family", f.patient);
  const inbox = (filters = {}) => rpc(family, "read_personal_inbox", {
    p_patient: f.patient, p_offset: 0, p_size: 50, p_surface: "center", p_unread: false, ...filters,
  });
  const original = await inbox({ p_tasks: true, p_kind: "REQ" });
  const notice = original.data.find(n => n.document_id === req.id);
  assert.ok(notice?.reference_code);
  assert.equal(notice.task, "req.science");
  assert.equal(original.total, original.actionCount);
  const olderPage = await inbox({ p_kind: "REQ", p_tasks: true, p_search: notice.reference_code.toLowerCase(), p_size: 1 });
  assert.equal(olderPage.data.length, 1);
  assert.equal(olderPage.data[0].document_id, req.id);
  const literal = await inbox({ p_search: "%%%_" });
  assert.equal(literal.total, 0);
  assert.equal(literal.actionCount, original.actionCount);
  assert.equal((await inbox({ p_kind: "BAL", p_search: notice.reference_code })).total, 0);

  await rpc(family, "mark_notification_seen", { p_id: notice.id });
  const viewed = (await inbox({ p_id: notice.id, p_tasks: true })).data[0];
  assert.ok(viewed.seen_at);
  assert.equal(viewed.task, "req.science");
  assert.equal(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)} and user_id=${q(fixtures.family.id)};`), "0");
  const progress = await rpc(family, "requisition_progress", { p_id: req.id });
  await rpc(family, "acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: progress.version, p_material_identity: progress.materialIdentity });
  const completed = await inbox({ p_id: notice.id });
  assert.equal(completed.actionCount, 0);
  assert.equal(completed.data[0].task, null);
  assert.equal((await inbox({ p_tasks: true })).total, 0);
});

test("a BAL notice follows the current eligible review and excludes the counter", async () => {
  const f = await legacyBalance();
  const reviewer = await actor("family", f.patient);
  const balanceId = f.document.id;
  const noticeFor = (userId) => {
    const id = randomUUID();
    sql(`insert into public.requisition_notifications(id,care_recipient_id,recipient_user_id,recipient_group,recipient_label,channel,event_key,document_id)
      values(${q(id)},${q(f.patient)},${q(userId)},'family','Destinatário fictício','internal','bal.issued',${q(balanceId)});`);
    return id;
  };
  const familyNotice = noticeFor(fixtures.family.id);
  const counterNotice = noticeFor(fixtures.adminA.id);
  const inbox = (client, id) => rpc(client, "read_personal_inbox", {
    p_patient: f.patient, p_offset: 0, p_size: 1, p_surface: "center", p_unread: false, p_id: id,
  });
  assert.equal((await inbox(reviewer, familyNotice)).data[0].task, "bal.review");
  assert.equal((await inbox(f.admin, counterNotice)).data[0].task, null);
  const current = await rpc(reviewer, "operational_document", { p_id: balanceId });
  const reviewed = await balCommand(reviewer, current, {
    group: "family", comment: "Revisão fictícia da contagem preservada.", reviewReference: current.balanceReview.referenceHash,
  });
  assert.ifError(reviewed.error);
  assert.equal((await inbox(reviewer, familyNotice)).data[0].task, null);
  assert.equal(reviewed.data.status, "submitted");
});
