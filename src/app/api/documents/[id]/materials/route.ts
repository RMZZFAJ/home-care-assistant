import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseUuid, rpc, uuid } from "@/lib/server/api";
import { documentMaterialPanel, documentMaterialSummary, materialPanelSections } from "@/lib/validation/document-material-context";

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
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira o material e a página da consulta.");
    const auth = await authenticate();
    const { line, section, page } = parsed.data;
    const result = await rpc(auth.client, "document_material_context", {
      p_document: id, p_line: line, p_section: section, p_page: page,
      ...(line && section === "history" ? { p_include_decisions: true } : {}),
    });
    return NextResponse.json((line ? documentMaterialPanel : documentMaterialSummary).parse(result),
      { headers: { "Cache-Control": "no-store" } });
  });
}
