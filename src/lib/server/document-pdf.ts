import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError, rpc } from "./api";
import { createWorkerClient } from "./service-client";
export { renderDocumentPdf } from "./operational-pdf";

/** Compatibility URLs recover only the exact legacy artifact. GET never renders. */
export async function documentPdf(
  client: SupabaseClient,
  id: string,
  version?: number,
  renderer: "legacy" | number = 4,
) {
  const doc = (await rpc(client, "operational_document", { p_id: id })) as {
    version: number;
    protocol: string | null;
    code: string;
  };
  const target = version ?? doc.version,
    server = createWorkerClient();
  const lookup =
    renderer === "legacy"
      ? client
          .from("document_pdfs")
          .select("object_path,sha256")
          .eq("document_id", id)
          .eq("version", target)
          .maybeSingle()
      : client
          .from("document_pdf_renders")
          .select("object_path,sha256")
          .eq("document_id", id)
          .eq("version", target)
          .eq("renderer", renderer)
          .maybeSingle();
  const { data: record, error } = await lookup;
  if (error) databaseError(error);
  if (!record) {
    const { data: event, error: eventError } = await client
      .from("document_events")
      .select("body")
      .eq("document_id", id)
      .eq("version", target)
      .maybeSingle();
    if (eventError) databaseError(eventError);
    if (event?.body?.transfer && !event.body.protocol)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Esta versão registra uma declaração anterior à expedição. Consulte seus atos no histórico; o comprovante ENT está disponível a partir da expedição.",
      );
    throw new ApiError(
      "PDF_NOT_GENERATED",
      "Não existe arquivo registrado neste caminho legado. Abra Arquivos gerados e solicite uma nova emissão desta versão.",
      404,
      false,
    );
  }
  const { data, error: downloadError } = await server.storage
    .from("document-receipts")
    .download(record.object_path);
  if (downloadError || !data)
    throw new ApiError(
      "PERSISTENCE_UNCONFIRMED",
      "O arquivo legado registrado não pôde ser recuperado. O original não será substituído.",
      503,
      true,
    );
  const bytes = Buffer.from(await data.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== record.sha256)
    throw new ApiError(
      "PDF_BYTES_DIVERGE",
      "Os bytes do arquivo legado divergem do registro. O arquivo não foi disponibilizado e o original não foi substituído.",
      503,
      true,
    );
  await rpc(client, "operational_document", { p_id: id });
  return {
    bytes,
    filename: `${doc.code}-v${target}-${renderer === "legacy" ? "original" : "r" + renderer}.pdf`,
  };
}
