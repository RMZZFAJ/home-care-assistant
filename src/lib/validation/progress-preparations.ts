import { z } from "zod";
import {
  progressContent,
  publishProgress,
  parseProgressOutcome,
  progressConfirmed,
  stagesByDocument,
} from "./document-progress";
import { draftNavigationSchema } from "./draft-navigation";
const id = z.uuid(),
  revision = z.number().int().positive(),
  instant = z.iso.datetime({ offset: true });
export const progressDraftNoteSchema = progressContent.extend({
  text: z
    .string()
    .refine(
      (value) => value.length <= 2000,
      "O andamento permite até 2000 caracteres.",
    ),
});
export const progressPreparationContentSchema = z
  .object({
    documentType: z.enum(["REQ", "COM", "ENT", "BAL"]),
    note: progressDraftNoteSchema,
  })
  .strict()
  .superRefine((v, c) => {
    if (
      v.note.stage &&
      !stagesByDocument[v.documentType].some((stage) => stage === v.note.stage)
    )
      c.addIssue({
        code: "custom",
        path: ["note", "stage"],
        message: "Escolha uma etapa desta ficha.",
      });
    if (
      new Set(v.note.references.map((x) => x.toLowerCase())).size !==
      v.note.references.length
    )
      c.addIssue({
        code: "custom",
        path: ["note", "references"],
        message: "Não repita referências.",
      });
  });
export type ProgressPreparationContent = z.infer<
  typeof progressPreparationContentSchema
>;
const scope = {
  careRecipientId: id,
  kind: z.literal("PROGRESS"),
  purpose: z.literal("progress_note"),
  targetDocumentId: z.null(),
  targetResourceId: id,
  id: id.nullable(),
  expectedRevision: revision.nullable(),
  idempotencyKey: id,
};
export const progressPreparationSaveSchema = z
  .object({
    ...scope,
    action: z.literal("save"),
    content: progressPreparationContentSchema,
    navigation: draftNavigationSchema,
  })
  .strict();
export const progressPreparationMutationSchema = z
  .object({ ...scope, action: z.enum(["discard", "acknowledge"]) })
  .strict();
export const progressPreparationCommandSchema = z
  .union([progressPreparationSaveSchema, progressPreparationMutationSchema])
  .superRefine((v, c) => {
    if (
      (v.id === null) !== (v.expectedRevision === null) ||
      (v.action !== "save" && v.id === null) ||
      (v.action === "save" && v.navigation.stage !== "progress_note")
    )
      c.addIssue({
        code: "custom",
        message: "Confira a revisão e a etapa deste preenchimento.",
      });
  });
export const progressPreparationCommitSchema = publishProgress
  .extend({
    careRecipientId: id,
    purpose: z.literal("progress_note"),
    targetResourceId: id,
    draftCommit: z.object({ id, revision }).strict(),
  })
  .strict();
export type ProgressPreparationCommit = z.infer<
  typeof progressPreparationCommitSchema
>;
export const storedProgressPacketSchema = z.union([
  progressPreparationCommitSchema,
  publishProgress,
]);
export type StoredProgressPacket = z.infer<typeof storedProgressPacketSchema>;
const receiptSchema = z
  .object({
    patientId: id,
    purpose: z.literal("progress_note"),
    targetResourceId: id,
    resourceId: id,
    actorId: id,
    recordedAt: instant,
    idempotencyKey: id,
    documentType: z.enum(["REQ", "COM", "ENT", "BAL"]),
    command: publishProgress,
    nativeResult: z.unknown(),
  })
  .strict();
type Scope = {
  patientId: string;
  purpose: string;
  targetResourceId: string;
  userId?: string;
};
function friendly<T>(fn: () => T): T {
  try {
    return fn();
  } catch (cause) {
    if (cause instanceof z.ZodError)
      throw new Error(
        "Não foi possível conferir o preenchimento de andamento recebido.",
        { cause },
      );
    throw cause;
  }
}
export function parseProgressPreparationReceipt(value: unknown, scope: Scope) {
  return friendly(() => {
    const v = receiptSchema.parse(value),
      nativeResult = parseProgressOutcome(v.nativeResult);
    if (
      v.patientId !== scope.patientId ||
      v.purpose !== scope.purpose ||
      v.targetResourceId !== scope.targetResourceId ||
      (scope.userId && v.actorId !== scope.userId) ||
      v.command.key !== v.idempotencyKey ||
      v.resourceId !== nativeResult.note.id ||
      v.recordedAt !== nativeResult.note.recordedAt ||
      !progressConfirmed(
        nativeResult,
        {
          key: v.command.key,
          content: {
            ...v.command.content,
            references: v.command.content.references.map((x) =>
              x.toLowerCase(),
            ),
          },
        },
        v.targetResourceId,
        v.actorId,
      ) ||
      !progressPreparationContentSchema.safeParse({
        documentType: v.documentType,
        note: v.command.content,
      }).success
    )
      throw new Error(
        "O resultado pessoal não corresponde ao andamento preservado.",
      );
    return { ...v, nativeResult };
  });
}
export type ProgressPreparationReceipt = ReturnType<
  typeof parseProgressPreparationReceipt
