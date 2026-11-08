import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, patientContext, rpc } from "@/lib/server/api";
import { deliveryImpact } from "@/lib/operations/contracts";
export async function GET(request: Request) {
  return api("operations.impact", async () => {
    const auth = await authenticate(), input = parseQuery(z.object({ careRecipientId: z.uuid() }).strict(), Object.fromEntries(new URL(request.url).searchParams));
    await patientContext(auth, input.careRecipientId);
    return NextResponse.json({ data: deliveryImpact.parse(await rpc(auth.client, "patient_delivery_impact", { p_patient: input.careRecipientId })) });
  });
}
