import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

const packet = (patient, change = { reminderHours: 3 }) => ({ p_patient: patient, p_kind: "settings", p_change: change, p_key: randomUUID(), p_version: 1 });

test("the scoped permission snapshot enumerates actual capabilities and distinguishes default, profile, personal and role limits", async () => {
  const f = await setup();
  const other = await setup();
  try {
    const admin = await actor("adminA", f.patient);
    const global = await actor("global");
    const professional = await actor("professional", f.patient);
    const query = { p_patient: f.patient, p_subject: fixtures.professional.id };
    const snapshot = client => rpc(client, "patient_permission_snapshot", query);
    const initial = await snapshot(admin);
    assert.deepEqual(await snapshot(global), initial);
    assert.equal(initial.role, "professional");
    assert.equal(initial.personId, fixtures.professional.id);
    assert.equal(initial.careRecipientId, f.patient);
    assert.deepEqual(initial.permissions.map(row => row.code), sql("select code from public.capability_definitions order by code;").split(/\r?\n/));
    const req = data => data.permissions.find(row => row.code === "req.create");
    assert.equal(req(initial).origin, "default");
    assert.equal(req(initial).effective, true);
    assert.equal(initial.permissions.find(row => row.code === "com.read").origin, "limited");
    assert.equal(initial.permissions.find(row => row.code === "com.read").effective, false);
    const set = (subject, enabled, version) => rpc(admin, "configure_patient_access", {
      ...packet(f.patient, { capability: "req.create", ...subject, enabled }), p_kind: "capability", p_version: version,
    });
    await set({ subjectRole: "professional" }, false, initial.policyVersion);
    const configured = await snapshot(admin);
    assert.equal(req(configured).origin, "profile");
    assert.equal(req(configured).effective, false);
    await set({ subjectUser: fixtures.professional.id, reviewedRole: "professional", confirmIndividual: true }, true, configured.policyVersion);
    const personal = await snapshot(admin);
    assert.deepEqual(req(personal), { code: "req.create", critical: false, roleEligible: true, inherited: false, effective: true, exception: true, origin: "personal" });
    const effective = await rpc(professional, "patient_capabilities", { p_patient: f.patient });
    assert.deepEqual(Object.fromEntries(personal.permissions.map(row => [row.code, row.effective])), effective);
    assert.equal((await professional.rpc("patient_permission_snapshot", query)).error?.code, "42501");
    assert.equal((await admin.rpc("patient_permission_snapshot", { ...query, p_patient: other.patient })).error?.code, "42501");
    await rpc(admin, "admin_set_membership_status", { p_care_recipient_id: f.patient, p_user_id: fixtures.professional.id, p_status: "revoked" });
    assert.equal((await admin.rpc("patient_permission_snapshot", query)).error?.code, "42501");
    assert.equal((await global.rpc("patient_permission_snapshot", query)).error?.code, "42501");
    assert.equal(sql(`select has_function_privilege('anon','public.patient_permission_snapshot(uuid,uuid)','execute') or has_function_privilege('service_role','public.patient_permission_snapshot(uuid,uuid)','execute');`), "f");
  } finally {
    sql(`update public.care_recipients set is_active=false where id in (${sqlLiteral(f.patient)},${sqlLiteral(other.patient)});`);
  }
});

