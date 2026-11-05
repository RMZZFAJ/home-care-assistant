/* LOCAL bounded volume: minimum records to cross the actual 50-change cutoff. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { state,actor,rpc,http,select,record } from './http-local.mjs';
import { sql,sqlLiteral } from '../../../../scripts/test-environment.mjs';
await select('global',null);await select('admin');const patient=state.patients[0];
const before=JSON.parse(sql(`begin read only;select jsonb_build_object('count',count(*),'oldest',(array_agg(id order by created_at,id))[1]) from public.access_change_requests where care_recipient_id=${sqlLiteral(patient)};rollback;`));
const settings=await http('admin','/api/patient-settings?careRecipientId='+patient);assert.equal(settings.status,200);
const {client}=await actor('global');const added=Math.max(0,51-Number(before.count));
assert(added<=51,'Volume guard');
for(let i=0;i<added;i++)await rpc(client,'configure_patient_access',{p_patient:patient,p_kind:'settings',p_change:{patientShortName:'Fila fictícia B4 '+i},p_key:randomUUID(),p_version:settings.data.data.version});
const local=await http('admin','/api/patient-settings?careRecipientId='+patient);
const global=await http('global','/api/patient-settings?careRecipientId='+patient);
assert.equal(local.status,200);assert.equal(global.status,200);assert.equal(local.data.changes.length,50);assert.equal(global.data.changes.length,50);
assert(!local.data.changes.some(c=>c.id===before.oldest));assert(!global.data.changes.some(c=>c.id===before.oldest));
const second=await http('admin','/api/patient-settings?careRecipientId='+patient+'&page=2&requestId='+before.oldest);
assert.equal(second.data.changes.length,50);assert.deepEqual(second.data.changes.map(c=>c.id),local.data.changes.map(c=>c.id));
const persisted=JSON.parse(sql(`begin read only;select jsonb_build_object('count',(select count(*) from public.access_change_requests where care_recipient_id=${sqlLiteral(patient)}),'oldestStatus',(select status from public.access_change_requests where id=${sqlLiteral(before.oldest)})) ;rollback;`));assert.equal(Number(persisted.count),51);assert.equal(persisted.oldestStatus,'pending');
const results=[{id:'B45-01',contract:'An old pending administrative proposal remains discoverable',added,totalPersisted:persisted.count,oldestStatus:persisted.oldestStatus,localRows:local.data.changes.length,globalRows:global.data.changes.length,oldestVisible:false,pageOrIdFilterIgnored:true,responseHasPagination: ['total','page','pageSize','nextCursor'].some(k=>k in local.data),counterproof:'All records remain authorized/persisted;known request ID can still be decided;most recent 50 accessible',limits:'51 synthetic changes,not production volume;created by authorized RPC to avoid redundant HTTP bootstrap'}];
for(const [id,path,expected] of [
 ['B45-02','/api/documents?careRecipientId='+patient+'&page=1&pageSize=1',200],
 ['B45-03','/api/documents?careRecipientId='+patient+'&search='+state.objects.requisition,200],
 ['B45-04','/api/requisitions?careRecipientId='+patient+'&from=2026-02-30',400],
 ['B45-05','/api/schedules?careRecipientId='+patient+'&from=2026-10-01&until=2026-12-01',400],
 ['B45-06','/api/documents?careRecipientId='+patient+'&type=COM&search=NO-MATCH-B4',200],
]){
 const r=await http('admin',path);assert.equal(r.status,expected);
 results.push({id,path,status:r.status,code:r.data?.code??null,rows:Array.isArray(r.data?.data)?r.data.data.length:null,total:r.data?.total??null,noStore:r.headers['cache-control'],limits:'Local selected administrator;read only. HTTP success is not an assertion of every result payload field.'});
}
record('b45-read-results.json',{recordedAt:new Date().toISOString(),category:'HTTP_REAL_AUTH_AND_SCOPED_READBACK',results});console.log(JSON.stringify({scenarios:results.length,hiddenPendingProposalConfirmed:true,syntheticChangesAdded:added}));
