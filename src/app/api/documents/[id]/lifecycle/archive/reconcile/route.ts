import { api, authenticate, parseUuid, readJson } from "@/lib/server/api";
import { reconcileDocumentArchive } from "@/lib/server/document-archive";
import { documentArchiveIdentity } from "@/lib/documents/document-archive";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: Context) {
  return api("documents.lifecycle.archive.reconcile", async () => {
    const id = parseUuid((await context.params).id);
    const identity = await readJson(request, documentArchiveIdentity, 1024);
    const { client } = await authenticate();
    return reconcileDocumentArchive(client, id, identity);
  });
}
