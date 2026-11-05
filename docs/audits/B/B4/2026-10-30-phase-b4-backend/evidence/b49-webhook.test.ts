/* Signed synthetic envelopes, real Route Handler, simulated service RPC only. */
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { createHmac } from 'node:crypto';
const setup=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/server/service-client',()=>({createWorkerClient:()=>({rpc:setup.rpc})}));
import { POST } from '@/app/api/notifications/webhook/route';
const text={id:'synthetic-text',from:'15550000000',type:'text',text:{body:'Faltou material fictício'}};
const flow={id:'synthetic-flow',from:'15550000000',type:'interactive',interactive:{type:'nfm_reply',nfm_reply:{body:'Sent',name:'flow',response_json:'{}'}}};
const payload=(messages:unknown[],account='123')=>({object:'whatsapp_business_account',entry:[{id:account,changes:[{field:'messages',value:{metadata:{phone_number_id:'456'},messages}}]}]});
const request=(data:unknown,valid=true)=>{const body=JSON.stringify(data);return new Request('https://care.example/api/notifications/webhook',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256',valid?'TEST_ONLY_SECRET':'WRONG_TEST_SECRET').update(body).digest('hex')},body});};
beforeEach(()=>{vi.stubEnv('META_APP_SECRET','TEST_ONLY_SECRET');vi.stubEnv('META_WHATSAPP_BUSINESS_ACCOUNT_ID','123');vi.stubEnv('META_WHATSAPP_PHONE_NUMBER_ID','456');setup.rpc.mockReset();setup.rpc.mockImplementation(async(name:string)=>({data:name==='inbound_report_context'?{catalog:[]}:null,error:null}));});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it('B49-02 valid text alone reaches the ingestion RPC',async()=>{
 const r=await POST(request(payload([text])));expect(r.status).toBe(200);expect(await r.json()).toMatchObject({processed:1});expect(setup.rpc.mock.calls.some(([n])=>n==='ingest_whatsapp_report')).toBe(true);
});
it('B49-03 one unsupported interactive shape silently suppresses valid text in the same batch',async()=>{
 const r=await POST(request(payload([text,flow])));expect(r.status).toBe(200);expect(await r.json()).toEqual({received:true,processed:0});expect(setup.rpc).not.toHaveBeenCalled();
});
it('B49-04 wrong signature never reaches privileged RPC',async()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});const r=await POST(request(payload([text]),false));expect(r.status).toBe(403);expect(setup.rpc).not.toHaveBeenCalled();
});
it('B49-05 signed payload from another account is still refused',async()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});const r=await POST(request(payload([text],'999')));expect(r.status).toBe(403);expect(setup.rpc).not.toHaveBeenCalled();
});
