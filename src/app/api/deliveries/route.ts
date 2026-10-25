import { NextResponse } from "next/server";
import { api, authenticate, ApiError, databaseError, pageParameters, patientContext } from "@/lib/server/api";

export async function GET(request: Request) {
  return api("deliveries.inbox", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"), "ent.read");
    const { page, pageSize } = pageParameters(params);
    const scope = params.get("scope") ?? "own";
    const status = params.get("status") ?? "pending_receipt";
    if (!["own", "team"].includes(scope) || !["", "pending_receipt", "disputed", "confirmed", "cancelled"].includes(status)) throw new ApiError("VALIDATION_ERROR", "Revise os filtros de entrega.");
    let query = auth.client.from("operational_documents")
      .select("id,type,code,protocol,status,created_at,recipient_id,document_lines(id,fully_checked,accepted_quantity,quantity)", { count: "exact" })
      .eq("care_recipient_id", patient.id).eq("type", "ENT");
    if (scope === "own") query = query.eq("recipient_id", auth.userId);
    if (status) query = query.eq("status", status);
    const result = await query.order("created_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1);
    if (result.error) databaseError(result.error);
    return NextResponse.json({ data: (result.data ?? []).map((row) => ({ ...row, document_lines: row.document_lines.map((line) => ({ ...line, quantity: String(line.quantity), accepted_quantity: String(line.accepted_quantity) })) })), total: result.count ?? 0 });
  });
}
