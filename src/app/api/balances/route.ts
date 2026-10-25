import { NextResponse } from "next/server";
import { api, authenticate, patientContext, readJson, rpc } from "@/lib/server/api";
import { balanceCommandSchema } from "@/lib/validation/balances";
export async function GET(request: Request) {
  return api("balances.read", async () => {
    const auth = await authenticate();
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"), "bal.read");
    const data=await rpc(auth.client, "balance_workspace", { p_patient: patient.id }) as Record<string,unknown>;
    return NextResponse.json({ data });
  });
}
export async function POST(request: Request) {
  return api("balances.write", async () => {
    const input = await readJson(request, balanceCommandSchema), auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read", true);
    const command = input.command;
    const data = command.action === "assign" ? await rpc(auth.client, "resolve_balance_assignment", { p_patient: input.careRecipientId, p_cycle: command.body.cycleId, p_shift: command.body.targetShiftId, p_reason: command.body.reason, p_key: input.idempotencyKey }) : await rpc(auth.client, "balance_command", { p_patient: input.careRecipientId, p_action: command.action, p_body: command.body, p_key: input.idempotencyKey, p_version: input.expectedVersion });
    return NextResponse.json({ data, persistence: "confirmed" });
  });
}