>;
export function progressReceiptMatchesPacket(
  receipt: ProgressPreparationReceipt,
  packet: ProgressPreparationCommit,
) {
  return (
    receipt.patientId === packet.careRecipientId &&
    receipt.targetResourceId === packet.targetResourceId &&
    receipt.idempotencyKey === packet.key &&
    JSON.stringify(receipt.command) ===
      JSON.stringify(
        publishProgress.parse({ key: packet.key, content: packet.content }),
      )
  );
}
export function parseProgressPreparationConfirmation(
  value: unknown,
  packet: ProgressPreparationCommit,
  userId: string,
) {
  return friendly(() => {
    const v = z
      .object({
        draft: z
          .object({ id, revision, state: z.enum(["consumed", "completed"]) })
          .strict(),
        receipt: z.unknown(),
        replayed: z.boolean(),
      })
      .strict()
      .parse(value);
    const receipt = parseProgressPreparationReceipt(v.receipt, {
      patientId: packet.careRecipientId,
      purpose: packet.purpose,
      targetResourceId: packet.targetResourceId,
      userId,
    });
    if (
      v.draft.id !== packet.draftCommit.id ||
      v.draft.revision !==
        packet.draftCommit.revision + (v.draft.state === "consumed" ? 1 : 2) ||
      !progressReceiptMatchesPacket(receipt, packet)
    )
      throw new Error(
        "A confirmação não corresponde à mesma publicação privada.",
      );
    return { ...v, receipt };
  });
}
export function progressPreparationConfirmed(
  value: unknown,
  packet: ProgressPreparationCommit,
  userId: string,
) {
  try {
    parseProgressPreparationConfirmation(
      z.object({ data: z.unknown() }).parse(value).data,
      packet,
      userId,
    );
    return true;
  } catch {
    return false;
  }
}
export function storedProgressPacketsMatch(
  a: StoredProgressPacket,
  b: StoredProgressPacket,
) {
  return (
    JSON.stringify(storedProgressPacketSchema.parse(a)) ===
    JSON.stringify(storedProgressPacketSchema.parse(b))
  );
}

export function parseProgressRecovery(
  value: unknown,
  packet: ProgressPreparationCommit,
  userId: string,
) {
  return friendly(() => {
    const common = {
      patientId: id,
      ownerId: id,
      targetResourceId: id,
      key: id,
      expectedRevision: revision,
      content: progressContent,
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
            status: z.literal("applied_native"),
            nativeResult: z.unknown(),
          })
          .strict(),
        z
          .object({
            ...common,
            status: z.enum(["unknown", "not_applied"]),
            reason: z.enum(["advanced_revision", "key_conflict"]).nullable(),
            receipt: z.unknown().nullable(),
          })
          .strict(),
      ])
      .parse(value);
    if (
      v.patientId !== packet.careRecipientId ||
      v.ownerId !== userId ||
      v.targetResourceId !== packet.targetResourceId ||
      v.key !== packet.key ||
      v.expectedRevision !== packet.draftCommit.revision ||
      v.current.id !== packet.draftCommit.id ||
      JSON.stringify(v.content) !== JSON.stringify(packet.content)
    )
      throw new Error(
        "A consulta não corresponde à tentativa de andamento preservada.",
      );
    if (v.status === "applied") {
      const confirmation = parseProgressPreparationConfirmation(
        v.confirmation,
        packet,
        userId,
      );
      if (JSON.stringify(confirmation.draft) !== JSON.stringify(v.current))
        throw new Error("O estado atual não corresponde à confirmação.");
      return { ...v, confirmation };
    }
    if (v.status === "applied_native") {
      const nativeResult = parseProgressOutcome(v.nativeResult);
      if (
        !progressConfirmed(
          nativeResult,
          packet,
          packet.targetResourceId,
          userId,
        )
      )
        throw new Error(
          "A publicação encontrada não corresponde à tentativa preservada.",
        );
      return { ...v, nativeResult };
    }
    if (
      (v.status === "unknown" &&
        (v.reason !== null ||
          v.current.revision > packet.draftCommit.revision)) ||
      (v.status === "not_applied" &&
        (v.reason === null ||
          (v.reason === "advanced_revision" &&
            v.current.revision <= packet.draftCommit.revision)))
    )
      throw new Error(
        "A resposta não comprova o estado desta tentativa. Sua referência foi preservada.",
      );
    const receipt =
      v.receipt === null
        ? null
        : parseProgressPreparationReceipt(v.receipt, {
            patientId: packet.careRecipientId,
            purpose: packet.purpose,
            targetResourceId: packet.targetResourceId,
            userId,
          });
    if (
      v.status === "not_applied" &&
      receipt &&
      progressReceiptMatchesPacket(receipt, packet)
    )
      throw new Error(
        "O resultado já contém esta publicação. A referência foi preservada para recuperar a confirmação correta.",
      );
    if (
      (v.current.state === "consumed" || v.current.state === "completed") !==
      (receipt !== null)
    )
      throw new Error("O resultado atual não pôde ser conferido.");
    return { ...v, receipt };
  });
}
export type ProgressRecovery = ReturnType<typeof parseProgressRecovery>;
