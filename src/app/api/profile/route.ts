import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, databaseError, readJson, rpc, validateMutationRequest } from "@/lib/server/api";
import { boundedUpload, sanitizeFile } from "@/lib/server/files";

export async function GET() {return api("profile.read",async () => {
  const auth=await authenticate(); const {data,error}=await auth.client.from("profiles").select("full_name,avatar_path,professional_registration,professional_state,professional_category,notification_preferences").eq("id",auth.userId).single(); if(error) databaseError(error);
  const {data:{user}}=await auth.client.auth.getUser(); const sessions=await rpc(auth.client,"my_sessions");
  const avatar=data.avatar_path ? (await auth.client.storage.from("profile-avatars").createSignedUrl(data.avatar_path,120)).data?.signedUrl : null;
  return NextResponse.json({data:{...data,avatar_path:undefined,avatar,email:user?.email,providers:user?.identities?.map((identity)=>identity.provider)??[]},sessions});
});}
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("update"),name:z.string().trim().min(2).max(160),registration:z.string().trim().max(30).default(""),state:z.string().regex(/^[A-Z]{2}$/).nullable(),category:z.string().trim().max(80).default(""),preferences:z.object({internal:z.boolean(),whatsapp:z.boolean(),email:z.boolean()}).strict()}).strict(),
  z.object({action:z.literal("password"),currentPassword:z.string().min(1).max(256),password:z.string().min(12).max(256)}).strict(),
  z.object({action:z.literal("signoutOthers")}).strict(),
]);
export async function POST(request:Request) {return api("profile.write",async () => {
  const auth=await authenticate();
  if(request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    validateMutationRequest(request,false); const {file,bytes}=await boundedUpload(request,5_242_880);const safe=await sanitizeFile(bytes,file.type,true);const objectPath=auth.userId+"/"+crypto.randomUUID()+".jpg";
    const {error}=await auth.client.storage.from("profile-avatars").upload(objectPath,safe.bytes,{contentType:safe.mime,upsert:false});if(error) throw new ApiError("PERSISTENCE_UNCONFIRMED","Não foi possível confirmar a foto.",503,true);await rpc(auth.client,"set_my_avatar",{p_path:objectPath});return NextResponse.json({saved:true});
  }
  const input=await readJson(request,schema);
  if(input.action==="update") await rpc(auth.client,"update_my_profile",{p_name:input.name,p_registration:input.registration,p_state:input.state,p_category:input.category,p_preferences:input.preferences});
  else if(input.action==="password") {
    const {data:{user}}=await auth.client.auth.getUser(); if(!user?.email) throw new ApiError("FORBIDDEN","Confirme seu acesso antes de alterar a senha.",403);
    const {error:reauth}=await auth.client.auth.signInWithPassword({email:user.email,password:input.currentPassword});if(reauth) throw new ApiError("FORBIDDEN","Senha atual inválida. Entre novamente se necessário.",403);
    const {error}=await auth.client.auth.updateUser({password:input.password});if(error) throw new ApiError("VALIDATION_ERROR","Não foi possível alterar a senha. Confira os critérios da conta.");
  } else {
    if(!await rpc(auth.client,"recent_session")) throw new ApiError("FORBIDDEN","Entre novamente para encerrar as outras sessões.",403);
    const {error}=await auth.client.auth.signOut({scope:"others"});if(error) throw new ApiError("PERSISTENCE_UNCONFIRMED","Não foi possível confirmar o encerramento das sessões.",503,true);
  }
  return NextResponse.json({saved:true});
});}
