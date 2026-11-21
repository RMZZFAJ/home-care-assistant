import { NextResponse } from "next/server";
import { api,authenticate,readJson,rpc,patientContext } from "@/lib/server/api";
import { guideCommand } from "@/lib/validation/guides";
export async function GET() { return api("guides.read",async()=>{const auth=await authenticate();return NextResponse.json({data:await rpc(auth.client,"guide_context")});}); }
export async function POST(request:Request) {
  return api("guides.write",async()=>{
    const input=await readJson(request,guideCommand),auth=await authenticate();
    if(input.action==="configure") {
      await patientContext(auth,input.careRecipientId,"manage");
      return NextResponse.json({data:await rpc(auth.client,"configure_patient_guide",{p_patient:input.careRecipientId,p_expected:input.expectedRevision,p_show:input.showOnFirstAccess,p_key:input.idempotencyKey})});
    }
    return NextResponse.json({data:await rpc(auth.client,"guide_progress_command",{p_scope:input.expectedScope,p_expected:input.expectedRevision,p_step:input.step,p_status:input.status,p_key:input.idempotencyKey})});
  });
}
