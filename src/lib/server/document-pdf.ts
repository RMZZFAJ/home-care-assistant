import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError, rpc } from "./api";
import { createWorkerClient } from "./service-client";
import { renderDocumentPdf, type DocumentSnapshot } from "./operational-pdf";
export { renderDocumentPdf } from "./operational-pdf";

export async function documentPdf(
  client: SupabaseClient,
  id: string,
  version?: number,
  legacy = false,
) {
  const doc = (await rpc(client, "operational_document", { p_id: id })) as {
    version: number;
    protocol: string | null;
    code: string;
  };
  if (!doc.protocol)
    throw new ApiError(
      "VALIDATION_ERROR",
      "Emita o documento antes de gerar o comprovante.",
    );
  const target = version ?? doc.version;
  const server = createWorkerClient();
  const lookup = legacy
    ? client
        .from("document_pdfs")
        .select("object_path")
        .eq("document_id", id)
        .eq("version", target)
        .maybeSingle()
    : client
        .from("document_pdf_renders")
        .select("object_path")
        .eq("document_id", id)
        .eq("version", target)
        .eq("renderer", 4)
        .maybeSingle();
  const { data: existing, error: lookupError } = await lookup;
  if (lookupError) databaseError(lookupError);
  const filename = `${doc.code}-v${target}${legacy ? "-original" : "-r4"}.pdf`;
  if (existing) {
    const { data, error } = await server.storage
      .from("document-receipts")
      .download(existing.object_path);
    if (error)
      throw new ApiError(
        "PERSISTENCE_UNCONFIRMED",
        "Não foi possível recuperar o PDF registrado.",
        503,
        true,
      );
    return { bytes: Buffer.from(await data.arrayBuffer()), filename };
  }
  if (legacy)
    throw new ApiError(
      "NOT_FOUND",
      "Não há arquivo original registrado para esta versão.",
      404,
    );
  const { data: event, error } = await client
    .from("document_events")
    .select("body,content_hash")
    .eq("document_id", id)
    .eq("version", target)
    .maybeSingle();
  if (error) databaseError(error);
  if (!event) throw new ApiError("NOT_FOUND", "Versão não encontrada.", 404);
  const bytes = await renderDocumentPdf(
    event.body as DocumentSnapshot,
    event.content_hash,
  );
  const objectPath = `${id}/${target}/render-4.pdf`;
  const { error: uploadError } = await server.storage
    .from("document-receipts")
    .upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (
    uploadError &&
    !["409", "Duplicate"].includes(String(uploadError.statusCode))
  ) {
    const { data: concurrent } = await server.storage
      .from("document-receipts")
      .download(objectPath);
    if (!concurrent)
      throw new ApiError(
        "PERSISTENCE_UNCONFIRMED",
        "Não foi possível confirmar o armazenamento do PDF.",
        503,
        true,
      );
  }
  const { data: stored, error: storedError } = await server.storage
    .from("document-receipts")
    .download(objectPath);
  if (storedError)
    throw new ApiError(
      "PERSISTENCE_UNCONFIRMED",
      "PDF aguardando confirmação.",
      503,
      true,
    );
  const canonicalBytes = Buffer.from(await stored.arrayBuffer());
  await rpc(server, "register_document_render", {
    p_document: id,
    p_version: target,
    p_renderer: 4,
    p_path: objectPath,
    p_hash: createHash("sha256").update(canonicalBytes).digest("hex"),
  });
  return { bytes: canonicalBytes, filename };
}
