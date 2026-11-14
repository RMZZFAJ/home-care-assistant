import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  parseUuid,
  patientContext,
  rpc,
} from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("requisition.decision-context", async () => {
    const id = parseUuid((await context.params).id),
      auth = await authenticate();
    const { data, error } = await auth.client
      .from("requisitions")
      .select("care_recipient_id")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data)
      throw new ApiError("NOT_FOUND", "Requisição não encontrada.", 404);
    await patientContext(auth, data.care_recipient_id);
    return NextResponse.json(
      {
        data: await rpc(auth.client, "requisition_decision_context", {
          p_id: id,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
