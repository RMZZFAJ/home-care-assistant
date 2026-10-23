import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  databaseError,
  pageParameters,
  readJson,
  rpc,
  uuid,
  parseUuid,
} from "@/lib/server/api";

export async function GET(request: Request) {
  return api("notifications.mine", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const { page, pageSize, start, end } = pageParameters(params);
    const patient = params.get("careRecipientId")
      ? parseUuid(params.get("careRecipientId"))
      : null;
    let query = auth.client
      .from("requisition_notifications")
      .select(
        "id,care_recipient_id,document_id,requisition_id,alert_event_id,consumption_report_id,reminder_id,silent,event_key,channel,state,created_at,seen_at,recipient_label,document_event_id,operational_documents(type,code,status),document_events(action)",
        { count: "exact" },
      )
      .eq("recipient_user_id", auth.userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, end);
    let unseen = auth.client
      .from("requisition_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", auth.userId)
      .eq("silent", false)
      .is("seen_at", null);
    if (patient) {
      query = query.eq("care_recipient_id", patient);
      unseen = unseen.eq("care_recipient_id", patient);
    }
    if (params.get("unread") === "true") query = query.is("seen_at", null);
    const [result, unread] = await Promise.all([query, unseen]);
    if (result.error) databaseError(result.error);
    if (unread.error) databaseError(unread.error);
    return NextResponse.json({
      data: result.data ?? [],
      total: result.count ?? 0,
      unreadCount: unread.count ?? 0,
      page,
      pageSize,
    });
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
