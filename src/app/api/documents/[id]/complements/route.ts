import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { complementAttemptSchema, complementsQuery, linkComplementInput, linkComplementResult, parseComplementCandidates, parseDocumentComplements } from "@/lib/documents/document-complements";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api("documents.complements.read", async () => {
    const id = parseUuid((await context.params).id);
    const query = complementsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success || (query.data.mode === "candidates" && !query.data.type) || (query.success && query.data.mode === "attempt" && !query.data.key))
      throw new ApiError("VALIDATION_ERROR", "Revise a consulta de fichas complementares.", 400);
    const auth = await authenticate();
    const { mode, type, search, page, key } = query.data;
    if (mode === "attempt" && key) {
      const data = complementAttemptSchema.parse(await rpc(auth.client, "document_complement_attempt", { p_source: id, p_key: key }));
      if (data.sourceId !== id || data.key !== key) throw new ApiError("PERSISTENCE_UNCONFIRMED", "Consulte a mesma tentativa de vínculo.", 503, true);
      return NextResponse.json({ data });
    }
    const data = mode === "candidates" && type
      ? parseComplementCandidates(await rpc(auth.client, "document_complement_candidates", { p_id: id, p_type: type, p_search: search, p_page: page, p_size: 20 }), id, type, search, page)
      : parseDocumentComplements(await rpc(auth.client, "document_complements", { p_id: id, p_page: page, p_size: 20 }), id, page);
    return NextResponse.json({ data });
  });
}
export async function POST(request: Request, context: Context) {
  return api("documents.complements.link", async () => {
    const id = parseUuid((await context.params).id), input = await readJson(request, linkComplementInput), auth = await authenticate();
    const data = linkComplementResult.parse(await rpc(auth.client, "link_document_complement", {
      p_source: id, p_child: input.childId, p_source_version: input.sourceVersion,
      p_child_version: input.childVersion, p_reason: input.reason, p_key: input.idempotencyKey,
    }));
    if (data.key !== input.idempotencyKey || !data.link.accessible || data.link.role !== "supplement"
      || data.link.document.id !== input.childId || data.link.sourceVersion !== input.sourceVersion
      || data.link.childVersion !== input.childVersion || data.link.reason !== input.reason)
      throw new ApiError("PERSISTENCE_UNCONFIRMED", "Consulte o vínculo antes de repetir a mesma tentativa.", 503, true);
    return NextResponse.json({ data, persistence: "confirmed" });
  });
}
