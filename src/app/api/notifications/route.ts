import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, databaseError, readJson, rpc, uuid } from "@/lib/server/api";

export async function GET(request: Request) {
  return api("notifications.mine", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    let query = auth.client.from("requisition_notifications").select("id,care_recipient_id,document_id,requisition_id,channel,state,created_at,seen_at,recipient_label,document_event_id,operational_documents(type,code,status),document_events(action)").eq("recipient_user_id", auth.userId).order("created_at", { ascending: false }).limit(params.get("all") === "true" ? 100 : 20);
    if (params.get("careRecipientId")) query = query.eq("care_recipient_id", uuid.parse(params.get("careRecipientId")));
    const { data, error } = await query;
    if (error) databaseError(error);
    return NextResponse.json({ data: data ?? [] });
  });
}
export async function POST(request: Request) {
  return api("notifications.seen", async () => {
    const { id } = await readJson(request, z.object({ id: uuid }).strict());
    const auth = await authenticate();
    await rpc(auth.client, "mark_notification_seen", { p_id: id });
    return NextResponse.json({ ok: true });
  });
}
