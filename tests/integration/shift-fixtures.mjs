import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
export async function shiftWorker(patient, role = "professional") {
  const service = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `shift-${randomUUID()}@example.invalid`;
  const created = await service.auth.admin.createUser({ email, password: fixturePassword, email_confirm: true });
  assert.ifError(created.error);
  const id = created.data.user.id;
  sql(`insert into public.profiles(id,full_name,role,status) values(${sqlLiteral(id)},'Profissional fictício de plantão','professional','active') on conflict(id) do nothing;
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(patient)},${sqlLiteral(id)},${sqlLiteral(role)});`);
  const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.ifError((await client.auth.signInWithPassword({ email, password: fixturePassword })).error);
  await rpc(client, "select_active_context", { p_patient: patient });
  return { id, email, client };
}
export const shiftCommand = (client, patient, action, body, version = null) => rpc(client, "schedule_command", { p_patient: patient, p_action: action, p_body: body, p_version: version, p_key: randomUUID() });
export const balanceCommand = (client, patient, action, body, version = null) => rpc(client, "balance_command", { p_patient: patient, p_action: action, p_body: body, p_version: version, p_key: randomUUID() });
export const localToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
export function dayOffset(date, offset) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); }
export async function balanceSetup() {
  const base = await setup(), pro = await shiftWorker(base.patient), today = localToday();
  const type = await shiftCommand(base.admin, base.patient, "type", { name: "Plantão diário fictício", startsLocal: "00:00", durationMinutes: 1440 });
  await shiftCommand(base.admin, base.patient, "series", { professionalId: pro.id, shiftTypeId: type.id, timezone: "America/Sao_Paulo", recurrence: "weekly", weekdays: [0,1,2,3,4,5,6], anchorDate: today, validUntil: dayOffset(today, 4), notes: "Homologação local" });
  await balanceCommand(base.admin, base.patient, "configure", { enabled: true, timezone: "America/Sao_Paulo", weekday: new Date(today + "T12:00:00Z").getUTCDay(), shiftTypeId: type.id, startsOn: today, reason: "Ativação isolada de teste" });
  return { ...base, pro, today, type };
}
