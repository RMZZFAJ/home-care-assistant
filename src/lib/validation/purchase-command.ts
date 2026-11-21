import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

export const purchaseCommandBody = z.object({
  lines: z.array(z.object({
    lineId: z.uuid().transform(value => value.toLowerCase()),
    quantity: exactQuantity,
    inHand: z.boolean().optional(),
    expectedDate: z.iso.date().optional(),
  }).strict().refine(line => !line.inHand || !line.expectedDate, {
    path: ["expectedDate"],
    message: "Informe a previsão somente para material que ainda vai chegar.",
  })).min(1).max(1000).refine(lines => new Set(lines.map(line => line.lineId)).size === lines.length,
    "Registre cada material uma única vez."),
  notes: z.string().max(1000).optional(),
}).strict();

export type PurchaseSelection = z.infer<typeof purchaseCommandBody>["lines"];
