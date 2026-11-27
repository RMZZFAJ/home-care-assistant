import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import { balanceCommandSchema, parseBalanceAgendaRead } from "@/lib/validation/balances";
export async function GET(request: Request) {
  return api("balances.read", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "bal.read",
    );
    const reference = params.get("reference") === "true";
    const agenda = !reference && params.get("view") === "agenda";
    const readTeam = patient.capabilities["schedule.read.team"] === true;
    if (agenda && !readTeam && !patient.capabilities["schedule.read.own"])
      throw new ApiError("FORBIDDEN", "Seu vínculo não permite consultar plantões.", 403);
    const data = await rpc(
      auth.client,
      reference ? "balance_count_reference" : "balance_workspace",
      { p_patient: patient.id },
    );
    const body = { data, careRecipientId: patient.id };
    if (!agenda) return NextResponse.json(body);
    const snapshot = parseBalanceAgendaRead(body, patient.id), eligibility = snapshot.data.eligibility;
    if (!readTeam && eligibility.assignment?.professional_id !== auth.userId)
      return NextResponse.json({ careRecipientId: patient.id, data: { eligibility: {
        assignment: null, admission: null, available: false, documentId: null, dueAt: null,
      } } });
    return NextResponse.json(snapshot);
  });
}
export async function POST(request: Request) {
  return api("balances.write", async () => {
    const input = await readJson(request, balanceCommandSchema),
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read", true);
    const command = input.command;
    const data =
      command.action === "assign"
        ? await rpc(auth.client, "resolve_balance_assignment", {
            p_patient: input.careRecipientId,
            p_cycle: command.body.cycleId,
            p_shift: command.body.targetShiftId,
            p_reason: command.body.reason,
            p_key: input.idempotencyKey,
          })
        : await rpc(auth.client, "balance_command", {
            p_patient: input.careRecipientId,
            p_action: command.action,
            p_body: command.body,
            p_key: input.idempotencyKey,
            p_version: input.expectedVersion,
          });
    return NextResponse.json({ data, persistence: "confirmed" });
  });
}
