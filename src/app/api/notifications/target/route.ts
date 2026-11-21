import {NextResponse} from "next/server";
import {api,ApiError,authenticate,parseQuery,patientContext,readJson,rpc} from "@/lib/server/api";
import {referenceQuery,notificationReference,noIssuesCommand,noIssuesReceipt,referenceKindsByArea} from "@/lib/validation/notification-reference";
export async function GET(request:Request){
 return api("notifications.target",async()=>{
  const auth=await authenticate(),input=parseQuery(referenceQuery,Object.fromEntries(new URL(request.url).searchParams));
  await patientContext(auth,input.careRecipientId);
  const data=notificationReference.parse(await rpc(auth.client,"notification_reference",{p_patient:input.careRecipientId,p_ref:input.ref,p_area:input.area,p_namespace:input.namespace}));
  if(data.careRecipientId!==input.careRecipientId||data.referenceId!==input.ref||!referenceKindsByArea[input.area].includes(data.kind))throw new ApiError("INTERNAL_ERROR","A resposta não corresponde à referência consultada.",500);
  return NextResponse.json({data});
 });
}
export async function POST(request:Request){
 return api("notifications.reminder_answer",async()=>{
  const input=await readJson(request,noIssuesCommand),auth=await authenticate();await patientContext(auth,input.careRecipientId);
  const data=noIssuesReceipt.parse(await rpc(auth.client,"acknowledge_shift_reminder",{p_patient:input.careRecipientId,p_ref:input.ref,p_key:input.idempotencyKey}));
  if(data.careRecipientId!==input.careRecipientId||data.reminderId!==input.ref||data.idempotencyKey!==input.idempotencyKey)throw new ApiError("INTERNAL_ERROR","A confirmação não corresponde à tentativa original.",500);
  return NextResponse.json({data});
 });
}