test("confirmed individual administration uses a real local session, prevents self elevation and preserves the last administrator", async () => {
  const f = await setup();
  const other = await setup();
  const admin = await actor("adminA", f.patient);
  const person = await actor("professional", f.patient);
  const subjectUser = fixtures.professional.id;
  const subject = { subjectUser, reviewedRole: "professional", confirmIndividual: true };
  const query = { p_patient: f.patient, p_subject: subjectUser };
  const read = client => client.rpc("patient_permission_snapshot", query);
  const version = async () => (await rpc(admin, "patient_governance", { p_patient: f.patient })).data.version;
  const change = (fields, p_version) => ({ ...packet(f.patient, fields), p_kind: "capability", p_version });
  const manage = (fields, p_version) => change({ capability: "access.manage", ...fields }, p_version);

  assert.equal((await read(person)).error?.code, "42501");
  const initial = await version();
  assert.equal((await admin.rpc("configure_patient_access", manage({ subjectUser, enabled: true }, initial))).error?.code, "23514");
  assert.equal((await admin.rpc("configure_patient_access", manage({ subjectRole: "professional", enabled: true }, initial))).error?.code, "23514");
  assert.equal((await admin.rpc("configure_patient_access", manage({ ...subject, reviewedRole: "family", enabled: true }, initial))).error?.code, "PT409");
  const grant = manage({ ...subject, enabled: true }, initial);
  const intents = [grant, manage({ ...subject, enabled: true }, initial)];
  const outcomes = await Promise.all(intents.map(intent => admin.rpc("configure_patient_access", intent)));
  assert.equal(outcomes.filter(outcome => !outcome.error).length, 1);
  assert.equal(outcomes.find(outcome => outcome.error).error.code, "PT409");
  const winner = outcomes.findIndex(outcome => !outcome.error);
  const result = outcomes[winner].data;
  assert.equal((await rpc(admin, "configure_patient_access", intents[winner])).id, result.id);
  assert.equal(result.resolution.permission.actorId, fixtures.adminA.id);
  assert.deepEqual([result.resolution.permission.personId, result.resolution.permission.before, result.resolution.permission.after], [subjectUser, false, true]);
  const snapshot = await rpc(person, "patient_permission_snapshot", query);
  assert.deepEqual(snapshot.permissions.find(row => row.code === "access.manage"), {
    code: "access.manage", critical: true, roleEligible: false, inherited: false, effective: true, exception: true, origin: "personal",
  });
  assert.equal((await person.rpc("patient_permission_snapshot", { ...query, p_patient: other.patient })).error?.code, "42501");
  assert.equal((await person.rpc("configure_patient_access", change({ ...subject, capability: "audit.read", enabled: true }, await version()))).error?.code, "42501");
  assert.equal((await person.rpc("configure_patient_access", change({ subjectRole: "professional", capability: "audit.read", enabled: true }, await version()))).error?.code, "42501");
  assert.equal((await person.rpc("admin_upsert_membership", {
    p_care_recipient_id: f.patient, p_user_id: subjectUser, p_role: "admin", p_can_manage_stock: false, p_can_count_stock: false,
  })).error?.code, "42501");
  const update = await rpc(person, "configure_patient_access", { ...packet(f.patient), p_version: await version() });
  assert.equal(update.status, "applied");
  const historical = await rpc(admin, "patient_governance_changes", { p_patient: f.patient, p_status: "all", p_kind: "capability" });
  assert.deepEqual(historical.changes[0].resolution.permission, result.resolution.permission);

  await rpc(admin, "configure_patient_access", manage({ subjectUser: fixtures.global.id, reviewedRole: "admin", confirmIndividual: true, enabled: false }, await version()));
  assert.equal((await person.rpc("configure_patient_access", manage({
    subjectUser: fixtures.adminA.id, reviewedRole: "admin", confirmIndividual: true, enabled: false,
  }, await version()))).error?.code, "23514");
  const withdrawn = await rpc(person, "configure_patient_access", manage({ ...subject, enabled: null }, await version()));
  assert.equal(withdrawn.resolution.permission.after, false);
  assert.equal((await read(person)).error?.code, "42501");
  assert.equal((await rpc(admin, "patient_permission_snapshot", query)).permissions.find(row => row.code === "access.manage").origin, "limited");
});

test("a global individual permission proposal takes effect only after a separate local approval", async () => {
  const f = await setup();
  const global = await actor("global");
  const person = await actor("professional", f.patient);
  const p_change = { capability: "access.manage", subjectUser: fixtures.professional.id,
    enabled: true, reviewedRole: "professional", confirmIndividual: true };
  const proposal = await rpc(global, "configure_patient_access", { ...packet(f.patient, p_change), p_kind: "capability" });
  assert.equal(proposal.status, "pending");
  const read = () => rpc(person, "patient_capabilities", { p_patient: f.patient });
  assert.equal((await read())["access.manage"], false);
  const decision = { ...packet(f.patient, p_change), p_kind: "capability", p_request_id: proposal.id, p_decision: "approve" };
  await actor("global", f.patient);
  assert.equal((await global.rpc("configure_patient_access", decision)).error?.code, "42501");
  const approved = await rpc(f.admin, "configure_patient_access", decision);
  assert.equal(approved.resolution.permission.actorId, fixtures.adminA.id);
  assert.equal(approved.resolution.permission.after, true);
  assert.equal((await read())["access.manage"], true);
});

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

