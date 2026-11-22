import { ApiError, rpc } from "./api";
import { configuredAppOrigin } from "./app-origin";
import { issueSystemDocumentPdf } from "./pdf-issuance";
import { createWorkerClient } from "./service-client";
import { documentArchiveAttempt, documentArchiveRecovery, type DocumentArchiveAttempt, type DocumentArchiveCommand, type DocumentArchiveIdentity } from "@/lib/documents/document-archive";

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
  const archive = await completePreparedArchive(client, id, attempt);
  return Response.json(archive, { status: archive.archivedAt ? 200 : 202 });
}

export async function reconcileDocumentArchive(
  client: Parameters<typeof rpc>[0], id: string, identity: DocumentArchiveIdentity,
) {
  const result = documentArchiveRecovery.parse(await rpc(client, "settle_document_archive", {
    p_document: id, p_key: identity.key, p_action: identity.action,
  }));
  if (result.documentId !== id || result.key !== identity.key || result.action !== identity.action)
    throw new Error("Archive recovery returned a different operation");
  if (result.state !== "prepared") return Response.json(result);
  const archive = await completePreparedArchive(client, id, result.archive);
  return Response.json({ ...result, archive, state: archive.archivedAt ? "applied" : "prepared" }, { status: archive.archivedAt ? 200 : 202 });
}

async function completePreparedArchive(client: Parameters<typeof rpc>[0], id: string, attempt: DocumentArchiveAttempt) {
  if (attempt.archivedAt) return attempt;
  try {
    const document = await issueSystemDocumentPdf(createWorkerClient(), attempt.id, configuredAppOrigin());
    if (document.state !== "ready") return attempt;
  } catch {
    throw new ApiError("PERSISTENCE_UNCONFIRMED", "O PDF consolidado ainda não foi confirmado. A ficha continua na condição anterior. Recupere a mesma tentativa.", 503, true);
  }
  return documentArchiveAttempt.parse(await rpc(client, "commit_document_archive", {
    p_document: id, p_request: attempt.id,
  }));
}
