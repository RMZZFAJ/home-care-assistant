import { z } from "zod";
import {
  scheduleResourcePurposeSchema,
  scheduleResourceFieldsSchema,
  scheduleResourceContentSchema,
  scheduleResourcePurpose,
  scheduleResourceCommand,
} from "@/lib/schedules/resource-preparations";
import { localMinute } from "@/lib/schedules/time";
import { scheduleBody } from "./schedules";

const id = z.uuid(),
  version = z.number().int().positive().max(2147483647),
  hash = z.string().regex(/^[0-9a-f]{64}$/);
const scope = {
  careRecipientId: id,
  kind: z.literal("SCHEDULE"),
  purpose: scheduleResourcePurposeSchema,
  targetDocumentId: z.null(),
  targetResourceId: id,
  idempotencyKey: id,
};
export const scheduleResourceSaveSchema = z
  .object({
    ...scope,
    action: z.literal("save"),
    id: id.nullable(),
    expectedRevision: version.nullable(),
    content: scheduleResourceContentSchema,
    navigation: z
      .object({ version: z.literal(1), stage: z.literal("schedule_resource") })
      .strict(),
  })
  .strict()
  .refine(
    (v) => scheduleResourcePurpose(v.content.scheduleAction) === v.purpose,
  )
  .refine(
    (v) =>
      (v.content.referenceHash === null) ===
      (v.content.referenceVersion === null),
  );
export const scheduleResourceMutationSchema = z
  .object({
    ...scope,
    action: z.enum(["discard", "acknowledge"]),
    id,
    expectedRevision: version,
  })
  .strict();
export const scheduleResourceCommandSchema = z
  .union([scheduleResourceSaveSchema, scheduleResourceMutationSchema])
  .refine((v) => (v.id === null) === (v.expectedRevision === null));
export const scheduleResourceCommitSchema = z
  .object({
    careRecipientId: id,
    purpose: scheduleResourcePurposeSchema,
    targetResourceId: id,
    draftCommit: z.object({ id, revision: version }).strict(),
    referenceHash: hash,
    expectedVersion: version,
    sourceVersion: version.nullable(),
    command: scheduleBody,
    idempotencyKey: id,
  })
  .strict()
  .superRefine((v, ctx) => {
    const command = v.command;
    if (v.purpose.startsWith("schedule_change_") !== (v.sourceVersion !== null))
      ctx.addIssue({
        code: "custom",
        message: "Confira a versão da origem desta proposta.",
      });
    if (
      !("id" in command.body) ||
      command.body.id !== v.targetResourceId ||
      command.action === "series"
    )
      ctx.addIssue({
        code: "custom",
        message: "Confira o recurso e a finalidade desta preparação.",
      });
    const allowed: Record<string, boolean> = {
      shift_type_edit: command.action === "type",
      schedule_series_end: command.action === "end_series",
      schedule_series_approve: command.action === "approve",
      schedule_series_reject: command.action === "reject",
      schedule_shift_edit: ["change", "propose_change", "cancel"].includes(
        command.action,
      ),
      schedule_change_approve:
        command.action === "decide_change" && command.body.approve,
      schedule_change_reject:
        command.action === "decide_change" && !command.body.approve,
      schedule_change_close: command.action === "close_obsolete",
    };
    if (!allowed[v.purpose])
      ctx.addIssue({
        code: "custom",
        message: "A operação deve corresponder à finalidade preservada.",
      });
  });
export type ScheduleResourcePacket = z.infer<
  typeof scheduleResourceCommitSchema
>;
const receiptSchema = z
  .object({
    patientId: id,
    purpose: scheduleResourcePurposeSchema,
    targetResourceId: id,
    resourceId: id,
    actorId: id,
    recordedAt: z.iso.datetime({ offset: true }),
    idempotencyKey: id,
    command: scheduleBody,
    expectedVersion: version,
    sourceVersion: version.nullable(),
    referenceHash: hash,
    fields: scheduleResourceFieldsSchema,
    sourceTimezone: z.string().min(1).max(80).nullable(),
    nativeResult: z
      .object({
        id,
        version,
        status: z
          .enum([
            "published",
            "proposed",
            "pending",
            "approved",
            "rejected",
            "obsolete",
            "cancelled",
          ])
          .nullable(),
        active: z.boolean().nullable(),
      })
      .strict(),
  })
  .strict();
