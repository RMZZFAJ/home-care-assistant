import { z } from "zod";
import {
  initialScheduleType,
  scheduleCreationCommand,
  scheduleTypeFields,
} from "./creation";
import { editedCivilInstant, localMinute } from "./time";
import { scheduleBody } from "@/lib/validation/schedules";
import type { ScheduleWorkspace } from "@/types/schedules";

export const scheduleResourcePurposes = [
  "shift_type_edit",
  "schedule_series_end",
  "schedule_series_approve",
  "schedule_series_reject",
  "schedule_shift_edit",
  "schedule_change_approve",
  "schedule_change_reject",
  "schedule_change_close",
] as const;
export const scheduleResourcePurposeSchema = z.enum(scheduleResourcePurposes);
export type ScheduleResourcePurpose = z.infer<
  typeof scheduleResourcePurposeSchema
>;
export const isScheduleResourcePurpose = (
  value: string,
): value is ScheduleResourcePurpose =>
  scheduleResourcePurposeSchema.safeParse(value).success;
export const scheduleResourceLabels: Record<ScheduleResourcePurpose, string> = {
  shift_type_edit: "Alteração do tipo de plantão",
  schedule_series_end: "Encerramento de programação",
  schedule_series_approve: "Aprovação de programação",
  schedule_series_reject: "Rejeição de programação",
  schedule_shift_edit: "Alteração ou ausência de plantão",
  schedule_change_approve: "Aprovação de alteração",
  schedule_change_reject: "Rejeição de alteração",
  schedule_change_close: "Encerramento de proposta obsoleta",
};
export function scheduleResourceOutcomeLabel(value: {
  status: string | null;
  active: boolean | null;
}) {
  const labels: Record<string, string> = {
    published: "Programação publicada",
    proposed: "Programação proposta, aguardando decisão",
    pending: "Alteração proposta, aguardando decisão",
    approved: "Alteração aprovada",
    rejected: "Proposta rejeitada",
    cancelled: "Plantão cancelado",
    obsolete:
      "Proposta encerrada como obsoleta; nenhuma aprovação foi realizada",
  };
  return value.status === null
    ? value.active === false
      ? "Tipo indisponível para novas escalas"
      : "Tipo disponível para novas escalas"
    : (labels[value.status] ?? "Operação registrada");
}
const text = (max: number) => z.string().refine((v) => v.length <= max);
const selection = z.union([z.literal(""), z.uuid()]);
export const scheduleResourceFieldsSchema = z.discriminatedUnion("form", [
  scheduleTypeFields,
  z
    .object({
      form: z.literal("series"),
      operation: z.enum(["end_series", "approve", "reject"]),
      from: z.union([z.literal(""), z.iso.date()]),
      reason: text(1000),
    })
    .strict(),
  z
    .object({
      form: z.literal("shift"),
      operation: z.enum(["change", "propose_change", "cancel"]),
      professionalId: selection,
      start: text(16).refine((v) =>
        /^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/.test(v),
      ),
      end: text(16).refine((v) =>
        /^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/.test(v),
      ),
      notes: text(2000),
      reason: text(1000),
    })
    .strict(),
  z
    .object({
      form: z.literal("decision"),
      operation: z.enum(["approve", "reject", "close"]),
      reason: text(1000),
    })
    .strict(),
]);
export type ScheduleResourceFields = z.infer<
  typeof scheduleResourceFieldsSchema
>;
export function scheduleResourcePurpose(
  fields: ScheduleResourceFields,
): ScheduleResourcePurpose {
  if (fields.form === "type") return "shift_type_edit";
  if (fields.form === "shift") return "schedule_shift_edit";
  if (fields.form === "series")
    return fields.operation === "end_series"
      ? "schedule_series_end"
      : fields.operation === "approve"
        ? "schedule_series_approve"
        : "schedule_series_reject";
  return fields.operation === "approve"
    ? "schedule_change_approve"
    : fields.operation === "reject"
      ? "schedule_change_reject"
      : "schedule_change_close";
}
const id = z.uuid(),
  version = z.number().int().positive().max(2147483647),
  instant = z.iso.datetime({ offset: true });