test("reviewed proposal decisions use the reviewed facts and recover the same receipt without redoing the decision", async () => {
  const f = await setup(), global = await actor("global");
  const proposal = await rpc(global, "configure_patient_access", packet(f.patient, { archiveDays: 43 }));
  const review = async id => (await rpc(f.admin, "patient_governance_changes", {
    p_patient: f.patient, p_query: id, p_status: "all",
  })).changes[0];
  const send = (client, payload) => client.rpc("review_governance_proposal", payload);
  const reference = { p_patient: f.patient, p_proposal: proposal.id, p_key: randomUUID() };
  const approval = { ...reference, p_decision: "approve", p_reference: (await review(proposal.id)).reviewReference, p_invitation_hash: null };
  const lookup = { ...reference, p_decision: null, p_reference: null, p_invitation_hash: null };
  assert.equal((await send(global, approval)).error?.code, "42501");
  assert.equal((await send(f.admin, { ...approval, p_reference: "0".repeat(64) })).error?.code, "PT409");
  const [first, second] = await Promise.all([send(f.admin, approval), send(f.admin, approval)]);
  assert.ifError(first.error);
  assert.ifError(second.error);
  assert.deepEqual(first.data, second.data);
  assert.equal(first.data.status, "applied");
  const recovered = await send(f.admin, lookup);
  assert.ifError(recovered.error);
  assert.deepEqual(recovered.data, first.data);
  assert.equal((await send(f.admin, { ...approval, p_decision: "reject" })).error?.code, "PT409");
  const after = await review(proposal.id);
  assert.equal(after.currentVersion, 2);
  assert.equal(after.approved_by, fixtures.adminA.id);
  assert.ok(after.reviewerName);
  assert.equal(after.current.archiveDays, 43);

  const another = await rpc(global, "configure_patient_access", { ...packet(f.patient), p_version: 2 });
  const closed = { ...lookup, p_key: randomUUID(), p_proposal: another.id };
  const absent = await send(f.admin, closed);
  assert.ifError(absent.error);
  assert.equal(absent.data.state, "closed");
  const rejection = { ...closed, p_decision: "reject", p_reference: (await review(another.id)).reviewReference };
  assert.equal((await send(f.admin, rejection)).error?.code, "PT410");
  assert.equal((await review(another.id)).status, "pending");
  const rejected = await send(f.admin, { ...rejection, p_key: randomUUID() });
  assert.ifError(rejected.error);
  assert.equal(rejected.data.status, "rejected");
});

test("a reviewed membership proposal records approval separately from the recipient's acceptance", async () => {
  const f = await setup(), global = await actor("global");
  const proposal = await rpc(global, "configure_patient_access", { ...packet(f.patient), p_kind: "membership",
    p_change: { userId: fixtures.adminB.id, role: "professional" } });
  const { reviewReference } = (await rpc(f.admin, "patient_governance_changes", { p_patient: f.patient })).changes[0];
  const intent = { p_patient: f.patient, p_proposal: proposal.id, p_key: randomUUID(),
    p_decision: "approve", p_reference: reviewReference, p_invitation_hash: createHash("sha256").update(randomUUID()).digest("hex") };
  const approved = await rpc(f.admin, "review_governance_proposal", intent);
  assert.equal(approved.status, "awaiting_acceptance");
  assert.ok(approved.invitationId);
  assert.equal(approved.issuedLink, true);
  const recovered = await rpc(f.admin, "review_governance_proposal", {
    ...intent, p_decision: null, p_reference: null, p_invitation_hash: null,
  });
  assert.deepEqual(recovered, { ...approved, issuedLink: false });
  assert.equal(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminB.id)};`), "0");
});