type Scope = {
  patientId: string;
  purpose: string;
  targetResourceId?: string | null;
  userId: string;
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function scheduleResourceFieldsMatchCommand(
  f: z.infer<typeof scheduleResourceFieldsSchema>,
  c: z.infer<typeof scheduleBody>,
  target: string,
  timezone: string | null,
) {
  let valid = "id" in c.body && c.body.id === target;
  try {
    if (f.form === "shift") {
      valid &&= c.action === f.operation && timezone !== null;
      if (c.action === "change" || c.action === "propose_change")
        valid &&=
          c.body.professionalId === f.professionalId &&
          c.body.notes === f.notes &&
          c.body.reason === f.reason.trim() &&
          Boolean(
            c.body.startsAt &&
              c.body.endsAt &&
              timezone &&
              localMinute(c.body.startsAt, timezone) === f.start &&
              localMinute(c.body.endsAt, timezone) === f.end,
          );
      else if (c.action === "cancel")
        valid &&= c.body.reason === f.reason.trim();
    } else
      valid &&=
        timezone === null && equal(c, scheduleResourceCommand(f, target, null));

    return valid;
  } catch {
    return false;
  }
}

export function parseScheduleResourceReceipt(value: unknown, scope: Scope) {
  const v = receiptSchema.parse(value),
    f = v.fields,
    c = v.command;
  let valid =
    v.patientId === scope.patientId &&
    v.purpose === scope.purpose &&
    v.targetResourceId === scope.targetResourceId &&
    v.actorId === scope.userId &&
    scheduleResourcePurpose(f) === v.purpose &&
    "id" in c.body &&
    c.body.id === v.targetResourceId &&
    v.nativeResult.id === v.resourceId;
  valid &&= scheduleResourceFieldsMatchCommand(
    f,
    c,
    v.targetResourceId,
    v.sourceTimezone,
  );
  if (c.action === "propose_change")
    valid &&=
      v.nativeResult.version === 1 &&
      v.nativeResult.status === "pending" &&
      v.resourceId !== v.targetResourceId;
  else
    valid &&=
      v.resourceId === v.targetResourceId &&
      v.nativeResult.version === v.expectedVersion + 1;
  if (f.form === "type")
    valid &&=
      v.nativeResult.status === null && v.nativeResult.active === f.active;
  else valid &&= v.nativeResult.active === null;
  if (c.action === "change") valid &&= v.nativeResult.status === "published";
  if (c.action === "cancel") valid &&= v.nativeResult.status === "cancelled";
  if (c.action === "approve") valid &&= v.nativeResult.status === "published";
  if (c.action === "reject") valid &&= v.nativeResult.status === "rejected";
  if (c.action === "end_series")
    valid &&= ["published", "rejected"].includes(v.nativeResult.status ?? "");
  if (c.action === "close_obsolete")
    valid &&= v.nativeResult.status === "obsolete";
  if (c.action === "decide_change")
    valid &&= c.body.approve
      ? ["approved", "obsolete"].includes(v.nativeResult.status ?? "")
      : v.nativeResult.status === "rejected";
  if (!valid)
    throw Error(
      "O resultado não corresponde ao preenchimento, recurso e responsável preservados.",
    );
  return v;
}
export type ScheduleResourceReceipt = ReturnType<
  typeof parseScheduleResourceReceipt
>;
export function scheduleResourceReceiptMatches(
  v: ScheduleResourceReceipt,
  p: ScheduleResourcePacket,
  userId: string,
) {
  return (
    v.patientId === p.careRecipientId &&
    v.actorId === userId &&
    v.purpose === p.purpose &&
    v.targetResourceId === p.targetResourceId &&
    v.idempotencyKey === p.idempotencyKey &&
    v.expectedVersion === p.expectedVersion &&
    v.referenceHash === p.referenceHash &&
    v.sourceVersion === p.sourceVersion &&
    equal(v.command, p.command)
  );
}
export function parseScheduleResourceConfirmation(
  value: unknown,
  p: ScheduleResourcePacket,
  userId: string,
) {
  const v = z
    .object({
      draft: z
        .object({
          id,
          revision: version,
          state: z.enum(["consumed", "completed"]),
        })
        .strict(),
      receipt: z.unknown(),
      replayed: z.boolean(),
    })
    .strict()
    .parse(value);
  const receipt = parseScheduleResourceReceipt(v.receipt, {
    patientId: p.careRecipientId,
    purpose: p.purpose,
    targetResourceId: p.targetResourceId,
    userId,
  });
  if (
    v.draft.id !== p.draftCommit.id ||
    v.draft.revision !==
      p.draftCommit.revision + (v.draft.state === "consumed" ? 1 : 2) ||
    !scheduleResourceReceiptMatches(receipt, p, userId)
  )
    throw Error("A confirmação não corresponde à tentativa preservada.");
  return { ...v, receipt };
}
export function parseScheduleResourceRecovery(
  value: unknown,
  p: ScheduleResourcePacket,
  userId: string,
) {
  const common = {
    patientId: id,
    ownerId: id,
    purpose: scheduleResourcePurposeSchema,
    targetResourceId: id,
    key: id,
    expectedRevision: version,
    expectedVersion: version,
    sourceVersion: version.nullable(),
    referenceHash: hash,
    command: scheduleBody,
    current: z
      .object({
        id,
        revision: version,
        state: z.enum(["active", "discarded", "consumed", "completed"]),
      })
      .strict(),
  };
  const v = z
    .discriminatedUnion("status", [
      z
        .object({
          ...common,
          status: z.literal("applied"),
          confirmation: z.unknown(),
        })
        .strict(),
      z
        .object({
          ...common,
          status: z.enum(["unknown", "not_applied"]),
          reason: z
            .enum(["key_conflict", "advanced_revision", "source_advanced"])
            .nullable(),
          source: z
            .object({
              savedTargetVersion: version,
              currentTargetVersion: version,
              savedSourceVersion: version.nullable(),
              currentSourceVersion: version.nullable(),
            })
            .strict()
            .nullable(),
          receipt: z.unknown().nullable(),
        })
        .strict(),
    ])
    .parse(value);
  if (
    v.patientId !== p.careRecipientId ||
    v.ownerId !== userId ||
    v.purpose !== p.purpose ||
    v.targetResourceId !== p.targetResourceId ||
    v.key !== p.idempotencyKey ||
    v.current.id !== p.draftCommit.id ||
    v.expectedRevision !== p.draftCommit.revision ||
    v.expectedVersion !== p.expectedVersion ||
    v.sourceVersion !== p.sourceVersion ||
    v.referenceHash !== p.referenceHash ||
    !equal(v.command, p.command)
  )
    throw Error("A consulta não corresponde à tentativa de agenda preservada.");
  if (v.status === "applied") {
    const confirmation = parseScheduleResourceConfirmation(
      v.confirmation,
      p,
      userId,
    );
    if (!equal(confirmation.draft, v.current))
      throw Error("A revisão consultada não corresponde ao resultado.");
    return { ...v, confirmation };
  }
  if (
    v.status === "unknown"
      ? v.reason !== null ||
        v.current.state !== "active" ||
        v.current.revision !== p.draftCommit.revision
      : v.reason === null ||
        (v.reason === "advanced_revision" &&
          v.current.revision <= p.draftCommit.revision) ||
        (v.reason === "source_advanced" &&
          (v.current.state !== "active" ||
            v.current.revision !== p.draftCommit.revision))
  )
    throw Error(
      "A consulta ainda não comprova o encerramento desta tentativa.",
    );
  if (
    v.reason === "source_advanced"
      ? !v.source ||
        v.source.savedTargetVersion !== p.expectedVersion ||
        v.source.savedSourceVersion !== p.sourceVersion ||
        !(
          v.source.currentTargetVersion > v.source.savedTargetVersion ||
          (v.source.savedSourceVersion !== null &&
            v.source.currentSourceVersion !== null &&
            v.source.currentSourceVersion > v.source.savedSourceVersion &&
            p.purpose !== "schedule_change_approve")
        )
      : v.source !== null
  )
    throw Error("A consulta não comprova o avanço permanente da referência.");
  const receipt =
    v.receipt === null
      ? null
      : parseScheduleResourceReceipt(v.receipt, {
          patientId: p.careRecipientId,
          purpose: p.purpose,
          targetResourceId: p.targetResourceId,
          userId,
        });
  if (
    (receipt !== null) !==
      ["consumed", "completed"].includes(v.current.state) ||
    (receipt && scheduleResourceReceiptMatches(receipt, p, userId))
  )
    throw Error(
      "O resultado de outra conclusão precisa ser conferido separadamente.",
    );
  return { ...v, receipt };
}
export type ScheduleResourceRecovery = ReturnType<
  typeof parseScheduleResourceRecovery
>;
