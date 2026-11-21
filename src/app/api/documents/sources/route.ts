import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, patientContext, rpc } from "@/lib/server/api";
import { parseSupplySources, sourcePickerTarget, supplySourceFilter } from "@/lib/validation/supply-sources";

const query = z.object({
  target: sourcePickerTarget,
  filter: supplySourceFilter,
  search: z.string().regex(/^[a-zA-Z0-9-]{0,100}$/),
  page: z.coerce.number().int().min(1).max(100000),
  ids: z.array(z.uuid()).max(100).nullable(),
  productId: z.string().min(1).max(120).nullable(),
  observations: z.enum(["0", "1"]),
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
      observations: params.get("observations") ?? "0",
    });
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira os filtros das fichas de origem.");
    const { target, filter, search, page, ids, productId, observations } = parsed.data;
    const reference = target === "REQ" || target === "BAL";
    if (reference && !productId) throw new ApiError("VALIDATION_ERROR", "Escolha o material a vincular.");
    if (observations === "1" && (target !== "COM" || !ids))
      throw new ApiError("VALIDATION_ERROR", "Escolha as requisições vinculadas à compra.");
    const auth = await authenticate();
    const capability = target === "DEV" ? "ent.create" : target === "BAL" ? "bal.count" : target.toLowerCase() + ".create";
    const patient = await patientContext(auth, params.get("careRecipientId"), capability);
    const args = {
      p_patient: patient.id, p_filter: filter, p_search: search,
      p_page: page, p_ids: ids, p_product: productId,
    };
    const data = observations === "1"
      ? await rpc(auth.client, "purchase_source_observation_options", args)
      : await rpc(auth.client, reference ? "material_reference_options" : "supply_source_options", { ...args, p_target: target });
    return NextResponse.json(parseSupplySources(data, patient.id, target, page), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
