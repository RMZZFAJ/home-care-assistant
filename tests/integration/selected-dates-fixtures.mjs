import { randomUUID } from "node:crypto";
import { setup, rpc, actor } from "./v4-fixtures.mjs";
import { shiftWorker, shiftCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export const chosenDates = [
  "2100-01-15",
  "2100-01-18",
  "2100-01-22",
  "2100-01-26",
  "2100-01-30",
  "2100-02-03",
  "2100-02-07",
  "2100-02-11",
  "2100-02-15",
  "2100-02-19",
  "2100-02-23",
  "2100-02-27",
];
export async function selectedDatesFixture() {
  const f = await setup(),
    worker = await shiftWorker(f.patient);
  const name =
    "Profissional fictícia das datas escolhidas " + randomUUID().slice(0, 8);
  sql(
    `update public.profiles set full_name=${sqlLiteral(name)} where id=${sqlLiteral(worker.id)};`,
  );
  const type = await shiftCommand(f.admin, f.patient, "type", {
    name: "Noturno19–07 das datas escolhidas",
    startsLocal: "19:00",
    durationMinutes: 720,
  });
  return { ...f, worker, name, type };
}
export const dateBody = (f, dates = chosenDates) => ({
  professionalId: f.worker.id,
  shiftTypeId: f.type.id,
  shiftTypeVersion: f.type.version,
  timezone: "America/Sao_Paulo",
  recurrence: "dates",
  weekdays: [],
  dates,
  anchorDate: "2100-01-15",
  validUntil: "2100-02-28",
  notes: "Doze datas em quarenta e cinco dias; horário herdado do tipo",
});
export const datePacket = (f, dates = chosenDates) => ({
  p_patient: f.patient,
  p_action: "series",
  p_body: dateBody(f, dates),
  p_key: randomUUID(),
  p_version: null,
});
export const datesState = (f) =>
  sql(
    `select jsonb_build_object('series',(select jsonb_agg(to_jsonb(s) order by id) from public.shift_series s where care_recipient_id=${sqlLiteral(f.patient)}),'shifts',(select jsonb_agg(to_jsonb(s) order by id) from public.scheduled_shifts s where care_recipient_id=${sqlLiteral(f.patient)}),'events',(select jsonb_agg(to_jsonb(s) order by id) from public.shift_events s where care_recipient_id=${sqlLiteral(f.patient)}),'commands',(select jsonb_agg(to_jsonb(s) order by key) from private.schedule_commands s where care_recipient_id=${sqlLiteral(f.patient)}));`,
  );
export async function conflictingOtherPatient(f) {
  const other = await setup();
  sql(
    `insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(other.patient)},${sqlLiteral(f.worker.id)},'professional');`,
  );
  const type = await shiftCommand(other.admin, other.patient, "type", {
    name: "Tipo reservado de outro paciente",
    startsLocal: "19:00",
    durationMinutes: 720,
  });
  await shiftCommand(other.admin, other.patient, "series", {
    professionalId: f.worker.id,
    shiftTypeId: type.id,
    timezone: "America/Sao_Paulo",
    recurrence: "once",
    weekdays: [],
    anchorDate: "2100-02-11",
    validUntil: "2100-02-11",
    notes: "DADO_RESERVADO_OUTRO_PACIENTE",
  });
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(other.patient)} and user_id=(select id from public.profiles where id=${sqlLiteral((await f.admin.auth.getUser()).data.user.id)});`,
  );
  f.admin = await actor("adminA", f.patient);
  return other.patient;
}
export { rpc, actor, shiftCommand };
