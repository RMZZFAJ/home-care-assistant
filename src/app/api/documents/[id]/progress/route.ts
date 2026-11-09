import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { progressFilter, publishProgress } from "@/lib/validation/document-progress";

type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, context: Context) {
  return api("documents.progress.read", async () => {
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    const filter = progressFilter.safeParse(params.get("filter") ?? "all");
    const selectedPage = params.get("page") ?? "1";
    if (!filter.success || params.getAll("filter").length > 1 || params.getAll("page").length > 1
      || !/^[1-9]\d{0,5}$/.test(selectedPage)) throw new ApiError("VALIDATION_ERROR", "Escolha uma página e um filtro válidos.");
    const auth = await authenticate();
    const data = await rpc(auth.client, "document_progress", { p_document: parseUuid(id), p_filter: filter.data, p_page: Number(selectedPage), p_size: 20 });
    return NextResponse.json({ data }, { headers });
  });
}

export async function POST(request: Request, context: Context) {
  return api("documents.progress.publish", async () => {
    const { id } = await context.params;
    const input = await readJson(request, publishProgress);
    const auth = await authenticate();
    const result = await rpc(auth.client, "document_progress_publish", { p_document: parseUuid(id), p_key: input.key, p_body: input.content });
    return NextResponse.json(result, { headers });
  });
}
