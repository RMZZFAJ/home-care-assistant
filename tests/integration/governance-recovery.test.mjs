import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

const packet = (patient, change = { reminderHours: 3 }) => ({ p_patient: patient, p_kind: "settings", p_change: change, p_key: randomUUID(), p_version: 1 });
test("51 governance changes retain the oldest pending proposal, reference search, both administrators and bounded scoped pages", async () => {
  const f = await setup(), global = await actor("global");
  const changes = [];
  for (let index = 0; index < 51; index++) changes.push(await rpc(global, "configure_patient_access", packet(f.patient, { reminderHours: index + 2 })));
  sql(`update public.access_change_requests set status='rejected',decided_at=clock_timestamp() where care_recipient_id=${sqlLiteral(f.patient)} and id<>${sqlLiteral(changes[0].id)};`);
  for (const client of [global, f.admin]) {
    const pending = await rpc(client, "patient_governance_changes", { p_patient: f.patient });
    assert.equal(pending.total, 1); assert.equal(pending.changes[0].id, changes[0].id);
    assert.equal(pending.changes[0].current.reminderHours ?? null, null);
    assert.equal(pending.changes[0].proposerName.length > 0, true);
    const history = await rpc(client, "patient_governance_changes", { p_patient: f.patient, p_status: "all", p_page: 3, p_size: 20 });
    assert.equal(history.total, 51); assert.equal(history.changes.length, 11); assert.ok(history.changes.some(change => change.id === changes[0].id));
    const reference = await rpc(client, "patient_governance_changes", { p_patient: f.patient, p_status: "all", p_query: changes[0].id });
    assert.equal(reference.total, 1); assert.equal(reference.changes[0].id, changes[0].id);
    assert.equal(Object.hasOwn(reference.changes[0], "idempotency_key"), false);
    assert.equal((await rpc(client, "patient_governance", { p_patient: f.patient })).changes[0].id, changes[0].id);
    for (const input of [{ p_size: null }, { p_size: 51 }, { p_page: null }, { p_page: 0 }, { p_query: null }, { p_status: null }])
      assert.equal((await client.rpc("patient_governance_changes", { p_patient: f.patient, ...input })).error?.code, "22023");
    assert.equal((await rpc(client, "patient_governance_changes", { p_patient: f.patient, p_status: "all", p_size: 50 })).changes.length, 50);
  }
  const another = await setup();
  await actor("adminA", f.patient);
  assert.equal((await f.admin.rpc("patient_governance_changes", { p_patient: another.patient })).error?.code, "42501");
  const professional = await actor("professional", f.patient);
  assert.equal((await professional.rpc("patient_governance_changes", { p_patient: f.patient })).error?.code, "42501");
  assert.equal(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(f.patient)};`), "51");
});

test("concurrent retries recover one proposal with its original base version; changed content/version conflicts without rebasing", async () => {
  const f = await setup(), global = await actor("global"), intent = packet(f.patient);
  const results = await Promise.all([global.rpc("configure_patient_access", intent), global.rpc("configure_patient_access", intent)]);
  for (const result of results) assert.ifError(result.error);
  assert.equal(results[0].data.id, results[1].data.id);
  for (const changed of [{ p_change: { reminderHours: 4 } }, { p_version: 2 }])
    assert.equal((await global.rpc("configure_patient_access", { ...intent, ...changed })).error?.code, "23505");
  await rpc(f.admin, "configure_patient_access", packet(f.patient, { archiveDays: 8 }));
  assert.equal((await rpc(global, "configure_patient_access", intent)).id, results[0].data.id);
  assert.equal((await global.rpc("configure_patient_access", packet(f.patient))).error?.code, "PT409");
  assert.equal(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(f.patient)} and idempotency_key=${sqlLiteral(intent.p_key)};`), "1");
  assert.equal(sql(`select base_version from public.access_change_requests where id=${sqlLiteral(results[0].data.id)};`), "1");
});

test("governance authority is rechecked after observed patient and profile waits and leaves no proposal or policy effect", async () => {
  for (const late of [false, true]) {
    const f = await setup(), intent = packet(f.patient);
    const send = () => f.admin.rpc("configure_patient_access", intent);
    const denied = late ? await whileRowWaits("profiles", fixtures.adminA.id, "configure_patient_access", send, async () => assert.ifError((await f.admin.auth.signOut()).error))
      : await whileAdvisoryWaits("stock:" + f.patient, send, async () => {
        sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`);
      });
    assert.equal(denied.error?.code, "42501", denied.error?.message);
    assert.equal(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(f.patient)};`), "0");
    assert.equal(sql(`select coalesce((select version from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)}),1);`), "1");
  }
});

