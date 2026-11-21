import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import {
  consumptionPreparationReferenceQuery,
  parseConsumptionPreparationReference,
} from "@/lib/validation/consumption-preparations";
// Read-only POST keeps up to100 selected material IDs out of URL length limits.
export async function POST(request: Request) {
  return api("consumption.preparation.reference", async () => {
    const v = await readJson(request, consumptionPreparationReferenceQuery),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const value = await rpc(auth.client, "consumption_preparation_reference", {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_target: v.targetResourceId,
      p_fields: v.fields,
    });
    const data = parseConsumptionPreparationReference(value, {
      patientId: v.careRecipientId,
      purpose: v.purpose,
      targetResourceId: v.targetResourceId,
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
