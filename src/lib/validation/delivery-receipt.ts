import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

export const countedDeliveryReceiptBody = z.object({
  countedReceipt: z.object({
    lines: z.array(z.object({
      lineId: z.uuid(),
      receivedQuantity: exactQuantity,
    }).strict()).min(1).max(1000).refine(
      lines => new Set(lines.map(line => line.lineId.toLowerCase())).size === lines.length,
      "Confira cada material uma única vez.",
    ),
    notes: z.string().refine((value) => value.length <= 1000).optional(),
  }).strict(),
}).strict();

export type CountedDeliveryReceiptBody = z.output<typeof countedDeliveryReceiptBody>;
