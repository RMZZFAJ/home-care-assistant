import { NextResponse } from "next/server";
import { parseResidenceHours, residenceHoursChange } from "@/lib/schedules/residence-hours";
import { api, authenticate, patientContext, readJson, rpc } from "@/lib/server/api";

export async function GET(request: Request) {
  return api("schedules.residence.read", async () => {
    const auth = await authenticate();
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"));
    const data = await rpc(auth.client, "schedule_residence", { p_patient: patient.id });
    return NextResponse.json(parseResidenceHours(data, patient.id), { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return api("schedules.residence.write", async () => {
    const input = await readJson(request, residenceHoursChange);
    const auth = await authenticate();
    const patient = await patientContext(auth, input.careRecipientId, "read", true);
    const result = await rpc(auth.client, "set_schedule_residence", {
      p_patient: patient.id, p_body: input.hours, p_key: input.idempotencyKey, p_version: input.expectedVersion,
    });
    return NextResponse.json(parseResidenceHours(result, patient.id));
  });
}
