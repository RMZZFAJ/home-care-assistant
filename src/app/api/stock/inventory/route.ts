import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  pageParameters,
  patientContext,
  uuid,
} from "@/lib/server/api";

export async function GET(request: Request) {
  return api("inventory.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize, start, end } = pageParameters(params);
    let query = auth.client
      .from("stock_inventories")
      .select("*,stock_inventory_items(*)", { count: "exact" })
      .eq("care_recipient_id", patient.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);
    if (params.get("inventoryId")) {
      if (!uuid.safeParse(params.get("inventoryId")).success)
        throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
      query = query.eq("id", params.get("inventoryId"));
    }
    const [{ data, error, count }, latest] = await Promise.all([
      query,
      auth.client
        .from("stock_inventories")
        .select("id,location,counted_at,approved_at")
        .eq("care_recipient_id", patient.id)
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (error) databaseError(error);
    if (latest.error) databaseError(latest.error);
    return NextResponse.json({
      data: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
      lastApproved: latest.data,
    });
  });
}

export async function POST() {
  return api("inventory.retired", async () => {
    await authenticate();
    throw new ApiError(
      "INVALID_OPERATION",
      "Este fluxo de inventário foi substituído pela ficha BAL da equipe. Use os controles de estoque familiar para ajustes administrativos.",
      410,
    );
  });
}