const shift = z
  .object({
    id,
    series_id: id,
    professional_id: id,
    professional_name: z.string(),
    shift_type_id: id,
    type_name: z.string(),
    starts_at: instant,
    ends_at: instant,
    timezone: z.string(),
    status: z.string(),
    version,
    notes: z.string(),
    is_exception: z.boolean(),
  })
  .passthrough();
const snapshot = z
  .object({
    professional_id: id,
    starts_at: instant,
    ends_at: instant,
    timezone: z.string(),
    notes: z.string().nullable(),
    professional_name: z.string().nullable().optional(),
    type_name: z.string().nullable().optional(),
    snapshot_source: z.string().optional(),
  })
  .passthrough();
export const scheduleResourceWorkspaceSchema = z.object({
  types: z.array(
    z
      .object({
        id,
        name: z.string(),
        starts_local: z.string(),
        duration_minutes: z.number().int(),
        is_active: z.boolean(),
        version,
      })
      .passthrough(),
  ),
  professionals: z.array(z.object({ id, name: z.string() })),
  shifts: z.array(shift),
  series: z.array(
    z
      .object({
        id,
        professional_id: id,
        professional_name: z.string(),
        shift_type_id: id,
        type_name: z.string(),
        timezone: z.string(),
        recurrence: z.string(),
        specific_dates: z.array(z.iso.date()).optional(),
        weekdays: z.array(z.number()),
        anchor_date: z.iso.date(),
        valid_until: z.iso.date(),
        ended_on: z.iso.date().nullable(),
        status: z.string(),
        version,
        notes: z.string(),
        occurrences: z.array(shift),
        publication_blocked: z.boolean(),
      })
      .passthrough(),
  ),
  changes: z.array(
    z
      .object({
        id,
        shift_id: id,
        professional_id: id,
        proposed_professional_id: id,
        starts_at: instant,
        ends_at: instant,
        reason: z.string(),
        status: z.string(),
        shift_version: version,
        version,
        created_by: id.nullable(),
        source_snapshot: snapshot.nullable(),
        proposed_snapshot: snapshot.nullable(),
        notes: z.string().nullable(),
        is_stale: z.boolean(),
        current_professional_name: z.string(),
        current_proposed_professional_name: z.string(),
        bal_impact: z.object({
          has_assignment: z.boolean(),
          changes_window: z.boolean(),
          requires_family_decision: z.boolean(),
          assignment_deadline: instant.nullable(),
        }),
      })
      .passthrough(),
  ),
  events: z.array(
    z.object({
      id,
      action: z.string(),
      reason: z.string(),
      created_at: instant,
      actor_name_snapshot: z.string().nullable(),
    }),
  ),
});
export const scheduleResourceReferenceSchema = z
  .object({
    patientId: id,
    purpose: scheduleResourcePurposeSchema,
    targetResourceId: id,
    hash: z.string().regex(/^[0-9a-f]{64}$/),
    version,
    sourceVersion: version.nullable(),
    workspace: scheduleResourceWorkspaceSchema,
  })
  .strict();
export type ScheduleResourceReference = z.infer<
  typeof scheduleResourceReferenceSchema
>;
export const scheduleResourceContentSchema = z
  .object({
    scheduleAction: scheduleResourceFieldsSchema,
    referenceHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    referenceVersion: version.nullable(),
  })
  .strict();
export const scheduleResourceReadContentSchema =
  scheduleResourceContentSchema.extend({
    reference: scheduleResourceReferenceSchema.nullable().optional(),
  });
export type ScheduleResourceContent = z.infer<
  typeof scheduleResourceReadContentSchema
>;

