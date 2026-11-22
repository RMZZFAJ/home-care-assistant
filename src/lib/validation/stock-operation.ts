import { z } from "zod";
import { exactQuantity } from "./exact-quantity";
import { quantity } from "@/lib/quantity";

const materialId = z.string().trim().min(1).max(120);
const referenceHash = z.string().regex(/^[0-9a-f]{64}$/);
const instant = z.iso.datetime({ offset: true });
export const stockOperationAction = z.enum(["inbound", "outbound", "correction_in", "correction_out"]);

export const stockOperationProducts = z.array(materialId).min(1).max(50)
  .refine(products => new Set(products).size === products.length, "Selecione cada material uma única vez.");

export const stockOperationInput = z.object({
  careRecipientId: z.uuid(),
  action: stockOperationAction,
  reason: z.string().trim().min(3).max(1000),
  idempotencyKey: z.uuid(),
  referenceHash,
  lines: z.array(z.object({
    productId: materialId,
    quantity: exactQuantity.refine(value => quantity(value).gt(0), "Informe uma quantidade positiva."),
    referenceId: z.uuid().optional(),
  }).strict()).min(1).max(50),
}).strict().superRefine((input, ctx) => {
  if (new Set(input.lines.map(line => line.productId)).size !== input.lines.length)
    ctx.addIssue({ code: "custom", path: ["lines"], message: "Informe cada material uma única vez." });
  const correction = input.action.startsWith("correction_");
  for (const [index, line] of input.lines.entries()) {
    if (Boolean(line.referenceId) !== correction)
      ctx.addIssue({ code: "custom", path: ["lines", index, "referenceId"], message: "Vincule o lançamento original em cada material corrigido." });
  }
});

export const stockOperationReference = z.object({
  patientId: z.uuid(),
  referenceHash,
  materials: z.array(z.object({
    productId: materialId, name: z.string().min(1), unit: z.string().min(1), active: z.boolean(),
    quantityDecimals: z.number().int().min(0).max(6),
    quantity: z.string().regex(/^-?\d+(?:\.\d+)?$/).nullable(), updatedAt: instant.nullable(),
  }).strict()).min(1).max(50),
}).strict();

export const stockOperationReceipt = z.object({
  patientId: z.uuid(),
  key: z.uuid(),
  id: z.uuid(),
  recordedAt: instant,
  movementIds: z.array(z.uuid()).min(1).max(50).refine(ids => new Set(ids).size === ids.length),
}).strict();

export type StockOperationInput = z.infer<typeof stockOperationInput>;
export type StockOperationReference = z.infer<typeof stockOperationReference>;
export type StockOperationReceipt = z.infer<typeof stockOperationReceipt>;
