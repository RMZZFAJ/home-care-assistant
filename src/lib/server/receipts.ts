import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCategory, RequisitionReceipt } from "@/types/requisition";
import { ApiError, databaseError } from "@/lib/server/api";

// Only snapshots from the original transaction are authoritative. Legacy rows
// retain their identity but are explicitly marked as reconstructed.
export async function loadReceipt(client: SupabaseClient, id: string): Promise<RequisitionReceipt> {
  const { data, error } = await client.from("requisitions").select("id,protocol,created_at,requester_name_snapshot,recipient_name_snapshot,profiles!requisitions_created_by_fkey(full_name),care_recipients(display_name),requisition_items(id,product_id,custom_name,current_stock,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source,products(name,category,unit)),requisition_observations(body)").eq("id", id).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("NOT_FOUND", "Comprovante não encontrado.", 404);
  const requester = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const patient = Array.isArray(data.care_recipients) ? data.care_recipients[0] : data.care_recipients;
  const items = data.requisition_items ?? [];
  return {
    requisitionId: data.id,
    protocol: data.protocol,
    requesterName: data.requester_name_snapshot ?? requester?.full_name ?? "Solicitante desconhecido",
    recipientName: data.recipient_name_snapshot ?? patient?.display_name ?? "Paciente não identificado",
    createdAt: data.created_at,
    legacyReconstructed: !data.requester_name_snapshot || !data.recipient_name_snapshot || items.some((item) => item.snapshot_source !== "persisted"),
    lines: items.filter((item) => item.product_id).map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return { productId: item.product_id, productName: item.product_name_snapshot ?? product?.name ?? "Produto arquivado", category: (item.category_snapshot ?? product?.category ?? "higiene") as ProductCategory, unit: item.unit_snapshot ?? product?.unit ?? "unidade", currentStock: item.current_stock ?? null, urgent: item.urgent };
    }),
    extraItems: items.filter((item) => !item.product_id).map((item) => ({ id: item.id, name: item.product_name_snapshot ?? item.custom_name ?? "Item extra", currentStock: item.current_stock ?? null, urgent: item.urgent })),
    observations: (data.requisition_observations ?? []).map((item) => item.body),
  };
}
