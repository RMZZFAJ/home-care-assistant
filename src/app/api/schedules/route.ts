import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, patientContext, readJson, rpc, ApiError } from "@/lib/server/api";
import { scheduleCommandSchema } from "@/lib/validation/schedules";
export async function GET(request: Request) {
  return api("schedules.read", async () => {
    const auth = await authenticate(), params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const dates = z.object({ from: z.iso.date(), until: z.iso.date() }).safeParse({ from: params.get("from"), until: params.get("until") });
    if (!dates.success) throw new ApiError("INVALID_OPERATION", "Selecione um período válido.", 400);
    return NextResponse.json({ data: await rpc(auth.client, "schedule_workspace", { p_patient: patient.id, p_from: dates.data.from, p_until: dates.data.until }) });
  });
}
export async function POST(request: Request) {
  return api("schedules.write", async () => {
    const input = await readJson(request, scheduleCommandSchema), auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "read", true);
    return NextResponse.json({ data: await rpc(auth.client, "schedule_command", { p_patient: input.careRecipientId, p_action: input.command.action, p_body: input.command.body, p_key: input.idempotencyKey, p_version: input.expectedVersion }) });
  });
}
