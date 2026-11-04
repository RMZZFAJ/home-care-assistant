/* New cache-integrity hypothesis. Real service, controlled clients/bytes.
 * No existing object overwritten, no HTTP/Auth/Storage success claimed. */
import { it,expect,vi } from 'vitest';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const state=vi.hoisted(()=>({calls:[] as string[],bytes:Buffer.from('%PDF-1.7\nCORRUPTED_FICTIONAL_B6')}));
vi.mock('@/lib/server/service-client',()=>({createWorkerClient:()=>({storage:{from:()=>({download:async()=>{state.calls.push('download');return {data:new Blob([new Uint8Array(state.bytes)]),error:null};}})}})}));
vi.mock('@/lib/server/api',()=>({rpc:async()=>({version:3,protocol:'ENT-B6',code:'ENT-0001'}),ApiError:class extends Error{},databaseError:(e:Error)=>{throw e;}}));
import { documentPdf } from '@/lib/server/document-pdf';
it('B67-C01 cached bytes are returned without comparison to registered sha256 in both branches',async()=>{
 const cases=[];
 for(const legacy of [false,true]){
  const selected:string[]=[];
  const query={select:(s:string)=>{selected.push(s);return query;},eq:()=>query,maybeSingle:async()=>({data:{object_path:'b6/3/existing.pdf',sha256:'a'.repeat(64)},error:null})};
  const client={from:(table:string)=>{state.calls.push(table);return query;}};
  const r=await documentPdf(client as never,'b6000000-0000-4000-8000-000000000001',3,legacy);
  expect(r.bytes.equals(state.bytes)).toBe(true);expect(selected).toEqual(['object_path']);
  cases.push({legacy,selected,returnedDifferentBytes:true,actualSha256:createHash('sha256').update(r.bytes).digest('hex'),registeredSha256:'a'.repeat(64),filename:r.filename});
 }
 expect(state.calls).not.toContain('document_events');
 writeFileSync('docs/audits/2026-10-30-phase-b6-documents/evidence/b67-cache-results.json',JSON.stringify({scenario:'B67-C01',method:'Real documentPdf with controlled auth-result and Storage;privileged corruption modeled,not reproduced in real bucket',cases,calls:state.calls,externalCalls:0},null,2)+'\n');
});
