import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment } from "../../scripts/test-environment.mjs";

/** Real V4 rendering of a frozen fictional Auth snapshot, only for legacy tests. */
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
  const { data: event, error } = await client
    .from("document_events")
    .select("body,content_hash")
    .eq("document_id", documentId)
    .eq("version", version)
    .single();
  if (error || !doc) throw new Error("Missing fictional frozen legacy source");
  if (!existsSync(".generated/legacy-test-renderer.cjs"))
    await import("../../scripts/build-legacy-test-renderer.mjs");
  const { renderDocumentPdf } = createRequire(path.resolve("package.json"))(
    path.resolve(".generated/legacy-test-renderer.cjs"),
  );
  const bytes = Buffer.from(
      await renderDocumentPdf(event.body, event.content_hash),
    ),
    hash = createHash("sha256").update(bytes).digest("hex");
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
