import { NextResponse } from "next/server";
import { z } from "zod";
import { api,ApiError,authenticate,readJson,rpc,uuid } from "@/lib/server/api";
import { supplyPayload } from "@/lib/validation/documents";
const schema=z.object({payload:supplyPayload,idempotencyKey:uuid,submissionKey:uuid,expectedVersion:z.number().int().positive(),recount:z.boolean(),submit:z.boolean()}).strict();
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return api("documents.revise",async()=>{const {id}=await context.params;if(!uuid.safeParse(id).success)throw new ApiError("VALIDATION_ERROR","Identificador inválido.");const input=await readJson(request,schema);const auth=await authenticate();let data=await rpc(auth.client,"revise_supply_document",{p_id:id,p_payload:input.payload,p_key:input.idempotencyKey,p_version:input.expectedVersion,p_recount:input.recount}) as {version:number};if(input.submit&&!input.recount)data=await rpc(auth.client,"supply_document_command",{p_id:id,p_action:"submit",p_body:{},p_key:input.submissionKey,p_version:data.version});return NextResponse.json({data,persistence:"confirmed"});});}
