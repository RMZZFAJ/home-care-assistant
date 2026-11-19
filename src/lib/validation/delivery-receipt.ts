import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

const reason = z.string().trim().min(3).max(1000);

export const countedDeliveryReceiptBody = z.object({
  countedReceipt: z.object({
    lines: z.array(z.object({
      lineId: z.uuid(),
      receivedQuantity: exactQuantity,
      reviewReason: reason.optional(),
    }).strict()).min(1).max(1000).refine(
      lines => new Set(lines.map(line => line.lineId.toLowerCase())).size === lines.length,
      "Confira cada material uma única vez.",
    ),
    notes: z.string().refine((value) => value.length <= 1000).optional(),
  }).strict(),
}).strict();

export type CountedDeliveryReceiptBody = z.output<typeof countedDeliveryReceiptBody>;

export const deliveryResolutionBody = z.object({
  lineId: z.uuid(),
  quantity: exactQuantity,
  resolution: z.enum(["received", "missing", "returned", "not_sent"]),
  reason,
  familyAssessment: z.enum(["partial", "complete"]).optional(),
}).strict();

export type DeliveryResolutionBody = z.output<typeof deliveryResolutionBody>;
export const requestDeliveryNeedBody = z.object({ lineId: z.uuid(), reason }).strict();
