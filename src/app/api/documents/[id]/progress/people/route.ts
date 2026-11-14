import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid, rpc } from "@/lib/server/api";
import { progressPeoplePage } from "@/lib/validation/document-progress";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api("documents.progress.people", async () => {
    const id = parseUuid((await context.params).id), params = new URL(request.url).searchParams;
    const search = params.get("search") ?? "", page = params.get("page") ?? "1";
    if (search.length > 100 || params.getAll("search").length > 1 || params.getAll("page").length > 1 || !/^[1-9]\d{0,5}$/.test(page))
      throw new ApiError("VALIDATION_ERROR", "Escolha uma busca e uma página válidas.");
    const auth = await authenticate();
    const data = progressPeoplePage.parse(await rpc(auth.client, "document_progress_people", { p_document: id, p_search: search, p_page: Number(page) }));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
