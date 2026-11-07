import { api, ApiError, authenticate, uuid } from "@/lib/server/api";
import { documentPdf } from "@/lib/server/document-pdf";
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
    const raw = new URL(request.url).searchParams.get("version");
    if (raw && !/^[1-9]\d{0,8}$/.test(raw))
      throw new ApiError("VALIDATION_ERROR", "Versão inválida.");
    const issuance = new URL(request.url).searchParams.get("issuance");
    const renderer = new URL(request.url).searchParams.get("renderer");
    if (
      renderer &&
      renderer !== "legacy" &&
      (!/^[1-9]\d{0,9}$/.test(renderer) ||
        Number(renderer) < 4 ||
        Number(renderer) > 2147483647)
    )
      throw new ApiError("VALIDATION_ERROR", "Revisão de arquivo inválida.");
    if (issuance && (raw || renderer))
      throw new ApiError(
        "VALIDATION_ERROR",
        "Selecione uma emissão ou um arquivo legado específico.",
      );
    if (issuance && !uuid.safeParse(issuance).success)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Identificação de exemplar inválida.",
      );
    const result = issuance
      ? await downloadPdfIssuance(auth.client, id, issuance)
      : await documentPdf(
          auth.client,
          id,
          raw ? Number(raw) : undefined,
          renderer === "legacy" ? "legacy" : renderer ? Number(renderer) : 4,
        );
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
