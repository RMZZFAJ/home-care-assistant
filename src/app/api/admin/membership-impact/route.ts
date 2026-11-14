import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  parseUuid,
  patientContext,
  rpc,
} from "@/lib/server/api";
export async function GET(request: Request) {
  return api("membership.impact", async () => {
    const params = new URL(request.url).searchParams,
      userId = parseUuid(params.get("userId"));
    const auth = await authenticate(),
      patient = await patientContext(
        auth,
        params.get("careRecipientId"),
        "access.manage",
        true,
      );
    return NextResponse.json({
      data: await rpc(auth.client, "membership_impact", {
        p_patient: patient.id,
        p_user: userId,
      }),
    });
  });
}
