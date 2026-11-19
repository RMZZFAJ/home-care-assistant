import { z } from "zod";
import { exactQuantity } from "./exact-quantity";
import { purchaseCoverageChoice } from "./purchase-coverage";

export const purchaseArrivalBody = z.object({
  lines: z.array(z.object({
    lineId: z.uuid().transform(id => id.toLowerCase()),
    quantity: exactQuantity,
    expectedQuantity: exactQuantity.optional(),
    remainingAction: z.enum(["wait", "short"]).optional(),
    excessConfirmed: z.literal(true).optional(),
    coverage: purchaseCoverageChoice.optional(),
  }).strict()).min(1).max(1000).refine(lines => new Set(lines.map(line => line.lineId)).size === lines.length,
    "Selecione cada material uma única vez."),
}).strict();

export type PurchaseArrivalSelection = z.infer<typeof purchaseArrivalBody>["lines"];
export const requestArrivalCorrection = z.object({ receiptId: z.uuid(), reason: z.string().trim().min(3).max(1000) }).strict();
export const resubmitArrival = purchaseArrivalBody.extend({ receiptId: z.uuid() });
