import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseQuery, patientContext, readJson, rpc, uuid } from "@/lib/server/api";
import {
  stockOperationInput, stockOperationProducts, stockOperationReceipt, stockOperationReference,
} from "@/lib/validation/stock-operation";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return api("stock.operation.read", async () => {
    const params = new URL(request.url).searchParams;
    const auth = await authenticate();
    const patientId = parseQuery(uuid, params.get("careRecipientId"));
    const productIds = params.getAll("productId");
    const attemptKey = params.get("attemptKey");
    if (params.getAll("careRecipientId").length !== 1 || params.getAll("attemptKey").length > 1
      || (attemptKey !== null && productIds.length > 0))
      throw new ApiError("VALIDATION_ERROR", "Consulte os materiais ou a tentativa de movimentação.");
    await patientContext(auth, patientId, "stock.family.manage");
    if (attemptKey !== null) {
      const key = parseQuery(uuid, attemptKey);
      const data = stockOperationReceipt.nullable().parse(await rpc(auth.client, "family_stock_operation_result", { p_patient: patientId, p_key: key }));
      return NextResponse.json({ data }, { headers });
    }
    const products = parseQuery(stockOperationProducts, productIds);
    const data = stockOperationReference.parse(await rpc(auth.client, "family_stock_operation_reference", { p_patient: patientId, p_products: products }));
    return NextResponse.json({ data }, { headers });
  });
}

export async function POST(request: Request) {
  return api("stock.operation.commit", async () => {
    const input = await readJson(request, stockOperationInput);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "stock.family.manage", true);
    const data = stockOperationReceipt.parse(await rpc(auth.client, "commit_family_stock_operation", {
      p_patient: input.careRecipientId, p_action: input.action, p_lines: input.lines,
      p_reason: input.reason, p_reference: input.referenceHash, p_key: input.idempotencyKey,
    }));
    return NextResponse.json({ data, persistence: "confirmed" }, { status: 201, headers });
  });
}
