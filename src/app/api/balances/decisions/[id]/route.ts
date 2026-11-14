import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, patientContext, readJson, rpc } from "@/lib/server/api";
import { documentDecisionIntention } from "@/lib/validation/document-decisions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("balances.decision", async () => {
    const input = await readJson(request, z.object({ key: z.uuid(), intention: documentDecisionIntention.refine(value => value.domain === "balance_workspace") }).strict());
    const auth = await authenticate(), id = parseUuid((await context.params).id);
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"), "bal.read", true);
    return NextResponse.json({ data: await rpc(auth.client, "execute_balance_decision", { p_patient: patient.id, p_target: id, p_key: input.key, p_intention: input.intention }) });
  });
}
