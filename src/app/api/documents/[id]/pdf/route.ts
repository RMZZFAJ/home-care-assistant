import { api, ApiError, authenticate, uuid } from "@/lib/server/api";
import { downloadPdfIssuance } from "@/lib/server/pdf-issuance";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("documents.pdf", async () => {
    const auth = await authenticate();
    const { id } = await context.params;
    if (!uuid.safeParse(id).success)
      throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const query = new URL(request.url).searchParams;
    const issuance = query.get("issuance");
    if (!issuance || !uuid.safeParse(issuance).success || [...query.keys()].some(key=>key!=="issuance")) throw new ApiError("VALIDATION_ERROR","Selecione um exemplar em Arquivos gerados.");
    const result = await downloadPdfIssuance(auth.client,id,issuance);
    // All bytes and authority were verified before starting this bounded stream.
    // Explicit streaming also supports registered files above the platform's
    // buffered-response limit without exposing an unverified prefix.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let offset = 0; offset < result.bytes.length; offset += 65536)
          controller.enqueue(
            new Uint8Array(result.bytes.subarray(offset, offset + 65536)),
          );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'inline; filename="' + result.filename + '"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
