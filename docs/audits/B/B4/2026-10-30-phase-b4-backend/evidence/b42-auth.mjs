/* LOCAL HTTP/Auth. New B4 fixtures only. No provider calls or reset. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initialize,state,actor,http,select,record } from './http-local.mjs';
await initialize();
const results=[];
const note=(id,expected,observed,limits='Local HTTP and official Auth; no generalized RLS certification')=>results.push({id,expected,observed,limits});
for(const [i,path] of ['/api/context','/api/sync','/api/profile','/api/units','/api/admin?section=profiles','/api/dashboard?careRecipientId='+state.patients[0],'/api/documents/'+randomUUID(),'/api/attachments?careRecipientId='+state.patients[0]+'&documentId='+randomUUID()].entries()){
 const r=await http(null,path);assert.equal(r.status,401);assert.equal(r.data.code,'SESSION_EXPIRED');
 note('B42-'+String(i+1).padStart(2,'0'),'No session denied before private data',{path,status:r.status,code:r.data.code,noStore:r.headers['cache-control'],correlation:Boolean(r.headers['x-correlation-id'])});
}
await select('professional');
let r=await http('professional','/api/catalog?careRecipientId='+state.patients[0]);assert.equal(r.status,200);assert(r.data.data.length>=2);
note('B42-09','Legitimate selected patient is readable',{status:r.status,rows:r.data.data.length});
r=await http('professional','/api/catalog?careRecipientId='+state.patients[1]);assert([403,404,409].includes(r.status));
note('B42-10','Membership elsewhere does not override selected context',{status:r.status,code:r.data.code});
await select('professional',state.patients[1]);
r=await http('professional','/api/catalog?careRecipientId='+state.patients[1]);assert.equal(r.status,200);
note('B42-11','Explicit switch to real second membership succeeds',{status:r.status,rows:r.data.data.length});
r=await http('professional','/api/admin?section=profiles');assert.equal(r.status,403);
note('B42-12','Professional cannot list platform identities',{status:r.status,code:r.data.code});
r=await http('professional','/api/context',{method:'POST',body:{careRecipientId:randomUUID()}});assert.equal(r.status,403);
note('B42-13','Random patient ID grants no context',{status:r.status,code:r.data.code});
r=await http('outsider','/api/catalog?careRecipientId='+state.patients[0]);assert([403,404,409].includes(r.status));
note('B42-14','Authenticated identity without membership cannot read patient',{status:r.status,code:r.data.code});
const outsider=await actor('outsider'),cookie=[...outsider.jar].map(([k,v])=>k+'='+v).join('; ');
const before=await http('outsider','/api/profile');assert.equal(before.status,200);
const signedOut=await outsider.client.auth.signOut({scope:'local'});assert(!signedOut.error);
r=await http(null,'/api/profile',{headers:{cookie}});assert.equal(r.status,401);
note('B42-15','API rejects replay of cookie from ended Auth session',{before:before.status,after:r.status,code:r.data.code},'Captured cookie used only in memory. Does not retest direct profile/avatar bypass B3-021 or revoke-in-flight B3-020.');
record('b42-auth-results.json',{recordedAt:new Date().toISOString(),category:'HTTP_REAL_AUTH',results});
console.log(JSON.stringify({scenarios:results.length,status:'completed',externalSending:false}));
