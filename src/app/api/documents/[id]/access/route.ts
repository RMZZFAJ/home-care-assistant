import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { accessCursorSchema, recordDocumentAccessSchema } from "@/lib/documents/document-access";

type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request, context: Context) {
  return api("documents.access.read", async () => {
    const id = parseUuid((await context.params).id), params = new URL(request.url).searchParams;
    const cursor = params.has("beforeAt") || params.has("beforeId")
      ? accessCursorSchema.safeParse({ at: params.get("beforeAt"), id: params.get("beforeId") }) : null;
    if (cursor && !cursor.success || params.getAll("beforeAt").length > 1 || params.getAll("beforeId").length > 1)
      throw new ApiError("VALIDATION_ERROR", "Escolha uma referência completa do histórico de acesso.");
    const auth = await authenticate();
    const data = await rpc(auth.client, "document_access_history", { p_document: id, p_before_at: cursor?.success ? cursor.data.at : null, p_before_id: cursor?.success ? cursor.data.id : null });
    return NextResponse.json({ data }, { headers });
  });
}
export async function POST(request: Request, context: Context) {
  return api("documents.access.record", async () => {
    const id = parseUuid((await context.params).id), input = await readJson(request, recordDocumentAccessSchema), auth = await authenticate();
    const data = await rpc(auth.client, "record_document_access", { p_document: id, p_version: input.referenceVersion, p_key: input.key });
    return NextResponse.json({ data }, { headers });
  });
}
