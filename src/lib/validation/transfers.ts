import { z } from "zod";
import { quantity } from "@/lib/quantity";
import { exactQuantity } from "./documents";

const identifier = z.string().uuid();
const reason = z
  .string()
  .trim()
  .min(3)
  .max(1000)
  .refine(
    (value) => Array.from(value).length >= 3 && value.length <= 1000,
    "Informe uma justificativa de 3 a 1.000 caracteres.",
  );
export const createTransferSchema = z
  .object({
    careRecipientId: identifier,
    idempotencyKey: identifier,
    declaration: z
      .object({
        source: z.enum(["FAMILY", "CARE_TEAM"]),
        counterpartyId: identifier,
        recipientId: identifier,
        originDocumentId: identifier.nullable().optional(),
        referenceHash: z.string().regex(/^[0-9a-f]{64}$/),
        reason,
        lines: z
          .array(
            z
              .object({
                productId: z.string().min(1).max(120),
                quantity: exactQuantity.refine(
                  (value) => quantity(value).gt(0),
                  "Informe uma quantidade positiva.",
                ),
              })
              .strict(),
          )
          .min(1)
          .max(1000),
      })
      .strict()
      .refine(
        (value) =>
          new Set(value.lines.map((line) => line.productId)).size ===
          value.lines.length,
        "Não repita materiais.",
      ),
  })
  .strict();
const command = {
  idempotencyKey: identifier,
  expectedVersion: z.number().int().positive().max(2147483647),
};
export const transferCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...command,
      action: z.literal("dispatch"),
      body: z.object({}).strict(),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.enum(["agree", "decline", "withdraw"]),
      body: z.object({ reason }).strict(),
    })
    .strict(),
]);
export type TransferDeclaration = z.infer<typeof createTransferSchema>;
export type TransferCommand = z.infer<typeof transferCommandSchema>;
