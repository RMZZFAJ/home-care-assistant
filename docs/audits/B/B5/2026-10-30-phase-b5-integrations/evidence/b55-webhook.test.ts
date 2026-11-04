/* Real HTTP handler and schemas; signed fictitious envelopes and controlled RPC.
 * No provider/Supabase connection. Simulated RPC outcomes are not persistence. */
import { beforeEach, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const setup=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/server/service-client',()=>({createWorkerClient:()=>({rpc:setup.rpc})}));
import { POST } from '@/app/api/notifications/webhook/route';
const text=(id:string)=>({id,from:'15550000001',type:'text',text:{body:'Faltou material fictício B5'}});
const envelope=(messages:unknown[],statuses:unknown[]=[])=>({object:'whatsapp_business_account',entry:[{id:'123',changes:[{field:'messages',value:{metadata:{phone_number_id:'456'},messages,statuses}}]}]});
const request=(payload:unknown)=>{const body=JSON.stringify(payload);return new Request('https://care.example/api/notifications/webhook',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256','B5_SYNTHETIC_SECRET').update(body).digest('hex')},body});};
const cases:Record<string,unknown>={};
beforeEach(()=>{vi.stubEnv('META_APP_SECRET','B5_SYNTHETIC_SECRET');vi.stubEnv('META_WHATSAPP_BUSINESS_ACCOUNT_ID','123');vi.stubEnv('META_WHATSAPP_PHONE_NUMBER_ID','456');setup.rpc.mockReset();setup.rpc.mockImplementation(async(name:string)=>({data:name==='inbound_report_context'?{catalog:[]}:false,error:null}));});
it('B55-C01 malformed text between two valid messages suppresses the entire inbound array',async()=>{
 const r=await POST(request(envelope([text('a'),{...text('bad'),text:{body:'x'.repeat(2001)}},text('c')])));
 expect(r.status).toBe(200);expect(await r.json()).toEqual({received:true,processed:0});expect(setup.rpc).not.toHaveBeenCalled();cases['B55-C01']={status:200,processed:0,ingestionCalls:0,relation:'B4-011 extended to invalid middle item'};
});
it('B55-C02 valid status commits through RPC even when adjacent inbound array is discarded',async()=>{
 const r=await POST(request(envelope([text('a'),{id:'nfm',from:'15550000001',type:'interactive',interactive:{nfm_reply:{response_json:'{}'}}}],[{id:'ref',status:'read'}])));
 expect(await r.json()).toEqual({received:true,processed:1});expect(setup.rpc.mock.calls.map(c=>c[0])).toEqual(['notification_webhook']);cases['B55-C02']={status:200,statusRpc:1,textRpc:0,limit:'RPC controlled; no database commit claimed'};
});
it('B55-C03 absent unique patient context counts text as processed with no ingestion or handoff',async()=>{
 setup.rpc.mockResolvedValue({data:null,error:null});const r=await POST(request(envelope([text('ambiguous-context')])));
 expect(await r.json()).toEqual({received:true,processed:1});expect(setup.rpc.mock.calls.map(c=>c[0])).toEqual(['inbound_report_context']);cases['B55-C03']={status:200,processed:1,ingestion:0,recoveryRecord:0};
});
it('B55-C04 rejected purpose-specific command is reported as processed',async()=>{
 const r=await POST(request(envelope([{id:'expired',from:'15550000001',type:'button',button:{payload:'HCA_SCIENCE:B5-invalid-expired-synthetic-token'}}])));
 expect(await r.json()).toEqual({received:true,processed:1});expect(setup.rpc.mock.calls.map(c=>c[0])).toEqual(['confirm_whatsapp_science']);cases['B55-C04']={status:200,processed:1,commandResult:false};
});
it('B55-C05 audio and unknown command have no processor although counted',async()=>{
 const r=await POST(request(envelope([{id:'audio',from:'15550000001',type:'audio',audio:{id:'synthetic-media',mime_type:'audio/ogg'}},{id:'unknown',from:'15550000001',type:'button',button:{payload:'UNKNOWN_B5'}}])));
 expect(await r.json()).toEqual({received:true,processed:2});expect(setup.rpc).not.toHaveBeenCalled();cases['B55-C05']={processed:2,rpcCalls:0};
});
it('B55-C06 an RPC error stops later valid items and exposes failure rather than false success',async()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});setup.rpc.mockImplementation(async(name:string,args:{p_provider_id?:string})=>({data:name==='inbound_report_context'?{catalog:[]}:null,error:args?.p_provider_id==='b'?{code:'08006',message:'synthetic database unavailable'}:null}));
 const r=await POST(request(envelope([text('a'),text('b'),text('c')])));expect(r.status).toBe(503);
 const ids=setup.rpc.mock.calls.filter(c=>c[0]==='ingest_whatsapp_report').map(c=>c[1].p_provider_id);expect(ids).toEqual(['a','b']);cases['B55-C06']={http:503,ingestionAttempts:ids,limit:'Prior commit/replay behavior depends on real RPC/provider, reviewed in SQL contracts'};
});
it('B55-C07 text valid alone and unknown status safely refused are counterproofs',async()=>{
 const a=await POST(request(envelope([text('valid')])));expect(await a.json()).toEqual({received:true,processed:1});expect(setup.rpc.mock.calls.some(c=>c[0]==='ingest_whatsapp_report')).toBe(true);
 setup.rpc.mockClear();vi.spyOn(console,'error').mockImplementation(()=>{});const b=await POST(request(envelope([text('never')],[{id:'ref',status:'unknown_b5'}])));expect(b.status).toBe(400);expect(setup.rpc).not.toHaveBeenCalled();cases['B55-C07']={validText:200,unknownStatus:400,unknownCommandNeverAuthorized:true};
 writeFileSync('docs/audits/2026-10-30-phase-b5-integrations/evidence/b55-webhook-cases.json',JSON.stringify(cases,null,2)+'\n');
});
