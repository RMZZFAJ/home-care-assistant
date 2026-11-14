import { z } from "zod";
import {
  scheduleCreationContent,
  scheduleCreationFields,
  scheduleCreationPurpose,
  scheduleCreationCommand,
  schedulePurpose,
} from "@/lib/schedules/creation";
import { scheduleBody } from "./schedules";

const id = z.uuid(),
  revision = z.number().int().positive().max(2147483647);
const scope = {
  careRecipientId: id,
  kind: z.literal("SCHEDULE"),
  purpose: scheduleCreationPurpose,
  targetDocumentId: z.null(),
  targetResourceId: z.null(),
  idempotencyKey: id,
};
export const schedulePreparationSaveSchema = z
  .object({
    ...scope,
    action: z.literal("save"),
    id: id.nullable(),
    expectedRevision: revision.nullable(),
    content: scheduleCreationContent,
    navigation: z
      .object({ version: z.literal(1), stage: z.literal("schedule_creation") })
      .strict(),
  })
  .strict()
  .refine((v) => v.purpose === schedulePurpose(v.content.schedule));
export const schedulePreparationMutationSchema = z
  .object({
    ...scope,
    action: z.enum(["discard", "acknowledge"]),
    id,
    expectedRevision: revision,
  })
  .strict();
export const schedulePreparationCommandSchema = z
  .union([schedulePreparationSaveSchema, schedulePreparationMutationSchema])
  .refine((v) => (v.id === null) === (v.expectedRevision === null));
const newCommand = scheduleBody.refine(
  (v) =>
    v.action === "type"
      ? !v.body.id
      : v.action === "series" && v.body.replacesId === undefined,
  "Esta preparação cria um novo tipo ou uma nova programação.",
);
export const schedulePreparationCommitSchema = z
  .object({
    careRecipientId: id,
    purpose: scheduleCreationPurpose,
    draftCommit: z.object({ id, revision }).strict(),
    command: newCommand,
    idempotencyKey: id,
  })
  .strict()
  .refine(
    (v) =>
      (v.purpose === "shift_type_create") === (v.command.action === "type"),
  );
export type SchedulePreparationPacket = z.infer<
  typeof schedulePreparationCommitSchema
