import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, databaseError, pageParameters, patientContext, readJson, rpc, uuid } from "@/lib/server/api";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), careRecipientId: uuid, location: z.enum(["FAMILY", "CARE_TEAM"]) }).strict(),
  z.object({ action: z.literal("item"), inventoryId: uuid, productId: z.string().min(1).max(120), countedQuantity: z.number().int().min(0).max(1_000_000), justification: z.string().trim().max(1000).nullable().optional() }).strict(),
  z.object({ action: z.enum(["submit", "approve", "recount"]), inventoryId: uuid }).strict(),
  z.object({ action: z.enum(["review", "reject", "cancel"]), inventoryId: uuid, reason: z.string().trim().min(1).max(1000) }).strict(),
]);

export async function GET(request: Request) {
  return api("inventory.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize, start, end } = pageParameters(params);
    let query = auth.client.from("stock_inventories").select("*,stock_inventory_items(*)", { count: "exact" }).eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, end);
    if (params.get("inventoryId")) {
      if (!uuid.safeParse(params.get("inventoryId")).success) throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
      query = query.eq("id", params.get("inventoryId"));
    }
    const [{ data, error, count }, latest] = await Promise.all([query, auth.client.from("stock_inventories").select("id,location,counted_at,approved_at").eq("care_recipient_id", patient.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle()]);
    if (error) databaseError(error);
    if (latest.error) databaseError(latest.error);
    return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0, lastApproved: latest.data });
  });
}

export async function POST(request: Request) {
  return api("inventory.write", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    if (input.action === "create") {
      await patientContext(auth, input.careRecipientId, "countStock", true);
      return NextResponse.json({ data: await rpc(auth.client, "create_stock_inventory", { p_care_recipient_id: input.careRecipientId, p_location: input.location }) }, { status: 201 });
    }
    const { data: inventory, error } = await auth.client.from("stock_inventories").select("care_recipient_id").eq("id", input.inventoryId).maybeSingle();
    if (error) databaseError(error);
    if (!inventory) throw new ApiError("NOT_FOUND", "Inventário não encontrado.", 404);
    await patientContext(auth, inventory.care_recipient_id, ["approve", "review", "reject", "cancel"].includes(input.action) ? "manageStock" : "countStock", true);
    const data = input.action === "item" ? await rpc(auth.client, "add_stock_inventory_item", { p_inventory_id: input.inventoryId, p_product_id: input.productId, p_counted_quantity: input.countedQuantity, p_justification: input.justification || null })
      : input.action === "submit" ? await rpc(auth.client, "submit_stock_inventory", { p_inventory_id: input.inventoryId })
        : input.action === "approve" ? await rpc(auth.client, "approve_stock_inventory", { p_inventory_id: input.inventoryId })
          : input.action === "recount" ? await rpc(auth.client, "recount_stock_inventory", { p_inventory_id: input.inventoryId })
            : await rpc(auth.client, "review_stock_inventory", { p_inventory_id: input.inventoryId, p_action: input.action === "review" ? "under_review" : input.action === "reject" ? "rejected" : "cancelled", p_reason: "reason" in input ? input.reason : null });
    return NextResponse.json({ data });
  });
}
