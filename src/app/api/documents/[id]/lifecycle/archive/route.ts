import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { executeDocumentArchive } from "@/lib/server/document-archive";
import { documentArchiveCommand, documentArchiveReference } from "@/lib/documents/document-archive";

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
    return executeDocumentArchive(client, id, command);
  });
}
