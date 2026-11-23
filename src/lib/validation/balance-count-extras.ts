import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

const extraFields = z.object({
  id: z.uuid(),
  name: z.string().max(200),
  unit: z.string().max(80),
  quantity: z.string().max(64),
}).strict();

export const draftBalanceExtras = z.array(extraFields).max(20).refine(uniqueIds);
export const issuedBalanceExtras = z.array(extraFields.extend({
  name: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(80),
  quantity: exactQuantity,
})).max(20).refine(uniqueIds);

export type BalanceCountExtra = z.infer<typeof extraFields>;
function uniqueIds(items: BalanceCountExtra[]) {
  return new Set(items.map(item => item.id)).size === items.length;
}
