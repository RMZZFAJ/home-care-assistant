import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, patientContext, requireGlobal, rpc } from "@/lib/server/api";
import { catalogueReceiptHistory, catalogueReceiptScope } from "@/lib/validation/catalogue-preparation";

const querySchema = catalogueReceiptScope.extend({ before: z.uuid().nullable() })
  .refine(scope => scope.mode === "global" || scope.patientId !== null);

export async function GET(request: Request) {
  return api("admin.catalogue-preparation.receipts", async () => {
    const params = new URL(request.url).searchParams;
    const scope = parseQuery(querySchema, {
      patientId: params.get("patientId"), mode: params.get("mode"), before: params.get("before"),
    });
    const auth = await authenticate();
    if (scope.mode === "global") requireGlobal(auth);
    else await patientContext(auth, scope.patientId);
    const result = catalogueReceiptHistory.parse(await rpc(auth.client, "catalogue_preparation_receipts", {
      p_patient: scope.patientId, p_mode: scope.mode, p_before: scope.before,
    }));
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  });
}
