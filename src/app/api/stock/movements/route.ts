import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, databaseError, pageParameters, patientContext, readJson, rpc, saoPauloDateBoundary, uuid } from "@/lib/server/api";
import { exactQuantity } from "@/lib/validation/documents";

const location = z.enum(["FAMILY", "CARE_TEAM", "TRANSIT"]);
const schema = z.object({ careRecipientId: uuid, productId: z.string().trim().min(1).max(120), quantity: exactQuantity, action: z.enum(["inbound", "outbound", "correction_in", "correction_out"]), reason: z.string().trim().min(3).max(1000), idempotencyKey: uuid, referenceId: uuid.optional() }).strict();
export async function GET(request: Request) {
  return api("stock.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize, start, end } = pageParameters(params);
    let query = auth.client.from("stock_movements").select("id,care_recipient_id,product_id,quantity,movement_type,source_location,destination_location,justification,created_at,performed_by,reference_type,reference_id,source_balance_before,source_balance_after,destination_balance_before,destination_balance_after", { count: "exact" }).eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, end);
    if (params.get("productId")) query = query.eq("product_id", params.get("productId"));
    if (params.get("from")) query = query.gte("created_at", saoPauloDateBoundary(params.get("from")!));
    if (params.get("to")) query = query.lt("created_at", saoPauloDateBoundary(params.get("to")!, true));
    if (location.safeParse(params.get("location")).success) query = query.or(`source_location.eq.${params.get("location")},destination_location.eq.${params.get("location")}`);
    const [movements, balances, alerts] = await Promise.all([
      query,
      auth.client.from("current_stock_balances").select("care_recipient_id,product_id,location,balance").eq("care_recipient_id", patient.id),
      auth.client.from("stock_alert_events").select("*").eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (movements.error) databaseError(movements.error);
    if (balances.error) databaseError(balances.error);
    if (alerts.error) databaseError(alerts.error);
    return NextResponse.json({ data: movements.data ?? [], balances: balances.data ?? [], alerts: alerts.data ?? [], page, pageSize, total: movements.count ?? 0 });
  });
}


export async function POST(request: Request) {
  return api("stock.family.write", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "stock.family.manage", true);
    const id = await rpc(auth.client, "family_stock_movement", { p_patient: input.careRecipientId, p_product: input.productId, p_quantity: input.quantity, p_action: input.action, p_reason: input.reason, p_key: input.idempotencyKey, p_reference: input.referenceId ?? null });
    return NextResponse.json({ id, persistence: "confirmed" }, {status: 201});
  });
}

