import { api, ApiError, authenticate, uuid } from "@/lib/server/api";
import { documentPdf } from "@/lib/server/document-pdf";
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
    const result = await documentPdf(
      auth.client,
      id,
      raw ? Number(raw) : undefined,
    );
    return new Response(new Uint8Array(result.bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'inline; filename="' + result.filename + '"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
