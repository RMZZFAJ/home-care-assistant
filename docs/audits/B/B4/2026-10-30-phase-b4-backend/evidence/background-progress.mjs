/* READ ONLY archive decoding and SELECT. pg_restore writes SQL to stdout only,
 * never a database. Private row contents are parsed in memory and not exported. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTestEnvironment,sql,sqlLiteral,testContainer } from '../../../../scripts/test-environment.mjs';
if(process.versions.node!=='24.22.0')throw new Error('Node version');getTestEnvironment();
const proof=JSON.parse(readFileSync(new URL('backup-proof.json',import.meta.url),'utf8'));
const archive=readFileSync(join(process.env.LOCALAPPDATA,'home-care-assistant','backups','local-20261030T065205676Z.dump'));
assert.equal(createHash('sha256').update(archive).digest('hex'),proof.sha256);
const originalTable=table=>{
 assert(['operational_documents','requisition_lifecycle'].includes(table));
 const script='archive=$(mktemp); trap \'rm -f "$archive"\' EXIT; cat > "$archive"; pg_restore --data-only --schema=public --table='+table+' --file=- "$archive"';
 const text=execFileSync('docker',['exec','-i',testContainer,'sh','-c',script],{input:archive,maxBuffer:128*1024*1024,windowsHide:true}).toString('utf8');
 const match=text.match(new RegExp('COPY public\\.'+table+' \\(([^)]+)\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\r?\\n\\\\\\.'));
 if(process.argv.includes('--inspect')){console.log(JSON.stringify({table,bytes:text.length,copyHeaders:text.split(/\r?\n/).filter(l=>l.startsWith('COPY '))}));return [];}
 assert(match,'Archive COPY table');const columns=match[1].split(',').map(c=>c.trim());
 return match[2].split(/\r?\n/).map(row=>Object.fromEntries(row.split('\t').map((value,i)=>[columns[i],value==='\\N'?null:value])));
};
const originals=originalTable('operational_documents'),oldLife=originalTable('requisition_lifecycle');
if(process.argv.includes('--inspect'))process.exit(0);
const ids=originals.map(d=>sqlLiteral(d.id)).join(',');
const current=JSON.parse(sql(`begin read only;select jsonb_agg(x) from(select id,version,status,type,content_hash,care_recipient_id from public.operational_documents where id in(${ids}))x;rollback;`));
assert.equal(current.length,originals.length,'Original document missing');
const changed=[];
for(const before of originals){
 const after=current.find(d=>d.id===before.id);assert.equal(after.status,before.status);assert.equal(after.type,before.type);assert.equal(after.care_recipient_id,before.care_recipient_id);
 if(Number(before.version)===after.version){assert.equal(after.content_hash,before.content_hash);continue;}
 const events=JSON.parse(sql(`begin read only;select jsonb_agg(x order by version) from(select version,action,actor_id,content_hash,body->>'previousHash' previous_hash from public.document_events where document_id=${sqlLiteral(before.id)} and version>${Number(before.version)})x;rollback;`));
 let hash=before.content_hash,version=Number(before.version);for(const e of events){assert.equal(e.version,++version);assert.equal(e.action,'req.reminder');assert.equal(e.actor_id,null);assert.equal(e.previous_hash,hash);hash=e.content_hash;}
 assert.equal(hash,after.content_hash);assert.equal(version,after.version);
 changed.push({id:before.id,initialVersion:Number(before.version),finalVersion:after.version,addedEvents:events.length,actions:[...new Set(events.map(e=>e.action))],allActorsSystem:true,hashChainContinuous:true,statusUnchanged:true,patientUnchanged:true});
}
const lifeIds=oldLife.map(r=>sqlLiteral(r.requisition_id)).join(',');
const lifePresent=Number(sql(`begin read only;select count(*) from public.requisition_lifecycle where requisition_id in(${lifeIds});rollback;`));assert.equal(lifePresent,oldLife.length);
const result={recordedAt:new Date().toISOString(),archiveHashVerified:true,originalDocuments:originals.length,originalDocumentIdsMissing:0,originalLifecycle:oldLife.length,originalLifecycleIdsMissing:0,changedHeaders:changed,allAddedActionsSystemReminders:true,noOriginalDocumentStatusPatientOrTypeChanged:true,method:'Decode only two COPY tables from private backup in memory;compare IDs/versions/status/scope and event hash chain by read-only SELECT. No restore executed.',limits:'62-table multiset hash comparison is in preservation-results.json. This reconciliation explains the two changed tables;it does not certify an operational restore.'};
writeFileSync(new URL('background-progress-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,changedHeaders:{count:changed.length,totalAddedEvents:changed.reduce((n,r)=>n+r.addedEvents,0)}}));
