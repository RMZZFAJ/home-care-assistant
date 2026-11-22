import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, patientContext, rpc, uuid } from "@/lib/server/api";
import { documentMaterialPanel, materialLinkFilters, materialPanelSections } from "@/lib/validation/document-material-context";

const query = z.object({
  careRecipientId: uuid,
  productId: z.string().min(1).max(120),
  section: z.enum(materialPanelSections),
  page: z.coerce.number().int().min(1).max(1_000_000),
});

export async function GET(request: Request) {
  return api("catalog.material", async () => {
    const params = new URL(request.url).searchParams;
    const parsed = query.safeParse({
      careRecipientId: params.get("careRecipientId"), productId: params.get("productId"),
      section: params.get("section") ?? "stock", page: params.get("page") ?? 1,
    });
    const filters = materialLinkFilters.safeParse({ kind: params.get("kind"), search: params.get("search") ?? "" });
    if (!parsed.success || !filters.success) throw new ApiError("VALIDATION_ERROR", "Confira o paciente, o material e os filtros da consulta.");
    const auth = await authenticate();
    const input = parsed.data;
    const patient = await patientContext(auth, input.careRecipientId);
    const result = input.section === "links" ? await rpc(auth.client, "material_related_fichas", {
      p_patient: patient.id, p_product: input.productId, p_document: null, p_line: null,
      p_kind: filters.data.kind, p_search: filters.data.search, p_page: input.page,
    }) : input.section === "history" && params.get("view") === "decisions"
      ? await rpc(auth.client, "material_documentary_history", {
        p_patient: patient.id, p_product: input.productId, p_document: null, p_line: null, p_page: input.page,
      }) : await rpc(auth.client, "catalogue_material_context", {
      p_patient: patient.id, p_product: input.productId, p_section: input.section, p_page: input.page,
    });
    return NextResponse.json(documentMaterialPanel.parse(result), { headers: { "Cache-Control": "no-store" } });
  });
}
