import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid, rpc } from "@/lib/server/api";

export async function GET(request: Request, context: { params: Promise<{ id: string; }>; }) {
  return api("documents.progress.references", async () => {
    const { id } = await context.params, documentId = parseUuid(id);
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim() ?? "", rawPage = params.get("page") ?? "1";
    if (params.getAll("search").length > 1 || params.getAll("page").length > 1
      || search.length > 100 || !/^[1-9]\d{0,5}$/.test(rawPage))
      throw new ApiError("VALIDATION_ERROR", "Busque uma ficha ou andamento e escolha uma página válida.");
    const auth = await authenticate();
    const result = await rpc(auth.client, "document_progress_references", { p_document: documentId, p_search: search, p_page: Number(rawPage) });
    return NextResponse.json(result,
      { headers: { "Cache-Control": "private, no-store" } });
  });
}
