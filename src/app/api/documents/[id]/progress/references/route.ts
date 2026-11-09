import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseUuid, rpc } from "@/lib/server/api";
import { progressReferenceRow } from "@/lib/validation/document-progress";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("documents.progress.references", async () => {
    const { id } = await context.params, documentId = parseUuid(id);
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim() ?? "", rawPage = params.get("page") ?? "1";
    if (params.getAll("search").length > 1 || params.getAll("page").length > 1
      || !/^[A-Za-z0-9-]{0,100}$/.test(search) || !/^[1-9]\d{0,5}$/.test(rawPage))
      throw new ApiError("VALIDATION_ERROR", "Busque pelo código da ficha e escolha uma página válida.");
    const auth = await authenticate();
    const doc = z.object({ care_recipient_id: z.string().uuid() }).parse(await rpc(auth.client, "operational_document", { p_id: documentId }));
    const result = z.object({ data: z.array(progressReferenceRow).max(20), total: z.number().int().nonnegative() }).parse(
      await rpc(auth.client, "operational_document_list", { p_patient: doc.care_recipient_id, p_search: search || null, p_page: Number(rawPage), p_size: 20 }));
    return NextResponse.json({ documentId, careRecipientId: doc.care_recipient_id, search, page: Number(rawPage), size: 20, ...result },
      { headers: { "Cache-Control": "private, no-store" } });
  });
}
