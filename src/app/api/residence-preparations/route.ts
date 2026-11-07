import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, readJson, requireGlobal, rpc } from "@/lib/server/api";
import { preparationCommand, preparationQuery } from "@/lib/validation/residence-preparation";
import { parseQuery } from "@/lib/server/api";
export async function GET(request: Request) {
  return api("residence.preparation.read",async()=>{
    const auth=await authenticate(); requireGlobal(auth);
    const params=new URL(request.url).searchParams,id=params.get("id");
    if(id){const key=parseUuid(id);return NextResponse.json({data:await rpc(auth.client,"residence_preparations",{p_id:key}),status:await rpc(auth.client,"residence_preparation_status",{p_id:key})});}
    const query=parseQuery(preparationQuery,Object.fromEntries(params));
    return NextResponse.json(await rpc(auth.client,"residence_preparation_page",{p_page:query.page,p_size:20,p_query:query.query}));
  });
}
export async function POST(request: Request) {
  return api("residence.preparation.write",async()=>{
    const input=await readJson(request,preparationCommand),auth=await authenticate(); requireGlobal(auth);
    return NextResponse.json({data:await rpc(auth.client,"residence_preparation_command",{p_id:input.id,p_expected:input.expectedRevision,p_action:input.action,p_content:input.content,p_step:input.step,p_key:input.idempotencyKey})});
  });
}
