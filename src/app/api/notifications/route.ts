import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
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
    const requested = params.get("careRecipientId")
      ? parseUuid(params.get("careRecipientId"))
      : null;
    const context = await rpc(auth.client, "my_active_context") as { mode?: string; care_recipient_id?: string } | null;
    if (context?.mode !== "patient" || !uuid.safeParse(context.care_recipient_id).success)
      return NextResponse.json({ data: [], total: 0, unreadCount: 0, page, pageSize, availability: "patient_context_required" });
    const patient = context.care_recipient_id!;
    if (requested && requested !== patient) throw new ApiError("CONTEXT_REQUIRED", "Selecione seu vínculo com o paciente destas notificações em Mudar perfil.", 409);
    let query = auth.client
      .from("requisition_notifications")
      .select(
        "id,care_recipient_id,document_id,requisition_id,alert_event_id,consumption_report_id,reminder_id,silent,event_key,channel,state,created_at,seen_at,recipient_label,document_event_id,operational_documents(type,code,status),document_events(action)",
        { count: "exact" },
      )
      .eq("recipient_user_id", auth.userId)
      .order("created_at", { ascending: false })
      .order("id");
    if (params.get("surface") === "bell") query = query.eq("silent", false);
    let unseen = auth.client
      .from("requisition_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", auth.userId)
      .eq("silent", false)
      .is("seen_at", null);
    // The selected scope comes from the revocable database session. Keeping
    // this predicate explicit avoids scanning the identity's other patients;
    // RLS and each document's read capability continue to apply to both reads.
    query = query.eq("care_recipient_id", patient);
    unseen = unseen.eq("care_recipient_id", patient);
    if (params.get("unread") === "true") query = query.is("seen_at", null);
    const [result, unread] = await Promise.all([
      query.range(start, end),
      unseen,
    ]);
    if (result.error) databaseError(result.error);
    if (unread.error) databaseError(unread.error);
    if (!Array.isArray(result.data) || typeof result.count !== "number" || typeof unread.count !== "number")
      throw new ApiError("INTERNAL_ERROR", "Não foi possível ler o resultado da consulta de notificações.", 500);
    const after = await rpc(auth.client, "my_active_context") as { mode?: string; care_recipient_id?: string } | null;
    if (after?.mode !== "patient" || after.care_recipient_id !== patient)
      throw new ApiError("CONTEXT_REQUIRED", "O perfil mudou durante a consulta. Atualize seu vínculo antes de consultar as notificações.", 409);
    return NextResponse.json({
      data: result.data,
      total: result.count,
      unreadCount: unread.count,
      page,
      pageSize,
      availability: "ready",
      careRecipientId: patient,
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
