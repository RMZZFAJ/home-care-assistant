import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment } from "../../scripts/test-environment.mjs";

/** An obsolete synthetic artifact proves retired entries stay outside the current contract. */
export async function legacyPdfFixture(client, documentId, version = 1) {
  const env = getTestEnvironment(),
    service = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const { data: doc, error: docError } = await client.rpc(
    "operational_document",
    { p_id: documentId },
  );
  if (docError) throw new Error("Cannot read fictional legacy source");
  const { error } = await client
    .from("document_events")
    .select("document_id")
    .eq("document_id", documentId)
    .eq("version", version)
    .single();
  if (error || !doc) throw new Error("Missing fictional frozen legacy source");
  const pdf=await PDFDocument.create();pdf.addPage().drawText("Obsolete fictional artifact; no official issuance.");
  const bytes=Buffer.from(await pdf.save()),hash=createHash("sha256").update(bytes).digest("hex");
  for (const [objectPath, rpc, args] of [
    [
      `${documentId}/${version}.pdf`,
      "register_document_pdf",
      {
        p_document: documentId,
        p_version: version,
        p_path: `${documentId}/${version}.pdf`,
        p_hash: hash,
      },
    ],
    [
      `${documentId}/${version}/render-4.pdf`,
      "register_document_render",
      {
        p_document: documentId,
        p_version: version,
        p_renderer: 4,
        p_path: `${documentId}/${version}/render-4.pdf`,
        p_hash: hash,
      },
    ],
  ]) {
    const { error: uploaded } = await service.storage
      .from("document-receipts")
      .upload(objectPath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploaded) throw new Error("Fictional legacy upload failed");
    const { error: registered } = await service.rpc(rpc, args);
    if (registered) throw new Error("Fictional legacy registration failed");
  }
  return { bytes, hash, version, service };
}
