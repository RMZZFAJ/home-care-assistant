import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, patientContext, readJson, rpc } from "@/lib/server/api";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("balances.decision.reconcile", async () => {
    const input = await readJson(request, z.object({ key: z.uuid() }).strict());
    const auth = await authenticate(), id = parseUuid((await context.params).id);
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"), "bal.read");
    return NextResponse.json({ data: await rpc(auth.client, "settle_balance_decision", { p_patient: patient.id, p_target: id, p_key: input.key }) });
  });
}
