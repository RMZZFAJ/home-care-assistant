import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, databaseError, patientContext, readJson, rpc, uuid } from "@/lib/server/api";
import { exactQuantity } from "@/lib/validation/documents";

export async function GET(request: Request) { return api("presentations.read", async () => {
  const auth = await authenticate(); const params = new URL(request.url).searchParams; const patient = await patientContext(auth, params.get("careRecipientId"));
  let query = auth.client.from("product_presentations").select("*").eq("care_recipient_id", patient.id).eq("active", true);
  const code = params.get("barcode");
  if (code) { if (!/^\d{8,14}$/.test(code)) throw new ApiError("VALIDATION_ERROR", "Código de barras inválido."); query = query.eq("barcode", code); }
  const [result, units] = await Promise.all([query.order("name"), auth.client.from("measurement_units").select("*").order("name")]);
  if (result.error) databaseError(result.error); if (units.error) databaseError(units.error);
  return NextResponse.json({ data: result.data ?? [], units: units.data ?? [] });
}); }
export async function POST(request: Request) { return api("presentations.configure", async () => {
  const input = await readJson(request, z.object({ careRecipientId: uuid, productId: z.string().min(1).max(120), unit: z.string().min(1).max(30), decimals: z.number().int().min(0).max(6), barcode: z.string().regex(/^\d{8,14}$/).optional(), name: z.string().min(2).max(160).optional(), baseQuantity: exactQuantity.optional() }).strict());
  const auth = await authenticate(); await patientContext(auth, input.careRecipientId, "catalog.manage", true);
  return NextResponse.json({ data: await rpc(auth.client, "configure_catalogue_unit", { p_patient: input.careRecipientId, p_product: input.productId, p_unit: input.unit, p_decimals: input.decimals, p_barcode: input.barcode ?? null, p_presentation: input.name ?? null, p_base_quantity: input.baseQuantity ?? null }) });
}); }
