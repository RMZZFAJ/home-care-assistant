import { NextResponse } from "next/server";
import { z } from "zod";
import { matchingDocumentEvents } from "@/lib/notifications/event-labels";
import { inboxKind, inboxSearchLimit } from "@/lib/notifications/inbox";
import {
  api,
  ApiError,
  authenticate,
  pageParameters,
  readJson,
  parseQuery,
  rpc,
  uuid,
  parseUuid,
} from "@/lib/server/api";

const privateResponse = { headers: { "Cache-Control": "private, no-store" } };
const filterQuery = z.object({ kind: inboxKind.nullable(), search: z.string().trim().max(inboxSearchLimit), tasks: z.boolean() });

export async function GET(request: Request) {
  return api("notifications.mine", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const { page, pageSize, start } = pageParameters(params);
    const noticeId = params.has("noticeId") ? parseUuid(params.get("noticeId")) : null;
    const surface = params.get("surface") === "bell" ? "bell" : "center";
    const unreadOnly = params.get("unread") === "true";
    const filters = parseQuery(filterQuery, {
      kind: params.get("kind"), search: params.get("q") ?? "", tasks: params.get("tasks") === "true",
    });
    const query = { ...filters, page, pageSize, unread: unreadOnly, surface };
    const requested = params.get("careRecipientId")
      ? parseUuid(params.get("careRecipientId"))
      : null;
    const context = await rpc(auth.client, "my_active_context") as { mode?: string; care_recipient_id?: string } | null;
    if (context?.mode !== "patient" || !uuid.safeParse(context.care_recipient_id).success) {
      if (noticeId) throw new ApiError("NOT_FOUND", "Este aviso não está disponível neste vínculo.", 404);
      return NextResponse.json({ ...query, data: [], total: 0, unreadCount: 0, actionCount: 0, availability: "patient_context_required" }, privateResponse);
    }
    const patient = context.care_recipient_id!;
    if (requested && requested !== patient) throw new ApiError("CONTEXT_REQUIRED", "Selecione seu vínculo com o paciente destas notificações em Mudar perfil.", 409);
    const result = await rpc(auth.client, "read_personal_inbox", {
      p_patient: patient,
      p_offset: noticeId ? 0 : start,
      p_size: noticeId ? 1 : pageSize,
      p_surface: noticeId ? "center" : surface,
      p_unread: noticeId ? false : unreadOnly,
      p_id: noticeId,
      ...(noticeId ? {} : {
        p_kind: filters.kind, p_search: filters.search, p_tasks: filters.tasks,
        p_event_keys: matchingDocumentEvents(filters.search),
      }),
    }) as { data?: unknown[]; total?: number; unreadCount?: number; actionCount?: number } | null;
    if (!Array.isArray(result?.data) || typeof result.total !== "number" || typeof result.unreadCount !== "number" || typeof result.actionCount !== "number")
      throw new ApiError("INTERNAL_ERROR", "Não foi possível ler o resultado da consulta de notificações.", 500);
    const after = await rpc(auth.client, "my_active_context") as { mode?: string; care_recipient_id?: string } | null;
    if (after?.mode !== "patient" || after.care_recipient_id !== patient)
      throw new ApiError("CONTEXT_REQUIRED", "O perfil mudou durante a consulta. Atualize seu vínculo antes de consultar as notificações.", 409);
    if (noticeId) {
      if (!result.data.length) throw new ApiError("NOT_FOUND", "Este aviso não está disponível neste vínculo.", 404);
      return NextResponse.json({ data: result.data[0] }, privateResponse);
    }
    return NextResponse.json({
      ...query,
      data: result.data,
      total: result.total,
      unreadCount: result.unreadCount,
      actionCount: result.actionCount,
      availability: "ready",
      careRecipientId: patient,
    }, privateResponse);
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
