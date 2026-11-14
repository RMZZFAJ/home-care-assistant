import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc } from "./v4-fixtures.mjs";
import { shiftWorker, shiftCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

async function fixture() {
  const base = await setup(), first = await shiftWorker(base.patient), second = await shiftWorker(base.patient);
  const type = await shiftCommand(base.admin, base.patient, "type", { name: "Plantão de decisão fictícia", startsLocal: "19:00", durationMinutes: 720 });
  const body = { professionalId: first.id, shiftTypeId: type.id, timezone: "America/Sao_Paulo", recurrence: "once", weekdays: [], anchorDate: "2100-06-01", validUntil: "2100-06-01", notes: "Notas preservadas da programação" };
  return { ...base, first, second, type, body };
}

test("an ended proposed series cannot publish its cancelled occurrences", async () => {
  const f = await fixture();
  const proposed = await shiftCommand(f.first.client, f.patient, "series", f.body);
  const ended = await shiftCommand(f.admin, f.patient, "end_series", { id: proposed.id, fromDate: "2100-06-01", reason: "Proposta encerrada antes da publicação" }, proposed.version);
  let approval, rejected = false;
  try { approval = await shiftCommand(f.admin, f.patient, "approve", { id: proposed.id }, ended.version); }
  catch (error) { assert.match(error.message, /stale|invalid proposal/); rejected = true; }
  // The negative baseline run may reproduce the defect. Leave its synthetic
  // occurrence formally cancelled, with real administrator/event provenance.
  if (approval) {
    const workspace = await rpc(f.admin, "schedule_workspace", { p_patient: f.patient, p_from: "2100-06-01", p_until: "2100-06-02" });
    for (const shift of workspace.shifts.filter((s) => s.series_id === proposed.id && s.status === "published"))
      await shiftCommand(f.admin, f.patient, "cancel", { id: shift.id, reason: "Encerramento do controle negativo fictício" }, shift.version);
  }
  assert.equal(rejected, true, "ended proposal reopened cancelled occurrences");
  assert.equal(Number(sql(`select count(*) from public.scheduled_shifts where series_id=${sqlLiteral(proposed.id)} and status='published';`)), 0);
});

test("schedule decisions preserve the displayed proposal version and both identities under concurrency", async () => {
  const f = await fixture();
  const series = await shiftCommand(f.admin, f.patient, "series", f.body);
  let workspace = await rpc(f.admin, "schedule_workspace", { p_patient: f.patient, p_from: "2100-06-01", p_until: "2100-06-02" });
  const shift = workspace.shifts.find((s) => s.series_id === series.id);
  const proposal = await shiftCommand(f.first.client, f.patient, "propose_change", { id: shift.id, professionalId: f.second.id, startsAt: shift.starts_at, endsAt: shift.ends_at, reason: "Substituição combinada entre profissionais", notes: "Notas próprias da proposta" }, shift.version);
  assert.equal(proposal.source_snapshot.professional_id, f.first.id);
  assert.equal(proposal.proposed_snapshot.professional_id, f.second.id);
  assert.equal(proposal.proposed_snapshot.notes, "Notas próprias da proposta");
  assert.equal(proposal.created_by, f.first.id);
  workspace = await rpc(f.admin, "schedule_workspace", { p_patient: f.patient, p_from: "2100-07-01", p_until: "2100-07-07" });
  const displayed = workspace.changes.find((c) => c.id === proposal.id);
  assert.equal(displayed.source_snapshot.starts_at, shift.starts_at, "summary must not depend on the current calendar window");
  assert.equal(displayed.bal_impact.requires_family_decision, false);
  assert.equal(displayed.version, proposal.version);
  const missingVersion = await f.admin.rpc("schedule_command", { p_patient: f.patient, p_action: "decide_change", p_body: { id: proposal.id, approve: true }, p_key: randomUUID(), p_version: null });
  assert.ok(missingVersion.error);
  const secondAdmin = await actor("global", f.patient);
  const results = await Promise.all([f.admin, secondAdmin].map((client) => client.rpc("schedule_command", { p_patient: f.patient, p_action: "decide_change", p_body: { id: proposal.id, approve: true, reason: "Decisão própria do administrador" }, p_key: randomUUID(), p_version: displayed.version })));
  assert.equal(results.filter((result) => !result.error).length, 1);
  assert.equal(results.filter((result) => result.error).length, 1);
  const stored = JSON.parse(sql(`select json_build_object('person',professional_id,'notes',notes) from public.scheduled_shifts where id=${sqlLiteral(shift.id)};`));
  assert.equal(stored.person, f.second.id);
  assert.equal(stored.notes, "Notas próprias da proposta");
  assert.equal(Number(sql(`select count(*) from public.shift_events where shift_id=${sqlLiteral(shift.id)} and action='schedule.change_decided';`)), 1);
});

test("a superseded change has an explicit obsolete terminal without rewriting the shift", async () => {
  const f = await fixture();
  const series = await shiftCommand(f.admin, f.patient, "series", f.body);
  const workspace = await rpc(f.admin, "schedule_workspace", { p_patient: f.patient, p_from: "2100-06-01", p_until: "2100-06-02" });
  const shift = workspace.shifts.find((s) => s.series_id === series.id);
  const proposal = await shiftCommand(f.first.client, f.patient, "propose_change", { id: shift.id, professionalId: f.second.id, reason: "Proposta anterior à mudança da agenda" }, shift.version);
  const changed = await shiftCommand(f.admin, f.patient, "change", { id: shift.id, reason: "Mudança posterior da agenda", notes: "Notas da mudança válida" }, shift.version);
  const result = await shiftCommand(f.admin, f.patient, "close_obsolete", { id: proposal.id, reason: "O plantão mudou desde a proposta" }, proposal.version);
  assert.equal(result.status, "obsolete");
  assert.equal(result.version, proposal.version + 1);
  assert.equal(result.created_by, f.first.id);
  assert.ok(result.obsolete_reason);
  const after = JSON.parse(sql(`select to_jsonb(s) from public.scheduled_shifts s where id=${sqlLiteral(shift.id)};`));
  assert.equal(after.version, changed.version);
  assert.equal(after.professional_id, f.first.id);
  assert.equal(after.notes, "Notas da mudança válida");
});

test("a disconnected professional cannot gain future shifts through an old proposal", async () => {
  const f = await fixture();
  const proposed = await shiftCommand(f.first.client, f.patient, "series", f.body);
  await rpc(f.admin, "admin_set_membership_status", { p_care_recipient_id: f.patient, p_user_id: f.first.id, p_status: "revoked" });
  const result = await f.admin.rpc("schedule_command", { p_patient: f.patient, p_action: "approve", p_body: { id: proposed.id }, p_key: randomUUID(), p_version: proposed.version });
  if (!result.error) await shiftCommand(f.admin, f.patient, "end_series", { id: proposed.id, fromDate: f.body.anchorDate, reason: "Encerramento do controle negativo após desligamento" }, result.data.version);
  assert.ok(result.error, "old proposal published shifts for a disconnected professional");
  const rejected = await shiftCommand(f.admin, f.patient, "reject", { id: proposed.id, reason: "Profissional desligado; preservar proposta sem publicar" }, proposed.version);
  assert.equal(rejected.status, "rejected");
});

test("an administrator may cancel a future shift of a disconnected professional without impersonating them", async () => {
  const f = await fixture();
  const series = await shiftCommand(f.admin, f.patient, "series", f.body);
  const workspace = await rpc(f.admin, "schedule_workspace", { p_patient: f.patient, p_from: "2100-06-01", p_until: "2100-06-02" });
  const shift = workspace.shifts.find((item) => item.series_id === series.id);
  await rpc(f.admin, "admin_set_membership_status", { p_care_recipient_id: f.patient, p_user_id: f.first.id, p_status: "revoked" });
  const result = await shiftCommand(f.admin, f.patient, "cancel", { id: shift.id, reason: "Cancelar tarefa futura após desligamento" }, shift.version);
  assert.equal(result.status, "cancelled");
  assert.equal(result.professional_id, f.first.id);
  const event = JSON.parse(sql(`select to_jsonb(e) from public.shift_events e where shift_id=${sqlLiteral(shift.id)} and action='schedule.cancel' order by created_at desc limit 1;`));
  assert.notEqual(event.actor_id, f.first.id);
  assert.equal(event.actor_name_snapshot, "Teste adminA");
});
