import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, requireGlobal, rpc } from "@/lib/server/api";
import { technicalNotificationSource, technicalNotifications } from "@/lib/operations/notification-attempts";

const query=z.object({source:technicalNotificationSource,page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
export async function GET(request:Request){
  return api("operations.notifications.read",async()=>{
    const auth=await authenticate(); requireGlobal(auth);
    const input=parseQuery(query,Object.fromEntries(new URL(request.url).searchParams));
    const data=technicalNotifications.parse(await rpc(auth.client,"operations_notification_attempts",{p_source:input.source,p_page:input.page,p_size:20}));
    return NextResponse.json({data});
  });
}
