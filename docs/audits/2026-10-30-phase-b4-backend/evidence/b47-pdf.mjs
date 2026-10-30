/* LOCAL private PDF service; new B4 document only. No visual-layout claim. */
import assert from 'node:assert/strict';
import { state,http,select,record } from './http-local.mjs';
import { sql,sqlLiteral } from '../../../../scripts/test-environment.mjs';
await select('admin');const id=state.objects.requisition,results=[];
const a=await http('admin','/api/documents/'+id+'/pdf?version=1',{binary:true});assert.equal(a.status,200);assert.equal(a.data.signature,'%PDF-');
const row=JSON.parse(sql(`begin read only;select jsonb_build_object('version',version,'renderer',renderer,'hashMatches',sha256=${sqlLiteral(a.data.sha256)}) from public.document_pdf_renders where document_id=${sqlLiteral(id)} and version=1 and renderer=4;rollback;`));
assert.equal(row.hashMatches,true);
const b=await http('admin','/api/documents/'+id+'/pdf?version=1',{binary:true});assert.equal(b.status,200);assert.equal(a.data.sha256,b.data.sha256);
results.push({id:'B47-01',contract:'Authorized versioned PDF returned;stored file hash matches HTTP bytes;repeat reuses bytes',first:a.status,repeat:b.status,bytes:a.data.bytes,version:row.version,renderer:row.renderer,fileHashMatches:true,sameBytes:true,noStore:a.headers['cache-control'],limits:'Real local storage;no visual review or signature certification'});
const absent=await http('admin','/api/documents/'+id+'/pdf?version=999999',{binary:true});assert.equal(absent.status,404);
results.push({id:'B47-02',contract:'Missing version is not silently substituted with current version',status:absent.status,code:absent.data.code});
await select('professional',state.patients[1]);const denied=await http('professional','/api/documents/'+id+'/pdf?version=1',{binary:true});assert([403,404,409].includes(denied.status));
results.push({id:'B47-03',contract:'Existing cached private PDF does not bypass selected-patient authority',status:denied.status,code:denied.data.code});
const legacy=await http('admin','/api/documents/'+id+'/pdf?version=1&renderer=legacy',{binary:true});assert.equal(legacy.status,404);
results.push({id:'B47-04',contract:'Missing original renderer does not regenerate or overwrite historical original',status:legacy.status,code:legacy.data.code});
record('b47-pdf-results.json',{recordedAt:new Date().toISOString(),category:'HTTP_REAL_AUTH_STORAGE_AND_HASH_READBACK',results});console.log(JSON.stringify({scenarios:results.length,pdfBytesHashVerified:true}));
