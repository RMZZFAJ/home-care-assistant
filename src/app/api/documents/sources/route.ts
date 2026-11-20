import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, patientContext, rpc } from "@/lib/server/api";
import { parseSupplySources, supplySourceFilter, supplySourceTarget } from "@/lib/validation/supply-sources";

const query = z.object({
  target: supplySourceTarget,
  filter: supplySourceFilter,
  search: z.string().regex(/^[a-zA-Z0-9-]{0,100}$/),
  page: z.coerce.number().int().min(1).max(100000),
  ids: z.array(z.uuid()).max(100).nullable(),
  productId: z.string().min(1).max(120).nullable(),
});

export async function GET(request: Request) {
  return api("documents.sources", async () => {
    const params = new URL(request.url).searchParams;
    const parsed = query.safeParse({
      target: params.get("target"),
      filter: params.get("type") ?? "",
      search: params.get("search")?.trim() ?? "",
      page: params.get("page") ?? 1,
      ids: params.has("ids") ? params.get("ids")?.split(",") : null,
      productId: params.get("productId"),
    });
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira os filtros das fichas de origem.");
    const { target, filter, search, page, ids, productId } = parsed.data;
    const auth = await authenticate();
    const patient = await patientContext(auth, params.get("careRecipientId"), target === "DEV" ? "ent.create" : target.toLowerCase() + ".create");
    const data = await rpc(auth.client, "supply_source_options", {
      p_patient: patient.id, p_target: target, p_filter: filter, p_search: search,
      p_page: page, p_ids: ids, p_product: productId,
    });
    return NextResponse.json(parseSupplySources(data, patient.id, target, page), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
