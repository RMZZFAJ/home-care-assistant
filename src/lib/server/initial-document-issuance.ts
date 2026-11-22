import type { SupabaseClient } from "@supabase/supabase-js";
import { processNotifications } from "@/lib/notifications/worker";
import { rpc } from "./api";
import { issueSystemDocumentPdf } from "./pdf-issuance";

export async function prepareInitialDocumentNotices(client: SupabaseClient, requestId: string) {
  let unconfirmed = false;
  try {
    await processNotifications(client, 10, undefined, requestId);
  } catch {
    // The persisted outbox is still authoritative after a lost lease or response.
    unconfirmed = true;
  }
  await rpc(client, "capture_initial_pdf_notices", { p_request: requestId, p_unconfirmed: unconfirmed });
}

export async function processInitialDocumentPdfs(client: SupabaseClient, verificationOrigin: string) {
  const claimed = await rpc(client, "claim_initial_document_pdfs", { p_limit: 3 }) as string[];
  const results = await Promise.allSettled(claimed.map(async id => {
    await prepareInitialDocumentNotices(client, id);
    return issueSystemDocumentPdf(client, id, verificationOrigin);
  }));
  const ready = results.filter(result => result.status === "fulfilled" && result.value.state === "ready").length;
  const failed = results.filter(result => result.status === "rejected").length;
  return { claimed: claimed.length, ready, failed, processing: claimed.length - ready - failed };
}
