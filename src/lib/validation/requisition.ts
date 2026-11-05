import { z } from "zod";
import { exactQuantity } from "./documents";

const quantity = exactQuantity.transform(Number).pipe(z.number().max(100000, "Quantidade acima do limite permitido."));
const observation = {
  currentStock: quantity.nullable().default(null),
  stockObservation: z.enum(["observed", "unknown", "unfilled"]).optional(),
  stockObservationAt: z.string().datetime({ offset: true }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/).max(40).nullable().optional(),
};
function coherentObservation(value: { currentStock: number | null; stockObservation?: string }, ctx: z.RefinementCtx) {
  if (value.stockObservation && (value.stockObservation === "observed") !== (value.currentStock !== null))
    ctx.addIssue({ code: "custom", path: ["currentStock"], message: "Informe o valor observado, ou escolha desconhecido/não informado sem quantidade." });
}
export const requisitionLineSchema = z
  .object({
    productId: z.string().trim().min(1).max(120),
    productName: z.string().trim().min(1).max(200).optional(),
    category: z.enum(["medicamentos", "higiene", "dieta"]).optional(),
    unit: z.string().trim().min(1).max(80).optional(),
    ...observation,
    urgent: z.boolean(),
    repeatReason: z.string().trim().min(3).max(1000).optional(),
  })
  .strict().superRefine(coherentObservation);

export const extraItemSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1, "Informe o nome do item.").max(200),
    ...observation,
    urgent: z.boolean(),
  })
  .strict().superRefine(coherentObservation);

export const requisitionInputSchema = z
  .object({
    careRecipientId: z.string().uuid(),
    lines: z.array(requisitionLineSchema).max(1000),
    extraItems: z.array(extraItemSchema).max(20),
    observations: z
      .array(
        z.string().trim().min(1, "A observação não pode ser vazia.").max(1000),
      )
      .max(50),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .refine((value) => value.lines.length > 0 || value.extraItems.length > 0, {
    message: "Selecione ou informe ao menos um item.",
    path: ["lines"],
  })
  .refine(
    (value) =>
      new Set(value.lines.map((line) => line.productId)).size ===
      value.lines.length,
    { message: "Não repita produtos do catálogo.", path: ["lines"] },
  )
  .refine(
    (value) =>
      new Set(value.extraItems.map((item) => item.id)).size ===
      value.extraItems.length,
    { message: "Não repita itens extras.", path: ["extraItems"] },
  );

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;
