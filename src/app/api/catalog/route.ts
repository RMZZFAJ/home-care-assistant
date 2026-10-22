import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, databaseError, patientContext, readJson, rpc, uuid } from "@/lib/server/api";

const schema = z.object({ careRecipientId: uuid, id: z.string().min(1).max(120).nullable(), name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).nullable().optional(), category: z.enum(["medicamentos", "higiene", "dieta"]), unit: z.string().trim().min(1).max(30), aliases: z.array(z.string().trim().min(1).max(160)).max(30), isActive: z.boolean(), sortOrder: z.number().int().min(0).max(1_000_000).default(0) }).strict();

export async function GET(request: Request) {
  return api("catalog.read", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    let query = auth.client.from("care_recipient_products").select("product_id,name,description,category,unit,quantity_decimals,aliases,is_active,sort_order,updated_at").eq("care_recipient_id", patient.id).order("sort_order").order("name");
    // Archived definitions remain readable with their historical stock by authorized members.
    if (params.get("includeInactive") !== "true") query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) databaseError(error);
    return NextResponse.json({ data: (data ?? []).map((item) => ({ ...item, id: item.product_id, active: item.is_active })) });
  });
}

export async function POST(request: Request) {
  return api("catalog.write", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "manage", true);
    const data = await rpc(auth.client, "admin_upsert_recipient_product", { p_care_recipient_id: input.careRecipientId, p_product_id: input.id, p_name: input.name, p_category: input.category, p_unit: input.unit, p_aliases: input.aliases, p_is_active: input.isActive, p_description: input.description ?? null, p_sort_order: input.sortOrder });
    return NextResponse.json({ data }, { status: input.id ? 200 : 201 });
  });
}
