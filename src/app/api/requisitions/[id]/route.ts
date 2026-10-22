import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  rpc,
  uuid,
} from "@/lib/server/api";
import { loadReceipt } from "@/lib/server/receipts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("requisitions.detail", async () => {
    const auth = await authenticate();
    const { id } = await context.params;
    if (!uuid.safeParse(id).success)
      throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const { data, error } = await auth.client
      .from("requisitions")
      .select(
        "id,code,protocol,care_recipient_id,status,created_at,updated_at,is_historical,requester_name_snapshot,recipient_name_snapshot,profiles!requisitions_created_by_fkey(full_name),care_recipients(display_name),requisition_items(id,product_id,custom_name,current_stock,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source,products(name,category,unit)),requisition_observations(body,created_at),requisition_status_history(id,from_status,to_status,changed_by,changed_at,reason),requisition_notifications(id,recipient_group,recipient_label,channel,state,attempts,attempted_at)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data)
      throw new ApiError("NOT_FOUND", "Requisição não encontrada.", 404);
    await patientContext(auth, data.care_recipient_id);
    const receipt = await loadReceipt(auth.client, id);
    const { data: resolutions, error: resolutionError } = await auth.client
      .from("requisition_item_resolutions")
      .select("requisition_item_id,product_id,reason,created_at")
      .eq("care_recipient_id", data.care_recipient_id)
      .in(
        "requisition_item_id",
        data.requisition_items.map((item) => item.id),
      );
    if (resolutionError) databaseError(resolutionError);
    const [notifications, fulfillment] = await Promise.all([
      rpc(auth.client, "document_delivery_status", { p_document: id }),
      rpc(auth.client, "requisition_fulfillment", { p_requisition: id }),
    ]);
    return NextResponse.json({
      data: {
        ...data,
        requisition_items: data.requisition_items.map((item) => ({
          ...item,
          resolution:
            resolutions?.find(
              (resolution) => resolution.requisition_item_id === item.id,
            ) ?? null,
        })),
        requisition_notifications: notifications ?? [],
        fulfillment,
      },
      receipt,
    });
  });
}
