/* Real crypto and HTTP handler, ephemeral keys, controlled service RPC only. */
import { beforeEach, it, expect, vi } from 'vitest';
import { constants,createCipheriv,createDecipheriv,createHmac,generateKeyPairSync,publicEncrypt,randomBytes } from 'node:crypto';
import {writeFileSync} from 'node:fs';
const setup=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/server/service-client',()=>({createWorkerClient:()=>({rpc:setup.rpc})}));
import { POST } from '@/app/api/whatsapp/flows/route';
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const cases:Record<string,unknown>={};
function request(payload:unknown,badSignature=false,tamper=false){
 const aes=randomBytes(16),iv=randomBytes(16),c=createCipheriv('aes-128-gcm',aes,iv);
 const encrypted=Buffer.concat([c.update(JSON.stringify(payload)),c.final(),c.getAuthTag()]);if(tamper)encrypted[0]^=1;
 const body=JSON.stringify({encrypted_aes_key:publicEncrypt({key:keys.publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes).toString('base64'),encrypted_flow_data:encrypted.toString('base64'),initial_vector:iv.toString('base64')});
 return {req:new Request('https://care.example/api/whatsapp/flows',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256',badSignature?'B5_WRONG':'B5_FLOW_SECRET').update(body).digest('hex')},body}),decode:(text:string)=>{const bytes=Buffer.from(text,'base64'),d=createDecipheriv('aes-128-gcm',aes,Buffer.from(iv.map(x=>x^255)));d.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([d.update(bytes.subarray(0,-16)),d.final()]).toString());}};
}
beforeEach(()=>{vi.stubEnv('META_FLOWS_ENABLED','true');vi.stubEnv('META_APP_SECRET','B5_FLOW_SECRET');vi.stubEnv('META_FLOWS_PRIVATE_KEY',keys.privateKey.export({type:'pkcs8',format:'pem'}).toString());setup.rpc.mockReset();setup.rpc.mockResolvedValue({data:null,error:null});vi.spyOn(console,'error').mockImplementation(()=>{});});
it('B57-C01 ping is encrypted and authenticated with the expected flipped IV',async()=>{
 const q=request({version:'3.0',action:'ping'});const r=await POST(q.req);expect(r.status).toBe(200);expect(q.decode(await r.text())).toEqual({data:{status:'active'}});expect(setup.rpc).not.toHaveBeenCalled();cases['B57-C01']={http:200,encryptedRoundtrip:true,rpcCalls:0};
});
it('B57-C02 expired token returns a generic plain JSON403 instead of encrypted token invalidation',async()=>{
 setup.rpc.mockResolvedValue({data:null,error:{code:'42501',message:'flow session expired'}});const q=request({version:'3.0',action:'INIT',flow_token:'B5-synthetic-token-with-at-least-32-chars'});const r=await POST(q.req);expect(r.status).toBe(403);expect(r.headers.get('content-type')).toContain('application/json');expect((await r.json()).code).toBe('FORBIDDEN');cases['B57-C02']={http:403,body:'generic JSON',officialSampleContract:'427 with encrypted error_msg for invalid token',limit:'RPC outcome controlled; external client behavior not exercised'};
});
it('B57-C03 client error notification is refused by the union schema instead of acknowledged',async()=>{
 const q=request({version:'3.0',action:'data_exchange',flow_token:'B5-synthetic-token-with-at-least-32-chars',data:{error:'B5_SYNTHETIC_CLIENT_ERROR',error_message:'synthetic'}});const r=await POST(q.req);expect(r.status).toBe(400);expect(setup.rpc).not.toHaveBeenCalled();cases['B57-C03']={http:400,acknowledged:false,rpcCalls:0};
});
it('B57-C04 bad signature and corrupted ciphertext never reach service RPC',async()=>{
 const a=await POST(request({version:'3.0',action:'ping'},true).req);const b=await POST(request({version:'3.0',action:'ping'},false,true).req);expect(a.status).toBe(403);expect(b.status).toBe(421);expect(setup.rpc).not.toHaveBeenCalled();cases['B57-C04']={badSignature:403,badCiphertext:421,rpcCalls:0};
 writeFileSync('docs/audits/2026-10-30-phase-b5-integrations/evidence/b57-endpoint-cases.json',JSON.stringify(cases,null,2)+'\n');
});
