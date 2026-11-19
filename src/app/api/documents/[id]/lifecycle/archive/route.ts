import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { configuredAppOrigin } from "@/lib/server/app-origin";
import { createWorkerClient } from "@/lib/server/service-client";
import { issueSystemDocumentPdf } from "@/lib/server/pdf-issuance";
import { documentArchiveAttempt, documentArchiveCommand, documentArchiveReference } from "@/lib/documents/document-archive";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, context: Context) {
  return api("documents.lifecycle.archive.read", async () => {
    const id = parseUuid((await context.params).id);
    const { client } = await authenticate();
    return Response.json(documentArchiveReference.parse(await rpc(client, "document_archive_reference", { p_document: id })));
  });
}

export async function POST(request: Request, context: Context) {
  return api("documents.lifecycle.archive.commit", async () => {
    const id = parseUuid((await context.params).id);
    const command = await readJson(request, documentArchiveCommand, 4096);
    const { client } = await authenticate();
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
  });
}
