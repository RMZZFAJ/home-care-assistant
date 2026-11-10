import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import { scheduleResourceRpcPacket } from "@/lib/schedules/resource-transport";
import {
  scheduleResourceCommitSchema,
  parseScheduleResourceRecovery,
} from "@/lib/validation/schedule-resource-preparations";
const command = z
  .object({
    packet: scheduleResourceCommitSchema,
    resolutionKey: z.uuid().optional(),
  })
  .strict()
  .refine((v) => v.resolutionKey !== v.packet.idempotencyKey);
export async function POST(request: Request) {
  return api("schedule.resource_preparation.recovery", async () => {
    const v = await readJson(request, command),
      p = v.packet,
      auth = await authenticate();
    await patientContext(auth, p.careRecipientId);
    const data = await rpc(
      auth.client,
      v.resolutionKey
        ? "resolve_schedule_resource_preparation"
        : "recover_schedule_resource_preparation",
      {
        ...scheduleResourceRpcPacket(p),
        p_key: v.resolutionKey ?? p.idempotencyKey,
        ...(v.resolutionKey ? { p_original_key: p.idempotencyKey } : {}),
      },
    );
    return NextResponse.json(
      { data: parseScheduleResourceRecovery(data, p, auth.userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
