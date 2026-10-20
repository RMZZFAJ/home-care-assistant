import { z } from "zod";

const quantity = z.number().finite().int("Use unidades inteiras.").min(0, "Informe uma quantidade igual ou maior que zero.").max(100000, "Quantidade acima do limite permitido.");
const requested = z.number().finite().int("Use unidades inteiras.").min(1, "Informe ao menos uma unidade.").max(100000, "Quantidade acima do limite permitido.");

export const requisitionLineSchema = z.object({
  productId: z.string().trim().min(1).max(120),
  productName: z.string().trim().min(1).max(200),
  category: z.enum(["medicamentos", "higiene", "dieta"]),
  currentStock: quantity,
  requestedQuantity: requested,
  urgent: z.boolean(),
}).strict();

export const extraItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1, "Informe o nome do item.").max(200),
  currentStock: quantity,
  requestedQuantity: requested,
  urgent: z.boolean(),
}).strict();

export const requisitionInputSchema = z.object({
  lines: z.array(requisitionLineSchema).max(29),
  extraItems: z.array(extraItemSchema).max(20),
  observations: z.array(z.string().trim().min(1, "A observação não pode ser vazia.").max(1000)).max(50),
  idempotencyKey: z.string().uuid(),
}).strict()
  .refine((value) => value.lines.length > 0 || value.extraItems.length > 0, { message: "Selecione ou informe ao menos um item.", path: ["lines"] })
  .refine((value) => new Set(value.lines.map((line) => line.productId)).size === value.lines.length, { message: "Não repita produtos do catálogo.", path: ["lines"] })
  .refine((value) => new Set(value.extraItems.map((item) => item.id)).size === value.extraItems.length, { message: "Não repita itens extras.", path: ["extraItems"] });

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;
