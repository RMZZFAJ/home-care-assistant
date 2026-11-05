import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  rpc,
  saoPauloDateBoundary,
} from "@/lib/server/api";
import {
  consumptionCommand,
  consumptionCursor,
  consumptionFilters,
} from "@/lib/validation/consumption";

export async function GET(request: Request) {
  return api("consumption.read", async () => {
    const params = new URL(request.url).searchParams;
    const filters = consumptionFilters.safeParse({
      kind: params.get("kind") ?? undefined,
      status: params.get("status") ?? undefined,
      search: params.get("q") ?? "",
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    });
    const before =
      params.has("beforeAt") || params.has("beforeId")
        ? consumptionCursor.safeParse({
            at: params.get("beforeAt"),
            id: params.get("beforeId"),
          })
        : null;
    if (!filters.success || (before && !before.success))
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira os filtros e a referência de paginação.",
      );
    const auth = await authenticate(),
      patient = await patientContext(auth, params.get("careRecipientId"));
    let query = auth.client
      .from("consumption_reports")
      .select(
        "id,care_recipient_id,kind,location,status,body,created_at,version,reported_by,reported_name",
      )
      .eq("care_recipient_id", patient.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(21);
    if (filters.data.kind) query = query.eq("kind", filters.data.kind);
    if (filters.data.status) query = query.eq("status", filters.data.status);
    if (filters.data.search)
      query = query.ilike(
        "body",
        "%" +
          filters.data.search.replaceAll("%", "\\%").replaceAll("_", "\\_") +
          "%",
      );
    if (filters.data.from)
      query = query.gte("created_at", saoPauloDateBoundary(filters.data.from));
    if (filters.data.to)
      query = query.lt(
        "created_at",
        saoPauloDateBoundary(filters.data.to, true),
      );
    if (before?.success)
      query = query.or(
        `created_at.lt.${before.data.at},and(created_at.eq.${before.data.at},id.lt.${before.data.id})`,
      );
    const result = await query;
    if (result.error) databaseError(result.error);
    const rows = result.data ?? [],
      data = rows.slice(0, 20),
      last = data.at(-1);
    return NextResponse.json({
      data,
      next:
        rows.length > 20 && last ? { at: last.created_at, id: last.id } : null,
    });
  });
}

export async function POST(request: Request) {
  return api("consumption.write", async () => {
    const input = await readJson(request, consumptionCommand),
      auth = await authenticate();
    if (input.action === "report") {
      await patientContext(
        auth,
        input.careRecipientId,
        "consumption.report",
        true,
      );
      return NextResponse.json({
        id: await rpc(auth.client, "report_extraordinary_consumption", {
          p_patient: input.careRecipientId,
          p_kind: input.kind,
          p_location: input.location,
          p_text: input.text,
          p_lines: input.lines,
          p_key: input.idempotencyKey,
        }),
      });
    }
    const report = (await rpc(auth.client, "consumption_report", {
      p_id: input.id,
    })) as { care_recipient_id: string; location: string };
    await patientContext(
      auth,
      report.care_recipient_id,
      input.action === "supplement"
        ? "consumption.report"
        : report.location === "FAMILY"
          ? "stock.family.manage"
          : "consumption.confirm",
      true,
    );
    return NextResponse.json({
      data:
        input.action === "supplement"
          ? await rpc(auth.client, "supplement_consumption_report", {
              p_id: input.id,
              p_text: input.text,
              p_lines: input.lines,
              p_key: input.idempotencyKey,
              p_version: input.expectedVersion,
            })
          : await rpc(auth.client, "decide_consumption_report", {
              p_id: input.id,
              p_accept: input.accept,
              p_reason: input.reason ?? null,
              p_key: input.idempotencyKey,
              p_version: input.expectedVersion,
            }),
    });
  });
}
