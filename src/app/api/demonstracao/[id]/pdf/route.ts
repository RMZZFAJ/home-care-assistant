import { createHash } from "node:crypto";
import { demoDocuments } from "@/lib/demo-documents";
import { renderDocumentPdf } from "@/lib/server/operational-pdf";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const doc = demoDocuments[(await context.params).id];
  if (!doc) return new Response("Exemplo não encontrado", { status: 404 });
  const hash = createHash("sha256").update(JSON.stringify(doc)).digest("hex");
  const bytes = await renderDocumentPdf(doc, hash);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="EXEMPLO-${doc.code}-v${doc.version}.pdf"`,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
