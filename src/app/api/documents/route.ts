import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, pageParameters, patientContext, readJson, rpc, saoPauloDateBoundary } from "@/lib/server/api";
import { createSupplySchema } from "@/lib/validation/documents";

export async function GET(request: Request) {
  return api("documents.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize, start, end } = pageParameters(params);
    let query = auth.client.from("operational_documents").select("id,care_recipient_id,type,code,protocol,status,version,created_by,recipient_id,created_at,updated_at,content_hash,document_lines(id,fully_checked,accepted_quantity,quantity)", { count: "exact" }).eq("care_recipient_id", patient.id).order("created_at", { ascending: false }).order("id").range(start, end);
    const type = params.get("type");
    if (type && !["REQ", "COM", "ENT", "BAL"].includes(type)) throw new ApiError("VALIDATION_ERROR", "Tipo de ficha inválido.");
    if (type) query = query.eq("type", type);
    const status = params.get("status");
    if (status) { if (!/^[a-z_]{1,40}$/.test(status)) throw new ApiError("VALIDATION_ERROR", "Estado inválido."); query = query.eq("status", status); }
    const search = params.get("search")?.trim();
    if (search) { if (!/^[A-Za-z0-9-]{1,100}$/.test(search)) throw new ApiError("VALIDATION_ERROR", "Pesquise pelo código ou protocolo."); query = query.or(`code.ilike.%${search}%,protocol.ilike.%${search}%`); }
    if (params.get("from")) query = query.gte("created_at", saoPauloDateBoundary(params.get("from")!));
    if (params.get("to")) query = query.lt("created_at", saoPauloDateBoundary(params.get("to")!, true));
    const { data, error, count } = await query;
    if (error) databaseError(error);
    const enriched=await Promise.all((data??[]).map(async(row)=>({...row,...(row.type==="REQ"?{fulfillment:await rpc(auth.client,"requisition_fulfillment",{p_requisition:row.id})}:{})})));
    return NextResponse.json({ data: enriched, page, pageSize, total: count ?? 0 });
  });
}
export async function POST(request: Request) {
  return api("documents.create", async () => {
    const input = await readJson(request, createSupplySchema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, input.type === "COM" ? "com.create" : input.type === "ENT" ? "ent.create" : "bal.count", true);
    const data = await rpc(auth.client, "create_supply_document", { p_patient: input.careRecipientId, p_type: input.type, p_payload: input.payload, p_key: input.idempotencyKey, p_draft: input.draft });
    return NextResponse.json({ data, persistence: "confirmed" }, { status: 201 });
  });
}
