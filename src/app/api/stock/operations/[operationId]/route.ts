import { NextResponse } from "next/server";
import { api, ApiError, authenticate, patientContext, rpc } from "@/lib/server/api";
import { parseStockOperationDetail, stockOperationId } from "@/lib/validation/stock-reads";

export async function GET(request: Request, context: { params: Promise<{ operationId: string }> }) {
  return api("stock.operation.detail", async () => {
    const operation = stockOperationId.safeParse((await context.params).operationId);
    if (!operation.success) throw new ApiError("VALIDATION_ERROR", "Informe uma operação de estoque válida.");

    const auth = await authenticate();
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"));
    const data = await rpc(auth.client, "stock_operation_detail", { p_patient: patient.id, p_operation: operation.data });
    if (data == null) throw new ApiError("NOT_FOUND", "Esta operação não está disponível para o vínculo atual.", 404);

    const careRecipientId = patient.id;
    return NextResponse.json(
      { careRecipientId, data: parseStockOperationDetail({ careRecipientId, data }, careRecipientId, operation.data) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
