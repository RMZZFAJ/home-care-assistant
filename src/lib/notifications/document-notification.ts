import type { SupabaseClient } from "@supabase/supabase-js";
import { renderDocumentPdf } from "@/lib/server/document-pdf";
import { rpc } from "@/lib/server/api";
import type { NotificationJob } from "./provider";
import { randomBytes } from "node:crypto";
import { tokenHash } from "./flows";
export async function prepareDocumentNotification(client: SupabaseClient, job: NotificationJob, workerId: string): Promise<NotificationJob> {
  if(!job.document_id) return job;
  const payload=await rpc(client,"notification_document_payload",{p_id:job.id,p_worker_id:workerId}) as {code:string;type:string;version:number;hash:string;snapshot:Parameters<typeof renderDocumentPdf>[0]}|null;
  if(!payload) throw new Error("Notification snapshot unavailable");
  let acceptanceToken:string|undefined;
  if(process.env.META_WHATSAPP_ACCEPTANCE_TEMPLATE){const token=randomBytes(32).toString("base64url");const challenge=await rpc(client,"issue_whatsapp_challenge",{p_notification:job.id,p_worker:workerId,p_hash:tokenHash(token)});if(challenge)acceptanceToken=token;}
  return {...job,code:payload.code,documentType:payload.type,acceptanceToken,attachment:{bytes:await renderDocumentPdf(payload.snapshot,payload.hash),filename:payload.code+"-v"+payload.version+".pdf"}};
}