export function initialScheduleResource(
  purpose: ScheduleResourcePurpose,
  target: string,
  data: ScheduleWorkspace | null,
  today: string,
  mayPublish: boolean,
): ScheduleResourceFields {
  if (purpose === "shift_type_edit")
    return initialScheduleType(data?.types.find((t) => t.id === target));
  if (purpose === "schedule_shift_edit") {
    const s = data?.shifts.find((s) => s.id === target);
    return {
      form: "shift",
      operation: mayPublish ? "change" : "propose_change",
      professionalId: s?.professional_id ?? "",
      start: s ? localMinute(s.starts_at, s.timezone) : "",
      end: s ? localMinute(s.ends_at, s.timezone) : "",
      notes: s?.notes ?? "",
      reason: "",
    };
  }
  if (purpose.startsWith("schedule_series_"))
    return {
      form: "series",
      operation:
        purpose === "schedule_series_end"
          ? "end_series"
          : purpose === "schedule_series_approve"
            ? "approve"
            : "reject",
      from: today,
      reason: "",
    };
  return {
    form: "decision",
    operation:
      purpose === "schedule_change_approve"
        ? "approve"
        : purpose === "schedule_change_reject"
          ? "reject"
          : "close",
    reason: "",
  };
}
/** The action is part of the saved human intent; a new permission cannot promote a proposal. */
export function scheduleResourceCommand(
  fields: ScheduleResourceFields,
  target: string,
  reference: ScheduleResourceReference | null,
) {
  if (fields.form === "type") {
    const c = scheduleCreationCommand(fields);
    if (c.action !== "type") throw Error("Confira o tipo de plantão.");
    return scheduleBody.parse({ ...c, body: { ...c.body, id: target } });
  }
  if (fields.form === "series")
    return scheduleBody.parse({
      action: fields.operation,
      body: {
        id: target,
        ...(fields.operation === "end_series" ? { fromDate: fields.from } : {}),
        ...(fields.reason ? { reason: fields.reason } : {}),
      },
    });
  if (fields.form === "decision")
    return scheduleBody.parse({
      action: fields.operation === "close" ? "close_obsolete" : "decide_change",
      body: {
        id: target,
        ...(fields.operation !== "close"
          ? { approve: fields.operation === "approve" }
          : {}),
        ...(fields.reason ? { reason: fields.reason } : {}),
      },
    });
  if (fields.operation === "cancel")
    return scheduleBody.parse({
      action: "cancel",
      body: { id: target, reason: fields.reason },
    });
  const source = reference?.workspace.shifts.find((s) => s.id === target);
  if (!source) throw Error("Atualize e compare a referência deste plantão.");
  return scheduleBody.parse({
    action: fields.operation,
    body: {
      id: target,
      professionalId: fields.professionalId,
      startsAt: editedCivilInstant(
        fields.start,
        source.starts_at,
        source.timezone,
      ),
      endsAt: editedCivilInstant(fields.end, source.ends_at, source.timezone),
      notes: fields.notes,
      reason: fields.reason,
    },
  });
}

/** This checks response identity; operational authorization remains in the database. */
export function checkScheduleResourceReference(
  reference: ScheduleResourceReference,
  scope: {
    patientId: string;
    purpose: ScheduleResourcePurpose;
    targetResourceId: string;
  },
) {
  const w = reference.workspace;
  const groups = [w.types, w.series, w.shifts, w.changes];
  const index =
    scope.purpose === "shift_type_edit"
      ? 0
      : scope.purpose.startsWith("schedule_series_")
        ? 1
        : scope.purpose === "schedule_shift_edit"
          ? 2
          : 3;
  const row = groups[index][0];
  if (
    reference.patientId !== scope.patientId ||
    reference.purpose !== scope.purpose ||
    reference.targetResourceId !== scope.targetResourceId ||
    groups.some((g, i) => g.length !== (i === index ? 1 : 0)) ||
    !row ||
    row.id !== scope.targetResourceId ||
    row.version !== reference.version ||
    w.professionals.length ||
    w.events.length ||
    (index === 3) !== (reference.sourceVersion !== null)
  )
    throw Error(
      "A referência operacional não corresponde ao recurso consultado.",
    );
  return reference;
}
