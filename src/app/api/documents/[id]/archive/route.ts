import {
  api,
  authenticate,
  parseQuery,
  parseUuid,
  rpc,
} from "@/lib/server/api";
import {
  archiveQuerySchema,
  pdfArchivePageSchema,
} from "@/lib/documents/pdf-archive";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("documents.archive", async () => {
    const id = parseUuid((await context.params).id),
      query = parseQuery(
        archiveQuerySchema,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
      auth = await authenticate();
    return Response.json(
      pdfArchivePageSchema.parse(
        await rpc(auth.client, "pdf_archive", {
          p_document: id,
          p_version: query.version ?? null,
          p_before: query.before ?? null,
          p_kind: query.kind ?? null,
          p_reference: query.reference ?? null,
          p_limit: 20,
        }),
      ),
    );
  });
}
