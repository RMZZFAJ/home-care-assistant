import { constants,createCipheriv,createDecipheriv,createHash,privateDecrypt } from "node:crypto";
import { z } from "zod";
const envelope=z.object({encrypted_aes_key:z.string().min(1).max(10000),encrypted_flow_data:z.string().min(1).max(200000),initial_vector:z.string().min(1).max(100)}).strict();
export function decryptFlow(input:unknown,key:string,passphrase?:string){
 const body=envelope.parse(input);const aes=privateDecrypt({key,passphrase,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:"sha256"},Buffer.from(body.encrypted_aes_key,"base64"));
 const iv=Buffer.from(body.initial_vector,"base64");const encrypted=Buffer.from(body.encrypted_flow_data,"base64");if(aes.length!==16||iv.length!==16||encrypted.length<17)throw new Error("Invalid encrypted envelope");
 const decipher=createDecipheriv("aes-128-gcm",aes,iv);decipher.setAuthTag(encrypted.subarray(-16));const payload=JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]).toString("utf8"));
 return {payload,encrypt:(value:unknown)=>{const flipped=Buffer.from(iv.map((byte)=>byte^255));const cipher=createCipheriv("aes-128-gcm",aes,flipped);return Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final(),cipher.getAuthTag()]).toString("base64");}};
}
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const flowRequest=z.object({version:z.string().max(10),action:z.enum(["ping","INIT","data_exchange","BACK"]),flow_token:z.string().min(32).max(200).optional(),screen:z.string().max(80).optional(),data:z.object({text:z.string().trim().min(3).max(2000),kind:z.enum(["consumption","shortage"]),products:z.array(z.string().min(1).max(120)).max(100).optional()}).optional()});