>;
const receipt = z
  .object({
    patientId: id,
    purpose: scheduleCreationPurpose,
    targetResourceId: z.null(),
    resourceId: id,
    actorId: id,
    recordedAt: z.iso.datetime({ offset: true }),
    idempotencyKey: id,
    command: newCommand,
    fields: scheduleCreationFields,
    nativeResult: z
      .object({
        id,
        version: z.literal(1),
        status: z.enum(["published", "proposed"]).nullable(),
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
export function parseSchedulePreparationReceipt(value: unknown, scope: Scope) {
  const v = receipt.parse(value);
  if (
    v.patientId !== scope.patientId ||
    v.actorId !== scope.userId ||
    v.purpose !== scope.purpose ||
    scope.targetResourceId != null ||
    v.purpose !== schedulePurpose(v.fields) ||
    v.resourceId !== v.nativeResult.id ||
    JSON.stringify(v.command) !==
      JSON.stringify(scheduleCreationCommand(v.fields)) ||
    (v.fields.form === "type"
      ? v.nativeResult.status !== null ||
        v.nativeResult.active !== v.fields.active
      : v.nativeResult.status === null || v.nativeResult.active !== null)
  )
    throw new Error(
      "O resultado da agenda não corresponde ao preenchimento e ao responsável.",
    );
  return v;
}
export type SchedulePreparationReceipt = ReturnType<
  typeof parseSchedulePreparationReceipt
>;
export function scheduleReceiptMatches(
  v: SchedulePreparationReceipt,
  p: SchedulePreparationPacket,
  userId: string,
) {
  return (
    v.patientId === p.careRecipientId &&
    v.actorId === userId &&
    v.purpose === p.purpose &&
    v.idempotencyKey === p.idempotencyKey &&
    JSON.stringify(v.command) === JSON.stringify(p.command)
  );
}
export function parseSchedulePreparationConfirmation(
  value: unknown,
  p: SchedulePreparationPacket,
  userId: string,
) {
  const v = z
      .object({
        draft: z
          .object({ id, revision, state: z.enum(["consumed", "completed"]) })
          .strict(),
        receipt: z.unknown(),
        replayed: z.boolean(),
      })
      .strict()
      .parse(value),
    r = parseSchedulePreparationReceipt(v.receipt, {
      patientId: p.careRecipientId,
      purpose: p.purpose,
      userId,
    });
  if (
    v.draft.id !== p.draftCommit.id ||
    v.draft.revision !==
      p.draftCommit.revision + (v.draft.state === "consumed" ? 1 : 2) ||
    !scheduleReceiptMatches(r, p, userId)
  )
    throw new Error(
      "A confirmação não corresponde à tentativa de agenda preservada.",
    );
  return { ...v, receipt: r };
}

export function parseScheduleRecovery(
  value: unknown,
  p: SchedulePreparationPacket,
  userId: string,
) {
  const common = {
    patientId: id,
    ownerId: id,
    purpose: scheduleCreationPurpose,
    key: id,
    expectedRevision: revision,
    command: newCommand,
    current: z
      .object({
        id,
        revision,
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
            .enum(["advanced_revision", "key_conflict", "source_advanced"])
            .nullable(),
          source: z
            .object({
              savedTypeVersion: revision,
              currentTypeVersion: revision,
            })
            .strict()
            .nullable()
            .optional(),
          receipt: z.unknown().nullable(),
        })
        .strict(),
    ])
    .parse(value);
  if (
    v.patientId !== p.careRecipientId ||
    v.ownerId !== userId ||
    v.purpose !== p.purpose ||
    v.key !== p.idempotencyKey ||
    v.expectedRevision !== p.draftCommit.revision ||
    v.current.id !== p.draftCommit.id ||
    JSON.stringify(v.command) !== JSON.stringify(p.command)
  )
    throw new Error(
      "A consulta não corresponde à tentativa de escala preservada.",
    );
  if (v.status === "applied") {
    const confirmation = parseSchedulePreparationConfirmation(
      v.confirmation,
      p,
      userId,
    );
    if (JSON.stringify(confirmation.draft) !== JSON.stringify(v.current))
      throw new Error("O resultado não corresponde à revisão conferida.");
    return { ...v, confirmation };
  }
  if (
    (v.status === "unknown" &&
      (v.reason !== null || v.current.revision > p.draftCommit.revision)) ||
    (v.status === "not_applied" &&
      (v.reason === null ||
        (v.reason === "advanced_revision" &&
          v.current.revision <= p.draftCommit.revision)))
  )
    throw new Error(
      "A consulta ainda não comprova o encerramento desta tentativa.",
    );
  const receipt =
    v.receipt === null
      ? null
      : parseSchedulePreparationReceipt(v.receipt, {
          patientId: p.careRecipientId,
          purpose: p.purpose,
          userId,
        });
  if (
    v.reason === "source_advanced"
      ? !v.source ||
        v.source.currentTypeVersion <= v.source.savedTypeVersion ||
        p.purpose !== "schedule_series_create" ||
        p.command.action !== "series" ||
        v.current.state !== "active" ||
        v.current.revision !== p.draftCommit.revision
      : v.source != null
  )
    throw new Error(
      "A consulta não comprova a mudança da referência desta tentativa.",
    );
  if (
    (receipt !== null) !==
      ["consumed", "completed"].includes(v.current.state) ||
    (v.status === "not_applied" &&
      receipt &&
      scheduleReceiptMatches(receipt, p, userId))
  )
    throw new Error(
      "A referência deve ser preservada para conferir o resultado correto.",
    );
  return { ...v, receipt };
}
export type ScheduleRecovery = ReturnType<typeof parseScheduleRecovery>;
