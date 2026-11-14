import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, parseQuery, patientContext, saoPauloDateBoundary } from "@/lib/server/api";
import { parseScheduleHistoryRead, scheduleHistoryQuerySchema } from "@/lib/validation/schedule-history";

function readScope(capabilities: Record<string, boolean>) {
  if (capabilities["schedule.read.team"] === true) return "team";
  if (capabilities["schedule.read.own"] === true) return "own";
  throw new ApiError("FORBIDDEN", "Seu vínculo não permite consultar o histórico da agenda.", 403);
}
export async function GET(request: Request) {
  return api("schedules.history", async () => {
    const auth = await authenticate(), params = new URL(request.url).searchParams;
    const selected = async () => {
      try { return await patientContext(auth, params.get("careRecipientId")); }
      catch (reason) {
        if (reason instanceof ApiError && reason.status === 409) throw new ApiError("FORBIDDEN", "Selecione o vínculo com este paciente para consultar seu histórico da agenda.", 403);
        throw reason;
      }
    };
    const patient = await selected(), scope = readScope(patient.capabilities);
    const query = parseQuery(scheduleHistoryQuerySchema, Object.fromEntries(["query", "action", "reference", "from", "to", "page", "pageSize"].filter(key => params.has(key) && params.get(key) !== "").map(key => [key, params.get(key)])));
    let events = auth.client.from("shift_events").select("id,care_recipient_id,series_id,shift_id,professional_id,actor_id,actor_name_snapshot,action,reason,created_at", { count: "exact" })
      .eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).order("id", { ascending: false });
    // Authenticated RLS remains authoritative. The own view also keeps the
    // explicit initial scope if capabilities change while this read is in flight.
    if (scope === "own") events = events.eq("professional_id", auth.userId);
    if (query.query) events = events.ilike("reason", "%" + query.query.replace(/[\\%_]/g, "\\$&") + "%");
    if (query.action) events = events.eq("action", query.action);
    if (query.reference) events = events.or(`id.eq.${query.reference},shift_id.eq.${query.reference},series_id.eq.${query.reference}`);
    if (query.from) events = events.gte("created_at", saoPauloDateBoundary(query.from));
    if (query.to) events = events.lt("created_at", saoPauloDateBoundary(query.to, true));
    const result = await events.range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1);
    if (result.error) databaseError(result.error);
    const after = await selected();
    if (after.id !== patient.id || readScope(after.capabilities) !== scope)
      throw new ApiError("FORBIDDEN", "Seu vínculo mudou durante a consulta. Atualize o histórico da agenda.", 403);
    const filters = { query: query.query, action: query.action ?? "", reference: query.reference ?? "", from: query.from ?? "", to: query.to ?? "" };
    const body = { data: result.data, total: result.count, page: query.page, pageSize: query.pageSize, careRecipientId: patient.id, readerId: auth.userId, scope, filters };
    parseScheduleHistoryRead(body, { careRecipientId: patient.id, readerId: auth.userId, page: query.page, pageSize: query.pageSize, ...filters });
    return NextResponse.json(body);
  });
}
