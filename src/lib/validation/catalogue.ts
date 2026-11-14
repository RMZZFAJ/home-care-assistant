import { z } from "zod";
import { exactQuantity } from "./documents";
import { quantity } from "@/lib/quantity";

export const catalogueIdentityCommandSchema = z
  .object({
    careRecipientId: z.string().uuid(),
    productId: z.string().min(1).max(120),
    successorId: z.string().min(1).max(120).nullable(),
    referenceHash: z.string().regex(/^[0-9a-f]{64}$/),
    action: z.enum(["retire", "reactivate", "clear_successor"]),
    reason: z
      .string()
      .trim()
      .refine(
        (value) => Array.from(value).length >= 3 && value.length <= 1000,
        "Informe um motivo próprio de 3 a 1.000 caracteres.",
      ),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .refine(
    (value) =>
      value.successorId !== value.productId &&
      (value.action === "retire" || value.successorId === null),
    "Confira o material e a indicação de sucessor.",
  );

export const presentationCommandSchema = z
  .object({
    action: z.literal("presentation"),
    careRecipientId: z.string().uuid(),
    id: z.string().uuid().nullable(),
    referenceVersion: z.number().int().positive().nullable(),
    productId: z.string().min(1, "Escolha o material da apresentação.").max(120),
    barcode: z.string().regex(/^\d{8,14}$/, "Informe um código de 8 a 14 algarismos, preservando os zeros iniciais."),
    name: z.string().trim().min(2, "Informe um nome de pelo menos dois caracteres.").max(160, "O nome da apresentação deve ter até 160 caracteres."),
    baseQuantity: z.unknown().transform((value, ctx) => {
      const result = exactQuantity.safeParse(value);
      if (!result.success) { ctx.addIssue({ code: "custom", message: "Informe um fator válido, com até seis casas decimais." }); return z.NEVER; }
      return result.data;
    }).refine(
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
