import { exactQuantity } from "./exact-quantity";
import { z } from "zod";
import { familyStockMovementSchema } from "./stock";
import { draftNavigationSchema } from "./draft-navigation";
import { quantity } from "../quantity";

function checked<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Não foi possível conferir a resposta. Consulte novamente ou recupere a mesma tentativa.",
    );
  return parsed.data;
}

const id = z.uuid(),
  revision = z.number().int().positive().max(2147483647);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const text = (max: number) =>
  z
    .string()
    .refine(
      (value) => value.length <= max,
      `Este campo permite até ${max} caracteres.`,
    );
export const stockPreparationFieldsSchema = z
  .object({
    action: z
      .enum(["inbound", "outbound", "correction_in", "correction_out"])
      .optional(),
    productId: text(120).optional(),
    productLabel: text(200).optional(),
    unit: text(200).optional(),
    quantity: text(64).optional(),
    observedBalance: text(64).optional(),
    reason: text(1000).optional(),
    referenceId: text(1000).optional(),
    referenceLabel: text(200).optional(),
  })
  .strict();
export const stockPreparationContentSchema = z
  .object({
    movement: stockPreparationFieldsSchema,
    referenceHash: hash.nullable(),
  })
  .strict();
const scope = {
  careRecipientId: id,
  kind: z.literal("STOCK"),
  purpose: z.literal("family_movement"),
  targetDocumentId: z.null(),
  targetResourceId: id,
  id: id.nullable(),
  expectedRevision: revision.nullable(),
  idempotencyKey: id,
};
export const stockPreparationSaveSchema = z
  .object({
    ...scope,
    action: z.literal("save"),
    content: stockPreparationContentSchema,
    navigation: draftNavigationSchema,
  })
  .strict();
export const stockPreparationMutationSchema = z
  .object({ ...scope, action: z.enum(["discard", "acknowledge"]) })
  .strict();
export const stockPreparationCommandSchema = z
  .union([stockPreparationSaveSchema, stockPreparationMutationSchema])
  .superRefine((v, ctx) => {
    if (
      v.targetResourceId !== v.careRecipientId ||
      (v.id === null) !== (v.expectedRevision === null) ||
      (v.action !== "save" && v.id === null) ||
      (v.action === "save" && v.navigation.stage !== "stock_family_movement")
    )
      ctx.addIssue({
        code: "custom",
        message: "Confira o paciente, a revisão e a etapa do preenchimento.",
      });
  });
export const stockPreparationCommitSchema = z
  .object({
    careRecipientId: id,
    draftCommit: z.object({ id, revision }).strict(),
    idempotencyKey: id,
    referenceHash: hash,
    command: familyStockMovementSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.command.careRecipientId !== v.careRecipientId ||
      v.command.idempotencyKey !== v.idempotencyKey
    )
      ctx.addIssue({
        code: "custom",
        message:
          "A confirmação precisa conservar o paciente e a mesma tentativa.",
      });
  });
const movementSchema = z
  .object({
    id,
    productId: z.string().min(1).max(120),
    quantity: exactQuantity,
    sourceLocation: z.enum(["FAMILY", "CARE_TEAM", "TRANSIT"]).nullable(),
    destinationLocation: z.enum(["FAMILY", "CARE_TEAM", "TRANSIT"]).nullable(),
    reason: z.string(),
    performedBy: id,
    referenceId: id.nullable(),
  })
  .strict();
export const stockPreparationReceiptSchema = z
  .object({
    patientId: id,
    purpose: z.literal("family_movement"),
    targetResourceId: id,
    resourceId: id,
    actorId: id,
    recordedAt: z.iso.datetime({ offset: true }),
    command: familyStockMovementSchema,
    referenceHash: hash,
    preparedMovement: stockPreparationFieldsSchema,
    movement: movementSchema,
  })
  .strict();
export type StockPreparationFields = z.infer<
  typeof stockPreparationFieldsSchema
>;
export type StockPreparationContent = z.infer<
  typeof stockPreparationContentSchema
>;
export type StockPreparationCommit = z.infer<
  typeof stockPreparationCommitSchema
>;
export type StockPreparationReceipt = z.infer<
  typeof stockPreparationReceiptSchema
