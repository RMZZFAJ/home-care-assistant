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
    const paging = {
      p_document: id,
      p_before: query.before ?? null,
      p_kind: query.kind ?? null,
      p_reference: query.reference ?? null,
      p_limit: 20,
    };
    return Response.json(
      pdfArchivePageSchema.parse(
        query.filter
          ? await rpc(auth.client, "pdf_archive_by_revision", { ...paging, p_filter: query.filter, p_basis: query.basis ?? null })
          : await rpc(auth.client, "pdf_archive", { ...paging, p_version: query.version ?? null }),
      ),
    );
  });
}
