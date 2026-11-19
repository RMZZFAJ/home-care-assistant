import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

export const purchaseArrivalBody = z.object({
  lines: z.array(z.object({
    lineId: z.uuid().transform(id => id.toLowerCase()),
    quantity: exactQuantity,
    expectedQuantity: exactQuantity.optional(),
    remainingAction: z.enum(["wait", "short"]).optional(),
    excessConfirmed: z.literal(true).optional(),
  }).strict()).min(1).max(1000).refine(lines => new Set(lines.map(line => line.lineId)).size === lines.length,
    "Selecione cada material uma única vez."),
}).strict();

export type PurchaseArrivalSelection = z.infer<typeof purchaseArrivalBody>["lines"];
