import { createHash } from "node:crypto";
import { demoDocuments, demoPdfSnapshot } from "@/lib/demo-documents";
import { renderDocumentPdf } from "@/lib/server/operational-pdf";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; }>; },
) {
  const doc = demoDocuments[(await context.params).id];
  if (!doc) return new Response("Exemplo não encontrado", { status: 404 });
  const hash = createHash("sha256").update(JSON.stringify(doc)).digest("hex");
  const bytes = await renderDocumentPdf(demoPdfSnapshot(doc), hash, { example: true, rendererRevision: 16, id: doc.id, verificationCode: "0".repeat(32), requestedAt: doc.createdAt!, requestedName: "Demonstração fictícia", representation: "operational", verificationOrigin: "https://example.invalid" });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="EXEMPLO-${doc.code}-v${doc.version}.pdf"`,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
