import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseQuery, patientContext, rpc } from "@/lib/server/api";
import { localPreparationQuery, parseLocalPreparation } from "@/lib/validation/local-preparation";
export async function GET(request:Request){
  return api("guides.preparation.read",async()=>{
    const params=new URL(request.url).searchParams;
    if(params.getAll("careRecipientId").length!==1)throw new ApiError("VALIDATION_ERROR","Selecione um único paciente para consultar a preparação.");
    const query=parseQuery(localPreparationQuery,Object.fromEntries(params));
    const auth=await authenticate();await patientContext(auth,query.careRecipientId);
    const data=parseLocalPreparation(await rpc(auth.client,"local_preparation_context",{p_patient:query.careRecipientId}),query.careRecipientId);
    return NextResponse.json({data},{headers:{"cache-control":"private, no-store"}});
  });
}
