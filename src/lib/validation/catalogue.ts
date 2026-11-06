import { z } from "zod";
import { exactQuantity } from "./documents";
import { quantity } from "@/lib/quantity";

export const presentationCommandSchema = z
  .object({
    action: z.literal("presentation"),
    careRecipientId: z.string().uuid(),
    id: z.string().uuid().nullable(),
    referenceVersion: z.number().int().positive().nullable(),
    productId: z.string().min(1).max(120),
    barcode: z.string().regex(/^\d{8,14}$/),
    name: z.string().trim().min(2).max(160),
    baseQuantity: exactQuantity.refine(
      (value) => quantity(value).gt(0),
      "Informe um fator maior que zero.",
    ),
    active: z.boolean(),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .refine(
    (value) =>
      value.id
        ? value.referenceVersion !== null
        : value.referenceVersion === null,
    "Confira a identidade e a versão da apresentação.",
  );