>;
export function parseStockPreparationReceipt(
  value: unknown,
  scope: {
    patientId: string;
    userId: string;
    targetResourceId?: string | null;
  },
  intent?: StockPreparationCommit,
): StockPreparationReceipt {
  const r = checked(stockPreparationReceiptSchema, value),
    c = r.command,
    m = r.movement,
    p = r.preparedMovement;
  const prepared = checked(familyStockMovementSchema, {
    careRecipientId: r.patientId,
    productId: p.productId,
    quantity: p.quantity,
    action: p.action,
    reason: p.reason,
    idempotencyKey: c.idempotencyKey,
    ...(p.referenceId ? { referenceId: p.referenceId } : {}),
  });
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  const outbound = c.action === "outbound" || c.action === "correction_out";
  if (
    r.patientId !== scope.patientId ||
    r.targetResourceId !== scope.patientId ||
    (scope.targetResourceId != null &&
      r.targetResourceId !== scope.targetResourceId) ||
    r.actorId !== scope.userId ||
    m.id !== r.resourceId ||
    m.performedBy !== r.actorId ||
    c.careRecipientId !== r.patientId ||
    c.productId !== m.productId ||
    !quantity(c.quantity).eq(m.quantity) ||
    c.reason !== m.reason ||
    (c.referenceId ?? null) !== m.referenceId ||
    m.sourceLocation !== (outbound ? "FAMILY" : null) ||
    m.destinationLocation !== (outbound ? null : "FAMILY") ||
    !same(prepared, c) ||
    (intent &&
      (!same(c, intent.command) || r.referenceHash !== intent.referenceHash))
  )
    throw new Error("O resultado não corresponde à movimentação preparada.");
  return r;
}
export const stockPreparationReferenceSchema = z
  .object({
    patientId: id,
    referenceHash: hash,
    canReadBalance: z.boolean().default(true),
    product: z
      .object({
        id: z.string().min(1).max(120),
        name: z.string().max(200),
        unit: z.string().max(200),
        decimals: z.number().int().min(0).max(6),
        active: z.boolean(),
      })
      .strict(),
    balance: z
      .string()
      .refine((v) => {
        try {
          return quantity(v).isFinite();
        } catch {
          return false;
        }
      })
      .nullable(),
    origin: z
      .object({
        id,
        productId: z.string(),
        quantity: exactQuantity.nullable(),
        sourceLocation: z.string().nullable(),
        destinationLocation: z.string().nullable(),
        recordedAt: z.iso.datetime({ offset: true }).nullable(),
        performedBy: id.nullable(),
        reason: z.string().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type StockPreparationReference = z.infer<
  typeof stockPreparationReferenceSchema
>;
export function parseStockPreparationReference(
  value: unknown,
  patientId: string,
  productId: string,
  referenceId: string,
) {
  const r = checked(stockPreparationReferenceSchema, value);
  if (
    r.canReadBalance !== (r.balance !== null) ||
    (!r.canReadBalance &&
      r.origin &&
      [
        r.origin.quantity,
        r.origin.sourceLocation,
        r.origin.destinationLocation,
        r.origin.recordedAt,
        r.origin.performedBy,
        r.origin.reason,
      ].some((v) => v !== null)) ||
    (r.canReadBalance &&
      r.origin &&
      [
        r.origin.quantity,
        r.origin.recordedAt,
        r.origin.performedBy,
        r.origin.reason,
      ].some((v) => v === null))
  )
    throw new Error(
      "A resposta não confirmou o escopo de leitura da referência.",
    );
  if (
    r.patientId !== patientId ||
    r.product.id !== productId ||
    (r.origin?.id ?? "") !== referenceId ||
    (r.origin && r.origin.productId !== productId)
  )
    throw new Error(
      "A referência retornada não corresponde ao material e ao paciente consultados.",
    );
  return r;
}
export const stockPreparationPendingSchema = z
  .object({
    packet: stockPreparationCommitSchema,
    content: stockPreparationContentSchema,
  })
  .strict();
export function parseStockPreparationConfirmation(
  value: unknown,
  patientId: string,
  userId: string,
  intent: StockPreparationCommit,
) {
  const result = checked(
    z
      .object({
        id: z.uuid(),
        revision,
        patientId: id,
        ownerId: id,
        purpose: z.literal("family_movement"),
        targetResourceId: id,
        state: z.literal("consumed"),
        savedAt: z.iso.datetime({ offset: true }),
        consumedDocumentId: z.null(),
        consumedResourceId: id,
        consumedResult: stockPreparationReceiptSchema,
        replayed: z.boolean(),
      })
      .strict(),
    value,
  );
  const receipt = parseStockPreparationReceipt(
    result.consumedResult,
    { patientId, userId, targetResourceId: patientId },
    intent,
  );
  if (
    result.patientId !== patientId ||
    result.ownerId !== userId ||
    result.targetResourceId !== patientId ||
    result.id !== intent.draftCommit.id ||
    result.revision !== intent.draftCommit.revision + 1 ||
    result.consumedResourceId !== receipt.resourceId
  )
    throw new Error(
      "A resposta não confirmou a mesma movimentação e a revisão preservada.",
    );
  return receipt;
}
