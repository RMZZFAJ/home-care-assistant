import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  rpc,
} from "@/lib/server/api";

export async function GET(request: Request) {
  return api("transfers.preparation", async () => {
    const params = new URL(request.url).searchParams,
      auth = await authenticate();
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "ent.create",
    );
    const source = params.get("source");
    if (source !== "FAMILY" && source !== "CARE_TEAM")
      throw new ApiError("VALIDATION_ERROR", "Escolha a custódia de origem.");
    return NextResponse.json(
      {
        data: await rpc(auth.client, "transfer_preparation", {
          p_patient: patient.id,
          p_source: source,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
