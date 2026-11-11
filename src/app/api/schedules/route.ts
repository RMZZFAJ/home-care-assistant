import { NextResponse } from "next/server";
import { api, authenticate, patientContext, readJson, rpc, ApiError } from "@/lib/server/api";
import { scheduleCommandSchema } from "@/lib/validation/schedules";
import { parseScheduleListRead, schedulePeriod } from "@/lib/validation/schedule-list";
export async function GET(request: Request) {
  return api("schedules.read", async () => {
    const auth = await authenticate(), params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const dates = schedulePeriod.safeParse({ from: params.get("from"), until: params.get("until") });
    if (!dates.success) throw new ApiError("INVALID_OPERATION", "Selecione um período válido.", 400);
    const body = { data: await rpc(auth.client, "schedule_workspace", { p_patient: patient.id, p_from: dates.data.from, p_until: dates.data.until }), careRecipientId: patient.id, period: dates.data };
    parseScheduleListRead(body, { careRecipientId: patient.id, ...dates.data });
    return NextResponse.json(body);
  });
}
export async function POST(request: Request) {
  return api("schedules.write", async () => {
    const input = await readJson(request, scheduleCommandSchema), auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "read", true);
    const data = await rpc(auth.client, "schedule_command", { p_patient: input.careRecipientId, p_action: input.command.action, p_body: input.command.body, p_key: input.idempotencyKey, p_version: input.expectedVersion }) as { status?: string };
    if (input.command.action === "decide_change" && data.status === "obsolete")
      throw new ApiError("VERSION_CONFLICT", "A proposta ficou obsoleta e foi encerrada. O plantão atual foi preservado; consulte o histórico antes de preparar outra proposta.", 409);
    return NextResponse.json({ data });
  });
}
