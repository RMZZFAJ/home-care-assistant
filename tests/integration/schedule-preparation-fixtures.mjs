import { randomUUID } from "node:crypto";
import { setup, rpc, fixtures, actor } from "./v4-fixtures.mjs";
import { shiftWorker, shiftCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export async function schedulePreparationFixture(
  purpose = "shift_type_create",
  recurrence = "once",
) {
  const f = await setup();
  let fields = {
      form: "type",
      name: "Tipo privado fictício",
      start: "07:00",
      duration: "720",
      active: false,
    },
    command = {
      action: "type",
      body: {
        name: fields.name,
        startsLocal: "07:00",
        durationMinutes: 720,
        active: false,
      },
    },
    pro,
    typ;
  if (purpose === "schedule_series_create") {
    pro = await shiftWorker(f.patient);
    typ = await shiftCommand(f.admin, f.patient, "type", {
      name: "Tipo para programação privada",
      startsLocal: "07:00",
      durationMinutes: 720,
    });
    fields = {
      form: "series",
      professionalId: pro.id,
      shiftTypeId: typ.id,
      shiftTypeVersion: typ.version,
      recurrence,
      weekdays: [1, 3, 5],
      dates: ["2100-03-02", "2100-03-04"],
      cycle: "12x36",
      from: "2100-03-01",
      until: "2100-03-05",
      timezone: "UTC",
      notes: "Texto pessoal fictício",
      reason: "",
    };
    command = {
      action: "series",
      body: {
        professionalId: pro.id,
        shiftTypeId: typ.id,
        timezone: "UTC",
        recurrence,
        weekdays: recurrence === "weekly" ? [1, 3, 5] : [],
        anchorDate: fields.from,
        validUntil: recurrence === "once" ? fields.from : fields.until,
        notes: fields.notes,
        ...(recurrence === "dates"
          ? { dates: fields.dates, shiftTypeVersion: typ.version }
          : {}),
        ...(recurrence === "cycle" ? { workHours: 12, restHours: 36 } : {}),
      },
    };
  }
  return {
    ...f,
    pro,
    typ,
    fields,
    content: { schedule: fields },
    command,
    purpose,
    scope: { p_patient: f.patient, p_purpose: purpose },
  };
}
export const saveSchedulePreparation = (
  f,
  saved = null,
  content = f.content,
  client = f.admin,
  key = randomUUID(),
  action = "save",
) =>
  rpc(client, "schedule_preparation_command", {
    ...f.scope,
    p_id: saved?.id ?? null,
    p_expected: saved?.revision ?? null,
    p_key: key,
    p_body: {
      action,
      ...(action === "save"
        ? { content, navigation: { version: 1, stage: "schedule_creation" } }
        : {}),
    },
  });
export const schedulePreparationCommit = (
  f,
  saved,
  key = randomUUID(),
  body = f.command,
) => ({
  ...f.scope,
  p_id: saved.id,
  p_expected: saved.revision,
  p_key: key,
  p_body: body,
});
export const scheduleNativeFacts = (f) =>
  sql(
    `select jsonb_build_object('types',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.shift_types t where care_recipient_id=${q(f.patient)}),'series',(select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]'::jsonb) from public.shift_series s where care_recipient_id=${q(f.patient)}),'shifts',(select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]'::jsonb) from public.scheduled_shifts s where care_recipient_id=${q(f.patient)}),'events',(select count(*) from public.shift_events where care_recipient_id=${q(f.patient)}),'commands',(select count(*) from private.schedule_commands where care_recipient_id=${q(f.patient)}))::text`,
  );
export const scheduleDocumentFacts = (f) =>
  sql(
    `select jsonb_build_object('documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}),'stock',(select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)}),'versions',(select count(*) from public.document_events e join public.operational_documents d on d.id=e.document_id where d.care_recipient_id=${q(f.patient)}))::text`,
  );
export { rpc, fixtures, actor, sql, q, shiftCommand };
