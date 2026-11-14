import { z } from "zod";
import type { SupplyType } from "@/types/documents";
import { exactQuantity } from "./documents";

const line = z.object({
  id: z.string().uuid(), product_id: z.string().min(1),
  name_snapshot: z.string(), unit_snapshot: z.string(), category_snapshot: z.string(),
  quantity: exactQuantity, approved_quantity: exactQuantity, purchased_quantity: exactQuantity,
  accepted_quantity: exactQuantity, reconciled_quantity: exactQuantity,
  fully_checked: z.boolean(), metadata: z.record(z.string(), z.unknown()),
  presentation_conversions: z.unknown().optional(), requisitionItemIds: z.array(z.string().uuid()),
});
const response = z.object({ data: z.object({
  id: z.string().uuid(), type: z.enum(["COM", "ENT", "BAL"]), status: z.string(),
  code: z.string(), created_at: z.string().datetime({ offset: true }), lines: z.array(line),
  transfer: z.object({ state: z.enum(["pending", "agreed", "declined", "withdrawn", "dispatched"]) }).nullable().optional(),
}) });

/** Project only the authorized facts used by the read-only related consultation. */
export function parseRelatedSupplyRead(value: unknown, id: string, type: SupplyType) {
  const parsed = response.safeParse(value);
  if (!parsed.success || parsed.data.data.id !== id || parsed.data.data.type !== type)
    throw new Error("A ficha consultada não corresponde à referência. Atualize esta consulta.");
  return parsed.data;
}
