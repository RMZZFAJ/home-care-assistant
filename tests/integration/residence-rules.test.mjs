import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const read = "reviewed_residence_rule_read";
const write = "reviewed_residence_rule_command";
const scope = (patient, purpose, mode = "patient") => ({ p_patient: patient, p_purpose: purpose, p_mode: mode });
const reference = (client, args, selection, option) => rpc(client, read, { ...args, p_selection: selection, p_option: option });
const packet = (args, fields, reviewed) => ({ ...args, p_key: randomUUID(), p_fields: fields, p_reference_hash: reviewed.hash });
const recover = input => ({ ...input, p_fields: null, p_reference_hash: null });
const versionedPacket = (args, change, expectedVersion) =>
  ({ ...args, p_key: randomUUID(), p_fields: { change, expectedVersion }, p_reference_hash: null });
const governance = (client, patient) => rpc(client, "patient_governance", { p_patient: patient });

test("reviewed threshold preserves both stock ledgers, applies to one custody and records a single outcome", async () => {
  const f = await setup(), product = f.products[0];
  const args = scope(f.patient, "alertRule");
  const before = () => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by m.id)::text, '[]') from public.stock_movements m where care_recipient_id=${q(f.patient)};`);
  const ledger = before();
  const baseline = await reference(f.admin, args, product, "FAMILY");
  const fields = { productId: product, location: "FAMILY", lowThreshold: "21", criticalThreshold: "10", isEnabled: true };
  assert.equal((await f.admin.rpc(write, packet(args, { ...fields, lowThreshold: "1.5" }, baseline))).error?.code, "22023");
  const input = packet(args, fields, baseline);
  const [first, second] = await Promise.all([rpc(f.admin, write, input), rpc(f.admin, write, input)]);
  assert.deepEqual(first, second);
  assert.equal(first.state, "recorded");
  assert.deepEqual(await rpc(f.admin, write, recover(input)), first);
  assert.equal((await f.admin.rpc(write, packet(args, { ...fields, lowThreshold: "30" }, baseline))).error?.code, "PT409");
  const result = await rpc(f.admin, read, args);
  assert.deepEqual(result.rules, [{ ...fields, id: first.outcome.resourceId }]);
  assert.equal(before(), ledger);
  assert.equal(sql(`select count(*) from public.audit_events where action='stock.alert.configured' and metadata->>'care_recipient_id'=${q(f.patient)};`), "1");

  const team = await reference(f.admin, args, product, "CARE_TEAM");
  const late = packet(args, { ...fields, location: "CARE_TEAM" }, team);
  assert.equal((await rpc(f.admin, write, recover(late))).state, "closed");
  assert.equal((await rpc(f.admin, write, late)).state, "closed");
  assert.equal((await rpc(f.admin, read, args)).rules.length, 1);
});

test("a reviewed recipient remains unverified and global changes need an independent local decision", async () => {
  const f = await setup(), userId = fixtures.professional.id;
  const local = scope(f.patient, "notificationRecipient");
  const globalScope = scope(f.patient, "notificationRecipient", "global");
  const global = await actor("global");
  const before = await reference(global, globalScope, userId, "email");
  const fields = { recipientUserId: userId, recipientGroup: "family", channel: "email", destination: "pendente@example.invalid",
    isEnabled: true, includeTeamAlerts: true };
  const input = packet(globalScope, fields, before);
  const proposed = await rpc(global, write, input);
  assert.equal(proposed.outcome.kind, "proposal");
  assert.deepEqual(await rpc(global, write, recover(input)), proposed);
  assert.equal((await rpc(f.admin, read, local)).rules.length, 0);
  assert.equal((await f.admin.rpc(write, recover(input))).error?.code, "42501");
  const decision = { p_patient: f.patient, p_kind: "administration", p_change: {}, p_key: randomUUID(),
    p_version: before.version, p_request_id: proposed.outcome.proposalId, p_decision: "approve" };
  assert.equal((await global.rpc("configure_patient_access", decision)).error?.code, "42501");
  assert.equal((await rpc(f.admin, "configure_patient_access", decision)).status, "applied");
  const saved = (await rpc(f.admin, read, local)).rules[0];
  assert.equal(saved.destinationVerified, false);
  assert.equal(saved.memberActive, true);
  assert.equal(saved.includeTeamAlerts, true);
  assert.equal(saved.destination, fields.destination);
  assert.equal(sql(`select count(*) from public.requisition_notifications where care_recipient_id=${q(f.patient)} and recipient_user_id=${q(userId)};`), "0");

  const another = await setup();
  assert.equal((await another.admin.rpc(read, local)).error?.code, "42501");
  const professional = await actor("professional", f.patient);
  assert.equal((await professional.rpc(read, local)).error?.code, "42501");
});

test("a reviewed policy recovers its exact result after a later change and fences an unrecorded intent", async () => {
  const { admin, patient } = await setup();
  try {
    const before = (await governance(admin, patient)).data.version;
    const input = versionedPacket(scope(patient, "settings"), { reminderHours: 7 }, before);
    const [first, repeated] = await Promise.all([rpc(admin, write, input), rpc(admin, write, input)]);
    assert.deepEqual(repeated, first);
    assert.equal(first.state, "recorded");
    assert.equal(first.outcome.kind, "policy");
    assert.equal(first.outcome.action, "settings");
    assert.equal(sql(`select count(*) from public.access_change_requests where id=${q(first.outcome.recordId)} and care_recipient_id=${q(patient)};`), "1");

    const current = (await governance(admin, patient)).data.version;
    assert.equal(current, before + 1);
    assert.equal((await admin.rpc(write, versionedPacket(scope(patient, "settings"), { reminderHours: 8 }, before))).error?.code, "PT409");
    const next = versionedPacket(scope(patient, "settings"), { reminderHours: 9 }, current);
    assert.equal((await rpc(admin, write, next)).state, "recorded");
    assert.deepEqual(await rpc(admin, write, recover(input)), first);
    assert.equal((await admin.rpc(write, { ...input, p_fields: next.p_fields })).error?.code, "PT409");
    const late = versionedPacket(scope(patient, "settings"), { reminderHours: 10 }, current + 1);
    assert.equal((await rpc(admin, write, recover(late))).state, "closed");
    assert.equal((await rpc(admin, write, late)).state, "closed");
    assert.equal((await governance(admin, patient)).data.version, current + 1);
  } finally {
    sql(`update public.care_recipients set is_active=false where id=${q(patient)};`);
  }
});

test("a reviewed global notice keeps its proposal receipt through a local decision", async () => {
  const { admin, patient } = await setup();
  try {
    const global = await actor("global");
    const version = (await governance(admin, patient)).data.version;
    const change = { event: "req.issued", role: "family", channels: ["internal"], includePdf: true, cooldownMinutes: 15 };
    const input = versionedPacket(scope(patient, "notification_rule", "global"), change, version);
    const proposal = await rpc(global, write, input);
    assert.equal(proposal.state, "recorded");
    assert.equal(proposal.outcome.kind, "proposal");
    assert.equal((await governance(admin, patient)).data.version, version);
    assert.equal((await admin.rpc(write, recover(input))).error?.code, "42501");
    assert.equal((await rpc(admin, write, { ...recover(input), p_mode: "patient" })).state, "closed");

    const decision = { p_patient: patient, p_kind: "administration", p_change: {}, p_key: randomUUID(),
      p_version: version, p_request_id: proposal.outcome.proposalId, p_decision: "approve" };
    assert.equal((await global.rpc("configure_patient_access", decision)).error?.code, "42501");
    assert.equal((await rpc(admin, "configure_patient_access", decision)).status, "applied");
    assert.deepEqual(await rpc(global, write, recover(input)), proposal);
    assert.equal((await governance(admin, patient)).data.version, version + 1);
  } finally {
    sql(`update public.care_recipients set is_active=false where id=${q(patient)};`);
  }
});
