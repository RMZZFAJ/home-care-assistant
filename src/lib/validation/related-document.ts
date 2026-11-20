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
  care_recipient_id: z.uuid().optional(),
  code: z.string().nullable(), protocol: z.string().nullable().optional(),
  created_at: z.string().datetime({ offset: true }), lines: z.array(line),
  canonical_snapshot: z.record(z.string(), z.unknown()).optional(),
  payload: z.object({ pendingExtras: z.unknown().optional() }).optional(),
  workflow_data: z.object({ documentArchive: z.unknown().optional(), purchaseExtraResolutions: z.unknown().optional() }).optional(),
  transfer: z.object({ state: z.enum(["pending", "agreed", "declined", "withdrawn", "dispatched"]) }).nullable().optional(),
}) });

/** Project only the authorized facts used by the read-only related consultation. */
export function parseRelatedSupplyRead(value: unknown, id: string, type: SupplyType, patientId?: string) {
  const parsed = response.safeParse(value);
  if (!parsed.success || parsed.data.data.id !== id || parsed.data.data.type !== type ||
      patientId && parsed.data.data.care_recipient_id !== patientId)
    throw new Error("A ficha consultada não corresponde à referência. Atualize esta consulta.");
  return parsed.data;
}

const requisition = z.object({ data: z.object({
  id: z.uuid(), care_recipient_id: z.uuid(), status: z.string(),
  code: z.string().nullable(), protocol: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  requester_name_snapshot: z.string().nullable(), recipient_name_snapshot: z.string().nullable(),
  documentArchive: z.unknown().optional(),
  progress: z.object({ version: z.number().int().positive(), materialIdentity: z.string().min(1) }).nullish(),
  requisition_items: z.array(z.object({
    id: z.uuid(), product_name_snapshot: z.string().nullable(), custom_name: z.string().nullable(),
    urgent: z.boolean(), unit_snapshot: z.string().nullable(),
    current_stock: z.union([z.string(), z.number()]).nullable(),
    stock_observation: z.enum(["observed", "unknown", "unfilled", "legacy_unclassified"]).nullable(),
    stock_observation_at: z.iso.datetime({ offset: true }).nullable(),
    stock_observation_time_source: z.enum(["client_draft", "server_submission", "legacy_unknown"]).nullable(),
  })),
}) });

export function parseRelatedRequisitionRead(value: unknown, id: string, patientId?: string) {
  const parsed = requisition.safeParse(value);
  if (!parsed.success || parsed.data.data.id !== id || patientId && parsed.data.data.care_recipient_id !== patientId)
    throw new Error("A ficha consultada não corresponde à referência. Atualize esta consulta.");
  return parsed.data;
}
