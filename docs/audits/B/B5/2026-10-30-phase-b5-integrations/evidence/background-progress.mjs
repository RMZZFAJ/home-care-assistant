/* READ ONLY targeted reconciliation of the two changed original row hashes.
 * Backup contents and document/account IDs remain in memory; no restore. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {getTestEnvironment,sql,sqlLiteral as lit,testContainer} from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const load=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const original=load('original-row-hashes.json'),baseline=load('baseline.json'),proof=load('backup-proof.json');
const dir=join(process.env.LOCALAPPDATA,'home-care-assistant','backups');
const name=readdirSync(dir).filter(x=>x.endsWith('.dump.json')).find(x=>JSON.parse(readFileSync(join(dir,x),'utf8')).sha256===proof.sha256);assert(name);
const archive=readFileSync(join(dir,name.slice(0,-5)));assert.equal(createHash('sha256').update(archive).digest('hex'),proof.sha256);
const r=spawnSync('docker',['exec','-i',testContainer,'sh','-c','archive=$(mktemp); cat > "$archive" && pg_restore --data-only --schema=public --table=operational_documents --table=requisition_lifecycle --file=- "$archive"; result=$?; rm -f -- "$archive"; exit "$result"'],{input:archive,maxBuffer:16000000,windowsHide:true});assert.equal(r.status,0);
const text=r.stdout.toString();
const decode=table=>{
 const match=text.match(new RegExp(`COPY public\\.${table} \\(([^)]+)\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\r?\\n\\\\\\.`));assert(match,'Backup table section absent');const cols=match[1].split(',').map(x=>x.trim());
 return match[2].split(/\r?\n/).filter(Boolean).map(line=>Object.fromEntries(line.split('\t').map((v,i)=>[cols[i],v==='\\N'?null:v.replace(/\\([\\tnr])/g,(_,c)=>({'\\':'\\',t:'\t',n:'\n',r:'\r'}[c]))])));
};
const oldDocs=decode('operational_documents'),oldLife=decode('requisition_lifecycle');
assert(original.operational_documents.every(x=>/^[a-f0-9]{32}$/.test(x)));
const candidates=JSON.parse(sql(`begin read only;select coalesce(jsonb_agg(to_jsonb(d)),'[]') from public.operational_documents d where not(md5(to_jsonb(d)::text)=any(array[${original.operational_documents.map(lit).join(',')}]));rollback;`));assert.equal(candidates.length,1);
const results=[];
for(const current of candidates){
 const old=oldDocs.find(x=>x.id===current.id);assert(old,'Original document ID missing from backup');
 const life=JSON.parse(sql(`begin read only;select to_jsonb(l) from public.requisition_lifecycle l where requisition_id=${lit(current.id)};rollback;`));
 const prior=oldLife.find(x=>x.requisition_id===current.id);assert(prior);
 const normalize=(value,key,sample)=>value===null?null:typeof sample==='object'?Array.isArray(sample)&&key==='eligible_users'?Array.isArray(value)?value:String(value).slice(1,-1).split(',').filter(Boolean):typeof value==='string'?JSON.parse(value):value:typeof sample==='boolean'?value===true||value==='t':typeof sample==='number'?Number(value):key.endsWith('_at')?new Date(value).toISOString():value;
 const docFields=['id','care_recipient_id','type','status','created_by','recipient_id','created_at','code','protocol','number','idempotency_key','payload','workflow_data'];
 const lifeFields=['requisition_id','care_recipient_id','policy','eligible_users','science_satisfied_at','completed_at','archived_at','manual_archive_required','archive_reason'];
 const same=(a,b,fields)=>fields.every(k=>isDeepStrictEqual(normalize(a[k],k,b[k]),normalize(b[k],k,b[k])));
 assert(same(old,current,docFields),'Stable original document fields changed');assert(same(prior,life,lifeFields),'Stable lifecycle fields changed');
 const events=JSON.parse(sql(`begin read only;select jsonb_agg(jsonb_build_object('version',e.version,'action',e.action,'systemActor',e.actor_id is null,'createdAt',e.created_at,'previousHash',e.body->>'previousHash','contentHash',e.content_hash,'hashValid',e.content_hash=encode(extensions.digest(e.body::text,'sha256'),'hex'),'authorityMode',e.body->'authority'->>'mode') order by e.version) from public.document_events e where e.document_id=${lit(current.id)} and e.version>${Number(old.version)};rollback;`));
 assert.equal(events.length,1);assert(events.every(e=>e.action==='req.reminder'&&e.systemActor&&e.hashValid&&e.authorityMode==='system'&&e.createdAt>=baseline.recordedAt));assert.equal(events[0].previousHash,old.content_hash);assert.equal(current.content_hash,events.at(-1).contentHash);assert.equal(current.version,Number(old.version)+1);assert.equal(life.reminders,Number(prior.reminders)+1);
 const repeatHours=Number(life.policy.reminderRepeatHours??24);assert.equal(new Date(life.next_reminder_at)-new Date(events[0].createdAt),repeatHours*3600000);
 results.push({documentIdSha256:createHash('sha256').update(current.id).digest('hex'),stableDocumentFieldsPreserved:docFields,stableLifecycleFieldsPreserved:lifeFields,versionIncrement:1,reminderIncrement:1,newActions:['req.reminder'],systemActor:true,authorityMode:'system',hashChainValid:true,nextReminderMatchesPolicy:true,classification:'Progress consistent with pre-existing minute cron; no auditor probe writes original IDs. No original row deleted or restored.'});
}
const report={recordedAt:new Date().toISOString(),method:'Targeted read-only current state plus verified backup decoded in memory; no data restored and no provider called',results,limits:'Only the original-hash differences at preservation snapshot reconciled. Login timestamps excluded from Auth comparison. Cron remains active.'};writeFileSync(new URL('background-progress-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log({reconciledOriginalDocuments:results.length,systemReminders:results.length,hashChainValid:true});
