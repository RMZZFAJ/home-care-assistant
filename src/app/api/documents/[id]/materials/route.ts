import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseUuid, rpc, uuid } from "@/lib/server/api";
import { documentMaterialPanel, documentMaterialSummary, materialLinkFilters, materialPanelSections } from "@/lib/validation/document-material-context";

const query = z.object({
  line: uuid.nullable(),
  section: z.enum(materialPanelSections),
  page: z.coerce.number().int().min(1).max(1_000_000),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("documents.materials", async () => {
    const id = parseUuid((await context.params).id);
    const params = new URL(request.url).searchParams;
    const parsed = query.safeParse({ line: params.get("line"), section: params.get("section") ?? "stock", page: params.get("page") ?? 1 });
    const filters = materialLinkFilters.safeParse({ kind: params.get("kind"), search: params.get("search") ?? "" });
    if (!parsed.success || !filters.success)
      throw new ApiError("VALIDATION_ERROR", "Confira o material, os filtros e a página da consulta.");
    const auth = await authenticate();
    const { line, section, page } = parsed.data;
    const result = section === "links" && line ? await rpc(auth.client, "material_related_fichas", {
      p_patient: null, p_product: null, p_document: id, p_line: line,
      p_kind: filters.data.kind, p_search: filters.data.search, p_page: page,
    }) : line && section === "stock" ? await rpc(auth.client, "material_stock_context", {
      p_patient: null, p_product: null, p_document: id, p_line: line, p_page: page,
    }) : line && section === "history" && params.get("view") === "decisions"
      ? await rpc(auth.client, "material_documentary_history", {
        p_patient: null, p_product: null, p_document: id, p_line: line, p_page: page,
      }) : await rpc(auth.client, "document_material_context", {
      p_document: id, p_line: line, p_section: section, p_page: page,
      ...(line && section === "history" ? { p_include_decisions: true } : {}),
    });
    return NextResponse.json((line ? documentMaterialPanel : documentMaterialSummary).parse(result),
      { headers: { "Cache-Control": "no-store" } });
  });
}
