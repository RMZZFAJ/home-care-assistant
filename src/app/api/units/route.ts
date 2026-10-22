import { NextResponse } from "next/server";
import { z } from "zod";
import { api,authenticate,databaseError,readJson,rpc,uuid } from "@/lib/server/api";
export async function GET(){return api("units.read",async()=>{const auth=await authenticate();const {data,error}=await auth.client.from("measurement_units").select("*").order("name");if(error)databaseError(error);return NextResponse.json({data});});}
export async function POST(request:Request){return api("units.create",async()=>{const auth=await authenticate();const input=await readJson(request,z.object({careRecipientId:uuid.nullable(),code:z.string().trim().min(1).max(30),name:z.string().trim().min(2).max(80),dimension:z.enum(["count","volume","mass","package"]),decimals:z.number().int().min(0).max(6)}).strict());return NextResponse.json({id:await rpc(auth.client,"create_measurement_unit",{p_patient:input.careRecipientId,p_code:input.code,p_name:input.name,p_dimension:input.dimension,p_decimals:input.decimals})});});}
