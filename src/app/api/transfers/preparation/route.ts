import { NextResponse } from "next/server";
import type { DeliveryPreparation } from "@/types/documents";
import type { TransferPreparation } from "@/types/transfers";
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
    const input = { p_patient: patient.id, p_source: source };
    const [preparation, recipients] = await Promise.all([
      rpc(auth.client, "transfer_preparation", input) as Promise<TransferPreparation>,
      source === "FAMILY" ? rpc(auth.client, "delivery_preparation", input) as Promise<DeliveryPreparation> : null,
    ]);
    const suggestedId = recipients?.suggestedId;
    const suggested = suggestedId && preparation.people.some((person) => person.id === suggestedId)
      ? recipients?.shifts.find((shift) => shift.professionalId === suggestedId)
      : undefined;
    return NextResponse.json(
      {
        data: { ...preparation, suggested: suggested ?? null },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
