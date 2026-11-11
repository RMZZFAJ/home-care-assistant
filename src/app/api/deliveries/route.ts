import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  ApiError,
  pageParameters,
  patientContext,
  rpc,
} from "@/lib/server/api";
import { parseDeliveryListRead } from "@/lib/validation/document-list";

export async function GET(request: Request) {
  return api("deliveries.inbox", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "ent.read",
    );
    const { page, pageSize } = pageParameters(params);
    const scope = params.get("scope") ?? "own";
    const status = params.get("status") ?? "tasks";
    if (
      !["own", "team"].includes(scope) ||
      ![
        "",
        "tasks",
        "transfer_pending",
        "transfer_ready",
        "pending_receipt",
        "disputed",
        "cancellation_pending",
        "confirmed",
        "cancelled",
        "administratively_closed",
      ].includes(status) ||
      (status === "tasks" && scope !== "own")
    )
      throw new ApiError("VALIDATION_ERROR", "Revise os filtros de entrega.");
    const result = await rpc(auth.client, "delivery_task_list", {
        p_patient: patient.id,
        p_scope: scope,
        p_status: status,
        p_page: page,
        p_size: pageSize,
      });
    const body = {
      ...(result as Record<string, unknown>),
      careRecipientId: patient.id, page, pageSize, filters: { scope, status },
    };
    parseDeliveryListRead(body, { careRecipientId: patient.id, page, pageSize, scope, status });
    return NextResponse.json(body);
  });
}
