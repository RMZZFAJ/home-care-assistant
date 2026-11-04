/* Real profile handler, controlled Auth and SQL clients. No real OTP/SMS. */
import {beforeEach,it,expect,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
const setup=vi.hoisted(()=>({client:{rpc:vi.fn(),auth:{verifyOtp:vi.fn()}},confirmed:false}));
vi.mock('@/lib/server/api',async importOriginal=>({...await importOriginal<typeof import('@/lib/server/api')>(),authenticate:async()=>({client:setup.client,userId:'b5000000-0000-4000-8000-000000000020'})}));
import {POST} from '@/app/api/profile/route';
const request=()=>new Request('https://care.example/api/profile',{method:'POST',headers:{'content-type':'application/json',origin:'https://care.example'},body:JSON.stringify({action:'verifyPhone',phone:'+15550000001',token:'123456'})});
const cases:Record<string,unknown>={};
beforeEach(()=>{setup.confirmed=false;setup.client.rpc.mockReset();setup.client.auth.verifyOtp.mockReset();vi.spyOn(console,'error').mockImplementation(()=>{});});
it('B59-C01 Auth success followed by SQL failure has no resumable HTTP verification step',async()=>{
 setup.client.rpc.mockImplementation(async(name:string)=>({data:name==='recent_session'?true:null,error:name==='register_verified_phone'?{code:'08006',message:'B5 synthetic SQL unavailable'}:null}));
 setup.client.auth.verifyOtp.mockImplementation(async()=>{if(setup.confirmed)return {error:{message:'B5 synthetic consumed OTP'}};setup.confirmed=true;return {error:null};});
 const first=await POST(request()),second=await POST(request());
 expect(first.status).toBe(503);expect(second.status).toBe(400);expect(setup.client.rpc.mock.calls.filter(c=>c[0]==='register_verified_phone')).toHaveLength(1);
 cases['B59-C01']={firstHttp:503,retryHttp:400,simulatedAuthAlreadyConfirmed:true,registrationAttempts:1,limit:'Auth committed/one-use OTP behavior simulated; no real OTP, Auth state change or SQL persistence in this probe'};
});
it('B59-C02 fully successful Auth and registry call returns success',async()=>{
 setup.client.rpc.mockImplementation(async(name:string)=>({data:name==='recent_session'?true:null,error:null}));setup.client.auth.verifyOtp.mockResolvedValue({error:null});const response=await POST(request());expect(response.status).toBe(200);expect(setup.client.rpc.mock.calls.map(c=>c[0])).toEqual(['recent_session','register_verified_phone']);
 cases['B59-C02']={http:200,registryCalled:true};writeFileSync('docs/audits/2026-10-30-phase-b5-integrations/evidence/b59-phone-cases.json',JSON.stringify(cases,null,2)+'\n');
});
