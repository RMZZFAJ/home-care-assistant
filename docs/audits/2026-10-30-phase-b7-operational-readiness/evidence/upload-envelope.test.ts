/* In-memory synthetic PDF only. No server, DB, Storage or remote upload. */
import {it,expect,vi,beforeAll,afterAll} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {writeFileSync} from 'node:fs';
vi.mock('@/lib/server/api',()=>({ApiError:class ApiError extends Error{
 constructor(public code:string,message:string,public status:number){super(message);}
}}));
import {boundedUpload,sanitizeFile} from '@/lib/server/files';
const rows:unknown[]=[];let pdf:Uint8Array;let calls=0;
beforeAll(async()=>{
 vi.stubGlobal('fetch',()=>{calls++;throw new Error('B7 network forbidden');});
 const doc=await PDFDocument.create();doc.addPage([100,100]);pdf=await doc.save();
});
afterAll(()=>{
 expect(calls).toBe(0);
 writeFileSync(new URL('upload-envelope-results.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),method:'Real local boundedUpload/sanitizeFile; synthetic valid PDF padded with whitespace; platform limit is documentary, not a remote 413 test',networkCalls:calls,cases:rows},null,2)+'\n');
 vi.unstubAllGlobals();
});
for(const mib of [1,6,11])it(`UPL-${mib}: ${mib}MiB valid PDF through local envelope`,async()=>{
 const bytes=Buffer.alloc(mib*1024*1024,32);bytes.set(pdf);
 const form=new FormData();form.set('file',new File([bytes],'B7-synthetic.pdf',{type:'application/pdf'}));
 const request=new Request('https://b7.example/api/attachments',{method:'POST',body:form});
 const wireBytes=(await request.clone().arrayBuffer()).byteLength;
 if(mib===11){await expect(boundedUpload(request)).rejects.toMatchObject({code:'PAYLOAD_TOO_LARGE'});rows.push({id:`UPL-${mib}`,fileBytes:bytes.length,wireBytes,localAccepted:false});return;}
 const bounded=await boundedUpload(request);const sanitized=await sanitizeFile(bounded.bytes,bounded.file.type);
 expect(sanitized.mime).toBe('application/pdf');expect(sanitized.bytes.length).toBeLessThan(10000);
 rows.push({id:`UPL-${mib}`,fileBytes:bytes.length,wireBytes,localAccepted:true,sanitizedBytes:sanitized.bytes.length,aboveDocumentedVercelLimit:wireBytes>4500000&&wireBytes>4.5*1024*1024});
});
