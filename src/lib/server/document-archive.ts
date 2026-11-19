import { ApiError, rpc } from "./api";
import { configuredAppOrigin } from "./app-origin";
import { issueSystemDocumentPdf } from "./pdf-issuance";
import { createWorkerClient } from "./service-client";
import { documentArchiveAttempt, type DocumentArchiveCommand } from "@/lib/documents/document-archive";

export async function executeDocumentArchive(
  client: Parameters<typeof rpc>[0],
  id: string,
  command: DocumentArchiveCommand,
) {
  const reviewed = { p_document: id, p_key: command.key, p_version: command.version, p_reference: command.referenceHash };
  if (command.action !== "archive") {
    const result = await rpc(client, "decide_document_archive", {
      ...reviewed, p_action: command.action, p_reason: command.action === "reverse" ? command.reason : "",
    });
    return Response.json(documentArchiveAttempt.parse(result));
  }

  const attempt = documentArchiveAttempt.parse(await rpc(client, "prepare_document_archive", {
    ...reviewed, p_mode: command.mode, p_reason: command.reason ?? "",
  }));
  if (attempt.archivedAt) return Response.json(attempt);
  try {
    const document = await issueSystemDocumentPdf(createWorkerClient(), attempt.id, configuredAppOrigin());
    if (document.state !== "ready") return Response.json(attempt, { status: 202 });
  } catch {
    throw new ApiError("PERSISTENCE_UNCONFIRMED", "O PDF consolidado ainda não foi confirmado. A ficha continua na condição anterior. Recupere a mesma tentativa.", 503, true);
  }
  return Response.json(documentArchiveAttempt.parse(await rpc(client, "commit_document_archive", {
    p_document: id, p_request: attempt.id,
  })));
}
