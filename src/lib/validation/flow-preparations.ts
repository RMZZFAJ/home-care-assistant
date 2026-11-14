import { z } from "zod";
import { exactQuantity } from "./exact-quantity";
import { draftNavigationSchema } from "./draft-navigation";
import { quantity } from "../quantity";
const id = z.uuid(),
  revision = z.number().int().positive(),
  hash = z.string().regex(/^[0-9a-f]{64}$/),
  instant = z.iso.datetime({ offset: true });
const text = (limit: number) =>
  z
    .string()
    .refine(
      (v) => v.length <= limit,
      `Este campo permite até ${limit} caracteres.`,
    );
export const flowReviewFieldsSchema = z
  .object({
    accept: z.boolean(),
    kind: z.enum(["", "consumption", "shortage"]),
    text: text(2000),
    lines: z
      .array(
        z
          .object({
            productId: text(120).min(1),
            name: text(300),
            unit: text(80),
            quantity: text(64),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((v, c) => {
    if (new Set(v.lines.map((l) => l.productId)).size !== v.lines.length)
      c.addIssue({
        code: "custom",
        message: "Selecione cada material uma única vez.",
      });
  });
export const flowPreparationReferenceSchema = z
  .object({
    patientId: id,
    purpose: z.literal("flow_review"),
    targetResourceId: id,
    suggestion: z
      .object({
        id,
        ownerId: id,
        status: z.string(),
        body: z.record(z.string(), z.unknown()),
        createdAt: instant,
        reportId: id.nullable(),
        reviewedAt: instant.nullable(),
      })
      .strict(),
    catalog: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            unit: z.string(),
            decimals: z.number().int().min(0).max(6),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export const flowPreparationContentSchema = z
  .object({
    review: flowReviewFieldsSchema,
    reference: flowPreparationReferenceSchema.nullable(),
    referenceHash: hash.nullable(),
  })
  .strict()
  .superRefine((v, c) => {
    if ((v.reference === null) !== (v.referenceHash === null))
      c.addIssue({
        code: "custom",
        message: "Confira a referência preservada do Flow.",
      });
  });
const scope = {
  careRecipientId: id,
  kind: z.literal("FLOW"),
  purpose: z.literal("flow_review"),
  targetDocumentId: z.null(),
  targetResourceId: id,
  id: id.nullable(),
  expectedRevision: revision.nullable(),
  idempotencyKey: id,
};
export const flowPreparationSaveSchema = z
  .object({
    ...scope,
    action: z.literal("save"),
    content: flowPreparationContentSchema,
    navigation: draftNavigationSchema,
  })
  .strict();
export const flowPreparationMutationSchema = z
  .object({ ...scope, action: z.enum(["discard", "acknowledge"]) })
  .strict();
export const flowPreparationCommandSchema = z
  .union([flowPreparationSaveSchema, flowPreparationMutationSchema])
  .superRefine((v, c) => {
    if (
      (v.id === null) !== (v.expectedRevision === null) ||
      (v.action !== "save" && v.id === null) ||
      (v.action === "save" && v.navigation.stage !== "flow_review")
    )
      c.addIssue({
        code: "custom",
        message: "Confira a revisão e a etapa deste preenchimento.",
      });
  });
export const flowPreparationReferenceQuery = z
  .object({
    careRecipientId: id,
    purpose: z.literal("flow_review"),
    targetResourceId: id,
    fields: flowReviewFieldsSchema,
  })
  .strict();
export const flowNativeCommandSchema = z
  .object({
    id,
    accept: z.boolean(),
    kind: z.enum(["consumption", "shortage"]),
    text: z.string().trim().min(3).max(2000),
    lines: z
      .array(
        z
          .object({
            productId: text(120).min(1),
            quantity: exactQuantity.refine(
              (v) => quantity(v).gt(0),
              "Informe uma quantidade maior que zero.",
            ),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      !v.accept &&
      (v.kind !== "shortage" ||
        v.text !== "Sugestão descartada pelo próprio autor" ||
        v.lines.length)
    )
      c.addIssue({
        code: "custom",
        message: "A recusa precisa preservar a mesma intenção.",
      });
  });
export type FlowReviewFields = z.infer<typeof flowReviewFieldsSchema>;
export type FlowPreparationContent = z.infer<
  typeof flowPreparationContentSchema
>;
export type FlowPreparationReference = z.infer<
  typeof flowPreparationReferenceSchema
>;
export function flowNativeCommand(fields: FlowReviewFields, target: string) {
  return flowNativeCommandSchema.parse(
    fields.accept
      ? {
          id: target,
          accept: true,
          kind: fields.kind,
          text: fields.text,
          lines: fields.lines.map(({ productId, quantity }) => ({
            productId,
            quantity,
          })),
        }
      : {
          id: target,
          accept: false,
          kind: "shortage",
          text: "Sugestão descartada pelo próprio autor",
          lines: [],
        },
  );
}
export const flowPreparationCommitSchema = z
  .object({
    careRecipientId: id,
    purpose: z.literal("flow_review"),
    targetResourceId: id,
    draftCommit: z.object({ id, revision }).strict(),
    idempotencyKey: id,
    referenceHash: hash,
    command: flowNativeCommandSchema,
  })
  .strict()
  .superRefine((v, c) => {
    if (v.command.id !== v.targetResourceId)
      c.addIssue({
        code: "custom",
        message: "A revisão precisa conservar a mesma sugestão.",
      });
  });
export type FlowPreparationCommit = z.infer<typeof flowPreparationCommitSchema>;
const receiptSchema = z
  .object({
    patientId: id,
    purpose: z.literal("flow_review"),
    targetResourceId: id,
    resourceId: id,
    actorId: id,
    recordedAt: instant,
    idempotencyKey: id,
    referenceHash: hash,
    command: flowNativeCommandSchema,
    preparedReview: flowReviewFieldsSchema,
    preparedReference: flowPreparationReferenceSchema,
    nativeResult: z
      .object({
        status: z.enum(["confirmed", "rejected"]),
        reportId: id.nullable(),
      })
      .strict(),
  })
  .strict();
export type FlowPreparationReceipt = z.infer<typeof receiptSchema>;
function friendlyResponse<T>(read: () => T): T {
  try {
    return read();
  } catch (cause) {
    if (cause instanceof z.ZodError)
      throw new Error("Não foi possível conferir a resposta recebida.", {
        cause,
      });
    throw cause;
  }
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
type Scope = {
  userId?: string;
  patientId: string;
  purpose: string;
  targetResourceId: string;
};
function assertReference(value: FlowPreparationReference, scope: Scope) {
  if (
    value.patientId !== scope.patientId ||
    value.purpose !== scope.purpose ||
    value.targetResourceId !== scope.targetResourceId ||
    value.suggestion.id !== scope.targetResourceId ||
    (scope.userId && value.suggestion.ownerId !== scope.userId)
  )
    throw Error("A sugestão consultada não corresponde ao seu contexto.");
}
export function parseFlowPreparationReference(value: unknown, scope: Scope) {
  return friendlyResponse(() => {
    const v = z
      .object({
        reference: flowPreparationReferenceSchema,
        referenceHash: hash,
      })
      .strict()
      .parse(value);
    assertReference(v.reference, scope);
    return v;
  });
}
export function parseFlowPreparationReceipt(value: unknown, scope: Scope) {
  return friendlyResponse(() => {
    const v = receiptSchema.parse(value);
    assertReference(v.preparedReference, scope);
    if (
      v.patientId !== scope.patientId ||
      v.purpose !== scope.purpose ||
      v.targetResourceId !== scope.targetResourceId ||
      v.resourceId !== scope.targetResourceId ||
      (scope.userId && v.actorId !== scope.userId) ||
      v.actorId !== v.preparedReference.suggestion.ownerId ||
      v.preparedReference.suggestion.status !== "pending_confirmation" ||
      stable(flowNativeCommand(v.preparedReview, v.targetResourceId)) !==
        stable(v.command) ||
      v.nativeResult.status !== (v.command.accept ? "confirmed" : "rejected") ||
      (v.nativeResult.reportId === null) === v.command.accept
    )
      throw Error("O resultado pessoal não corresponde à revisão preservada.");
    if (
      v.command.accept &&
      v.preparedReview.lines.some(
        (l) =>
          !v.preparedReference.catalog.some(
            (c) =>
              c.id === l.productId && c.name === l.name && c.unit === l.unit,
          ),
      )
    )
      throw Error(
        "Os materiais confirmados não correspondem à referência preservada.",
      );
    return v;
  });
}
export function parseFlowPreparationConfirmation(
  value: unknown,
  packet: FlowPreparationCommit,
  userId: string,
) {
  return friendlyResponse(() => {
    const row = z
        .object({
          id,
          revision,
          savedAt: instant,
          state: z.literal("consumed"),
          consumedDocumentId: z.null(),
          consumedResourceId: id,
          consumedResult: z.unknown(),
          replayed: z.boolean(),
        })
        .parse(value),
      receipt = parseFlowPreparationReceipt(row.consumedResult, {
        userId,
        patientId: packet.careRecipientId,
        purpose: packet.purpose,
        targetResourceId: packet.targetResourceId,
      });
    if (
      row.id !== packet.draftCommit.id ||
      row.revision !== packet.draftCommit.revision + 1 ||
      row.consumedResourceId !== packet.targetResourceId ||
      receipt.idempotencyKey !== packet.idempotencyKey ||
      receipt.referenceHash !== packet.referenceHash ||
      stable(receipt.command) !== stable(packet.command)
    )
      throw Error(
        "A confirmação não corresponde à mesma tentativa preservada.",
      );
    return { ...row, consumedResult: receipt };
  });
}
export const flowPreparationPendingSchema = z
  .object({
    version: z.literal(1),
    userId: id,
    packet: flowPreparationCommitSchema,
  })
  .strict();
export function flowPendingEnvelopeMatches(
  value: unknown,
  packet: FlowPreparationCommit,
  userId: string,
) {
  const v = flowPreparationPendingSchema.safeParse(value);
  return (
    v.success &&
    v.data.userId === userId &&
    stable(v.data.packet) === stable(packet)
  );
}
export function flowPendingConfirmedByRead(
  row: {
    id: string;
    revision: number;
    state: string;
    savedAt: string;
    consumedResourceId?: string | null;
    consumedResult?: unknown;
  } | null,
  packet: FlowPreparationCommit,
  userId: string,
) {
  if (!row || row.state !== "consumed") return false;
  try {
    parseFlowPreparationConfirmation(
      {
        ...row,
        savedAt: row.savedAt,
        consumedDocumentId: null,
        replayed: true,
      },
      packet,
      userId,
    );
    return true;
  } catch {
    return false;
  }
}
export const flowPreparationListQuery = z
  .object({
    careRecipientId: id,
    before: instant.optional(),
    beforeId: id.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine(
    (v) => Boolean(v.before) === Boolean(v.beforeId),
    "Confira o cursor da consulta.",
  );
export function parseFlowPreparationList(value: unknown) {
  return friendlyResponse(() => {
    return z
      .object({
        data: z
          .array(
            z
              .object({
                id,
                targetResourceId: id,
                revision,
                state: z.enum(["active", "consumed"]),
                savedAt: instant,
              })
              .strict(),
          )
          .max(50),
        next: z.object({ at: instant, id }).strict().nullable(),
      })
      .strict()
      .parse(value);
  });
}
