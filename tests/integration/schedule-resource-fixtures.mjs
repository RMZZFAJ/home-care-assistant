import { randomUUID } from "node:crypto";
import { setup, rpc, fixtures, actor, env } from "./v4-fixtures.mjs";
import { shiftWorker, shiftCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const resourcePurposes = [
  "shift_type_edit",
  "schedule_series_end",
  "schedule_series_approve",
  "schedule_series_reject",
  "schedule_shift_edit",
  "schedule_change_approve",
  "schedule_change_reject",
  "schedule_change_close",
];
export async function resourceFixture(
  purpose = "shift_type_edit",
  operation = "change",
) {
  const f = await setup(),
    type = await shiftCommand(f.admin, f.patient, "type", {
      name: "Tipo nativo preservado",
      startsLocal: "19:00:37",
      durationMinutes: 720,
    });
  let target = type.id,
    worker,
    second,
    series,
    shift,
    proposal;
  const day = "2100-04-01",
    reason = "Motivo privado de quem prepara a operação";
  if (purpose !== "shift_type_edit") {
    worker = await shiftWorker(f.patient);
    const proposed = [
      "schedule_series_approve",
      "schedule_series_reject",
    ].includes(purpose);
    series = await shiftCommand(
      proposed ? worker.client : f.admin,
      f.patient,
      "series",
      {
        professionalId: worker.id,
        shiftTypeId: type.id,
        timezone: "UTC",
        recurrence: "once",
        weekdays: [],
        anchorDate: day,
        validUntil: day,
        notes: "Observação nativa original",
      },
    );
    const data = await rpc(f.admin, "schedule_workspace", {
      p_patient: f.patient,
      p_from: day,
      p_until: day,
    });
    shift = data.shifts.find((s) => s.series_id === series.id);
    target = purpose.startsWith("schedule_series_") ? series.id : shift.id;
    if (purpose.startsWith("schedule_change_")) {
      second = await shiftWorker(f.patient);
      proposal = await shiftCommand(
        worker.client,
        f.patient,
        "propose_change",
        {
          id: shift.id,
          professionalId: second.id,
          startsAt: new Date(
            Date.parse(shift.starts_at) + 3600000,
          ).toISOString(),
          endsAt: new Date(Date.parse(shift.ends_at) + 3600000).toISOString(),
          notes: "Observação de quem propôs",
          reason: "Troca proposta com autoria própria",
        },
        shift.version,
      );
      target = proposal.id;
      if (purpose === "schedule_change_close")
        await shiftCommand(
          f.admin,
          f.patient,
          "change",
          {
            id: shift.id,
            notes: "Origem avançada antes do fechamento",
            reason: "Atualizar origem para provar encerramento obsoleto",
          },
          shift.version,
        );
    }
  }
  const scope = { p_patient: f.patient, p_purpose: purpose, p_target: target };
  const source = await rpc(
      f.admin,
      "schedule_resource_preparation_reference",
      scope,
    ),
    reference = source.reference;
  let fields, command;
  if (purpose === "shift_type_edit") {
    fields = {
      form: "type",
      name: "Tipo alterado por preparação",
      start: "19:00:37",
      duration: "720",
      active: false,
    };
    command = {
      action: "type",
      body: {
        id: target,
        name: fields.name,
        startsLocal: fields.start,
        durationMinutes: 720,
        active: false,
      },
    };
  } else if (purpose.startsWith("schedule_series_")) {
    const action =
      purpose === "schedule_series_end"
        ? "end_series"
        : purpose === "schedule_series_approve"
          ? "approve"
          : "reject";
    fields = { form: "series", operation: action, from: day, reason };
    command = {
      action,
      body: {
        id: target,
        ...(action === "end_series" ? { fromDate: day } : {}),
        reason,
      },
    };
  } else if (purpose === "schedule_shift_edit") {
    const native = reference.workspace.shifts[0];
    fields = {
      form: "shift",
      operation,
      professionalId: worker.id,
      start: day + "T19:00",
      end: "2100-04-02T07:00",
      notes: "Minha observação privada",
      reason,
    };
    command =
      operation === "cancel"
        ? { action: "cancel", body: { id: target, reason } }
        : {
            action: operation,
            body: {
              id: target,
              professionalId: worker.id,
              startsAt: native.starts_at,
              endsAt: native.ends_at,
              notes: fields.notes,
              reason,
            },
          };
  } else {
    const op =
      purpose === "schedule_change_approve"
        ? "approve"
        : purpose === "schedule_change_reject"
          ? "reject"
          : "close";
    fields = { form: "decision", operation: op, reason };
    command = {
      action: op === "close" ? "close_obsolete" : "decide_change",
      body: {
        id: target,
        ...(op !== "close" ? { approve: op === "approve" } : {}),
        reason,
      },
    };
  }
  return {
    ...f,
    type,
    worker,
    second,
    series,
    shift,
    proposal,
    day,
    purpose,
    target,
    scope,
    fields,
    command,
    reference,
    content: {
      scheduleAction: fields,
      referenceHash: reference.hash,
      referenceVersion: reference.version,
    },
  };
}
export const readResource = (f, client = f.admin) =>
  rpc(client, "schedule_resource_preparation_context", f.scope);
export const saveResource = (
  f,
  saved = null,
  content = f.content,
  client = f.admin,
  key = randomUUID(),
  action = "save",
) =>
  rpc(client, "schedule_resource_preparation_command", {
    ...f.scope,
    p_id: saved?.id ?? null,
    p_expected: saved?.revision ?? null,
    p_key: key,
    p_body: {
      action,
      ...(action === "save"
        ? { content, navigation: { version: 1, stage: "schedule_resource" } }
        : {}),
    },
  });
export const resourcePacket = (f, saved, key = randomUUID()) => ({
  ...f.scope,
  p_id: saved.id,
  p_expected: saved.revision,
  p_key: key,
  p_body: {
    command: f.command,
    expectedVersion: f.reference.version,
    sourceVersion: f.reference.sourceVersion,
    referenceHash: f.reference.hash,
  },
});
export const nativeFacts = (f) =>
  sql(
    `select jsonb_build_object('types',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.shift_types t where care_recipient_id=${q(f.patient)}),'series',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.shift_series t where care_recipient_id=${q(f.patient)}),'shifts',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.scheduled_shifts t where care_recipient_id=${q(f.patient)}),'changes',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.shift_change_requests t where care_recipient_id=${q(f.patient)}),'events',(select count(*) from public.shift_events where care_recipient_id=${q(f.patient)}),'commands',(select count(*) from private.schedule_commands where care_recipient_id=${q(f.patient)}))::text`,
  );
export const documentFacts = (f) =>
  sql(
    `select jsonb_build_object('documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}),'stock',(select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)}),'versions',(select count(*) from public.document_events e join public.operational_documents d on d.id=e.document_id where d.care_recipient_id=${q(f.patient)}))::text`,
  );
export { rpc, fixtures, actor, env, sql, q, shiftCommand, randomUUID };