test("governance helper and entrypoint grants do not open anonymous or service authority", () => {
  const result = JSON.parse(sql(`select jsonb_build_object('anon',has_function_privilege('anon','public.patient_governance_changes(uuid,text,text,text,integer,integer)','execute'),'service',has_function_privilege('service_role','public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)','execute'),'helper',has_function_privilege('authenticated','private.access_change_current(uuid,text,jsonb)','execute'),'legacy',has_function_privilege('authenticated','public.phase_d2_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)','execute'));`));
  assert.deepEqual(result, { anon: false, service: false, helper: false, legacy: false });
});

test("an explicit change to the administrator's own membership preserves the existing second-administrator contract", async () => {
  for (const revoke of [false, true]) {
    const f = await setup();
    const change = revoke ? { operation: "membershipStatus", args: { userId: fixtures.adminA.id, status: "revoked" } } : { userId: fixtures.adminA.id, role: "family" };
    const result = await rpc(f.admin, "configure_patient_access", { ...packet(f.patient), p_kind: revoke ? "administration" : "membership", p_change: change });
    assert.equal(result.status, "applied");
    assert.equal(sql(`select ${revoke ? "status" : "role"} from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`), revoke ? "revoked" : "family");
    assert.equal(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and role='admin' and status='active';`), "1");
  }
});

test("an intentional own transition cannot remove the last active patient administrator", async () => {
  const f = await setup();
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.global.id)};`);
  const result = await f.admin.rpc("configure_patient_access", { ...packet(f.patient), p_kind: "membership", p_change: { userId: fixtures.adminA.id, role: "family" } });
  assert.equal(result.error?.code, "23514");
  assert.equal(sql(`select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(f.patient)};`), "0");
  assert.equal(sql(`select role from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`), "admin");
});

test("every governance kind and administrative operation has a scoped current-value model with human subjects and catalogue names", async () => {
  const f = await setup(), global = await actor("global");
  const changes = [
    ["settings", { archiveDays: 9 }],
    ["capability", { capability: "req.create", subjectRole: "professional", enabled: false }],
    ["membership", { userId: fixtures.professional.id, role: "family" }],
    ["notification_rule", { event: "req.issued", role: "family", channels: ["internal"] }],
    ...[
      ["recipient", { displayName: "Nome proposto fictício", isActive: true, isDevelopment: true }],
      ["product", { id: f.products[0], name: "Material proposto fictício", category: "higiene", unit: "unidade", aliases: [], isActive: true }],
      ["adoptProduct", { productId: f.products[0] }],
      ["membershipStatus", { userId: fixtures.professional.id, status: "revoked" }],
      ["alertRule", { productId: f.products[0], location: "FAMILY", lowThreshold: "2", criticalThreshold: "1", isEnabled: true }],
      ["notificationRecipient", { recipientUserId: fixtures.professional.id, recipientGroup: "care_team", channel: "internal", destination: "", isEnabled: true, includeTeamAlerts: false }],
    ].map(([operation, args]) => ["administration", { operation, args }]),
  ];
  for (const [kind, change] of changes) await rpc(global, "configure_patient_access", { ...packet(f.patient), p_kind: kind, p_change: change });
  const page = await rpc(f.admin, "patient_governance_changes", { p_patient: f.patient });
  assert.equal(page.total, 10);
  const capability = page.changes.find(row => row.kind === "capability");
  assert.equal(typeof capability.current._inheritedEnabled, "boolean");
  for (const row of page.changes.filter(row => ["product", "adoptProduct", "alertRule"].includes(row.proposed.operation)))
    assert.equal(row.current._productName, sql(`select name from public.products where id=${sqlLiteral(f.products[0])};`));
  for (const row of page.changes.filter(row => row.kind === "membership" || ["membershipStatus", "notificationRecipient"].includes(row.proposed.operation)))
    assert.equal(row.subjectName, sql(`select full_name from public.profiles where id=${sqlLiteral(fixtures.professional.id)};`));
  assert.equal(sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(f.patient)};`), "1");
  assert.equal(sql(`select role from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`), "professional");
});

test("the default open page retains invitations awaiting acceptance without mixing their status with pending approval", async () => {
  const f = await setup(), global = await actor("global");
  const proposal = await rpc(global, "configure_patient_access", { ...packet(f.patient), p_kind: "membership", p_change: { userId: fixtures.adminB.id, role: "professional" } });
  const approval = await rpc(f.admin, "configure_patient_access", { ...packet(f.patient), p_kind: "membership", p_request_id: proposal.id, p_decision: "approve", p_change: { invitationTokenHash: createHash("sha256").update(randomUUID()).digest("hex") } });
  assert.equal(approval.status, "awaiting_acceptance");
  assert.equal((await rpc(f.admin, "patient_governance_changes", { p_patient: f.patient })).changes[0].id, proposal.id);
  assert.equal((await rpc(f.admin, "patient_governance_changes", { p_patient: f.patient, p_status: "pending" })).total, 0);
  assert.equal((await rpc(f.admin, "patient_governance_changes", { p_patient: f.patient, p_status: "awaiting_acceptance" })).total, 1);
  assert.equal(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminB.id)};`), "0");
});
