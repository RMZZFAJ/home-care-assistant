import { NextResponse } from "next/server";
import { api,authenticate,patientContext,readJson,rpc,databaseError,ApiError } from "@/lib/server/api";
import { selectionCommandSchema } from "@/lib/validation/recurring-selection";
export async function GET(request:Request){
  return api("requisitions.selections.read",async()=>{
    const auth=await authenticate(),patient=await patientContext(auth,new URL(request.url).searchParams.get("careRecipientId"));
    return NextResponse.json({data:await rpc(auth.client,"requisition_selections",{p_patient:patient.id})},{headers:{"Cache-Control":"no-store"}});
  });
}
export async function POST(request:Request){
  return api("requisitions.selections.save",async()=>{
    const input=await readJson(request,selectionCommandSchema),auth=await authenticate(),patient=await patientContext(auth,input.careRecipientId);
    const {data,error}=await auth.client.rpc("save_requisition_selection",{p_patient:patient.id,p_name:input.name,p_products:input.productIds,p_key:input.idempotencyKey});
    if(error?.code==="23505"&&error.message==="requisition selection name exists")throw new ApiError("DUPLICATE","Você já tem uma lista com esse nome neste paciente. Use outro nome para preservar ambas.",409);
    if(error)databaseError(error);
    return NextResponse.json({data},{headers:{"Cache-Control":"no-store"}});
  });
}
