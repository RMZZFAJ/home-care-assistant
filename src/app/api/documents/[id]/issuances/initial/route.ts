import { api, ApiError, authenticate, parseUuid, rpc, validateMutationRequest } from "@/lib/server/api";
import { configuredAppOrigin } from "@/lib/server/app-origin";
import { issueInitialDocumentPdf } from "@/lib/server/pdf-issuance";
import { createWorkerClient } from "@/lib/server/service-client";
import { initialPdfStatusSchema } from "@/lib/documents/pdf-issuance";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };

async function initialPdf(context: Context) {
  const client = (await authenticate()).client;
  const id = parseUuid((await context.params).id);
  return initialPdfStatusSchema.parse(await rpc(client, "initial_document_pdf_status", { p_document: id }));
}

export async function GET(_request: Request, context: Context) {
  return api("documents.issuances.initial.read", async () => Response.json(await initialPdf(context)));
}

export async function POST(request: Request, context: Context) {
  return api("documents.issuances.initial.retry", async () => {
    validateMutationRequest(request, false);
    const initial = await initialPdf(context);
    if (!initial) throw new ApiError("NOT_FOUND", "Esta ficha não tem uma solicitação de PDF inicial.", 404);
    if (initial.state !== "ready") {
      await issueInitialDocumentPdf(createWorkerClient(), initial.id, configuredAppOrigin());
    }
    const current = await initialPdf(context);
    return Response.json(current, { status: current?.state === "ready" ? 200 : 202 });
  });
}
