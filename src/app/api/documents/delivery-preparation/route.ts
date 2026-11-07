import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  rpc,
} from "@/lib/server/api";

export async function GET(request: Request) {
  return api("delivery.preparation", async () => {
    const params = new URL(request.url).searchParams;
    const auth = await authenticate();
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "ent.create",
    );
    const source = params.get("source");
    if (source !== "FAMILY" && source !== "CARE_TEAM")
      throw new ApiError("VALIDATION_ERROR", "Escolha a origem da entrega.");
    const data = await rpc(auth.client, "delivery_preparation", {
      p_patient: patient.id,
      p_source: source,
    });
    return NextResponse.json({ data });
  });
}
