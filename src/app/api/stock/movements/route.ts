import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, databaseError, pageParameters, patientContext, readJson, requireGlobal, rpc, saoPauloDateBoundary, uuid } from "@/lib/server/api";

const location = z.enum(["FAMILY", "CARE_TEAM"]);
const movementSchema = z.object({
  action: z.literal("movement").optional(), careRecipientId: uuid, productId: z.string().trim().min(1).max(120), quantity: z.number().int().positive().max(1_000_000),
  movementType: z.enum(["inbound", "outbound", "transfer", "adjustment"]), sourceLocation: location.nullable(), destinationLocation: location.nullable(),
  justification: z.string().trim().min(1).max(1000), idempotencyKey: uuid, referenceType: z.string().trim().max(80).nullable().optional(), referenceId: uuid.nullable().optional(),
}).strict().refine((v) => v.movementType === "inbound" ? !v.sourceLocation && !!v.destinationLocation : v.movementType === "outbound" ? !!v.sourceLocation && !v.destinationLocation : v.movementType === "transfer" ? !!v.sourceLocation && !!v.destinationLocation && v.sourceLocation !== v.destinationLocation : Boolean(v.sourceLocation) !== Boolean(v.destinationLocation), { message: "Origem e destino incompatíveis com o movimento." });
const exceptionalSchema = z.object({ action: z.literal("exceptionalAdjustment"), careRecipientId: uuid, productId: z.string().trim().min(1).max(120), quantity: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0), location, justification: z.string().trim().min(10).max(1000), confirmation: z.literal(true), idempotencyKey: uuid }).strict();
const schema = z.union([movementSchema, exceptionalSchema]);

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
  return api("stock.write", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "manageStock", true);
    if (input.action === "exceptionalAdjustment") {
      requireGlobal(auth);
      const data = await rpc(auth.client, "extraordinary_stock_adjustment", { p_care_recipient_id: input.careRecipientId, p_product_id: input.productId, p_quantity: input.quantity, p_location: input.location, p_justification: input.justification, p_confirmation: input.confirmation, p_idempotency_key: input.idempotencyKey });
      return NextResponse.json({ data }, { status: 201 });
    }
    const data = await rpc(auth.client, "record_stock_movement", { p_care_recipient_id: input.careRecipientId, p_product_id: input.productId, p_quantity: input.quantity, p_movement_type: input.movementType === "transfer" ? "outbound" : input.movementType, p_source_location: input.sourceLocation, p_destination_location: input.destinationLocation, p_justification: input.justification, p_idempotency_key: input.idempotencyKey, p_reference_type: input.referenceType ?? null, p_reference_id: input.referenceId ?? null });
    return NextResponse.json({ data }, { status: 201 });
  });
}
