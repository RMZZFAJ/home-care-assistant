import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  parseQuery,
  rpc,
} from "@/lib/server/api";
import {
  flowPreparationListQuery,
  parseFlowPreparationList,
} from "@/lib/validation/flow-preparations";
export async function GET(request: Request) {
  return api("flow.preparation.list", async () => {
    const v = parseQuery(
        flowPreparationListQuery,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const value = await rpc(auth.client, "flow_preparation_list", {
      p_patient: v.careRecipientId,
      p_before: v.before ?? null,
      p_before_id: v.beforeId ?? null,
      p_limit: v.limit,
    });
    return NextResponse.json(parseFlowPreparationList(value), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
