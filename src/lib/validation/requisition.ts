import { z } from "zod";

const quantity = z.number().finite().min(0, "Informe uma quantidade igual ou maior que zero.").max(100000, "Quantidade acima do limite permitido.");
const requested = z.number().finite().int("Use unidades inteiras.").min(1, "Informe ao menos uma unidade.").max(100000, "Quantidade acima do limite permitido.");

export const requisitionLineSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  category: z.enum(["medicamentos", "higiene", "dieta"]),
  currentStock: quantity,
  requestedQuantity: requested,
  urgent: z.boolean(),
});

export const extraItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Informe o nome do item."),
  currentStock: quantity,
  requestedQuantity: requested,
  urgent: z.boolean(),
});

export const requisitionInputSchema = z.object({
  lines: z.array(requisitionLineSchema),
  extraItems: z.array(extraItemSchema),
  observations: z.array(z.string().trim().min(1, "A observação não pode ser vazia.").max(1000)).max(50),
  idempotencyKey: z.string().uuid(),
}).refine((value) => value.lines.length > 0 || value.extraItems.length > 0, { message: "Selecione ou informe ao menos um item.", path: ["lines"] });

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;
