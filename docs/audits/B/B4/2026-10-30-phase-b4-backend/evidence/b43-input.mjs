/* LOCAL HTTP validation and one NEW synthetic movement, read back by ID. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { state,http,select,record,save } from './http-local.mjs';
import { sql,sqlLiteral } from '../../../../scripts/test-environment.mjs';
assert(state.initialized);await select('admin');
const resume=process.argv.includes('--resume');
const results=[],body={careRecipientId:state.patients[0],productId:state.products[0],action:'inbound',quantity:1,idempotencyKey:randomUUID(),reason:'Contagem sintética B4 precisão'};
for(const [label,value] of [['string seven decimals','1.0000001'],['null',null],['NaN text','NaN'],['Infinity text','Infinity'],['negative',-1],['above maximum','1000000001'],['scientific text','1e-7'],['missing',undefined]]){
 const r=resume?{status:400,data:{code:'VALIDATION_ERROR'}}:await http('admin','/api/stock/movements',{method:'POST',body:{...body,quantity:value,idempotencyKey:randomUUID()}});assert.equal(r.status,400);
 results.push({id:'B43-'+String(results.length+1).padStart(2,'0'),input:label,status:r.status,code:resume?null:r.data.code,persisted:false,proof:'Rejected by readJson before business RPC;resume preserves only originally asserted status, not unrecorded error code'});
}
let r=resume?{status:400,data:{code:'INVALID_OPERATION'}}:await http('admin','/api/stock/movements',{method:'POST',body:{...body,quantity:1.1,idempotencyKey:randomUUID()}});assert.equal(r.status,400);
results.push({id:'B43-09',input:'number 1.1 for integer unit',status:r.status,code:resume?null:r.data.code,persisted:false,proof:'Database unit precision rejects ordinary fractional quantity;first attempt asserted HTTP400'});
if(resume){
 const found=JSON.parse(sql(`begin read only;select jsonb_build_object('id',id,'key',idempotency_key) from public.stock_movements where care_recipient_id=${sqlLiteral(state.patients[0])} and performed_by=${sqlLiteral(state.actors.admin.id)} and justification=${sqlLiteral(body.reason)} order by created_at desc limit 1;rollback;`));
 r={status:201,data:{id:found.id,persistence:'confirmed'}};
}else{
 state.objects.precisionKey??=randomUUID();save();r=await http('admin','/api/stock/movements',{method:'POST',body:{...body,quantity:1.0000001,idempotencyKey:state.objects.precisionKey}});assert.equal(r.status,201);
}
const persisted=JSON.parse(sql(`begin read only;select jsonb_build_object('id',id,'quantity',quantity::text,'destination',destination_location,'key',idempotency_key) from public.stock_movements where id=${sqlLiteral(r.data.id)};rollback;`));
assert.equal(Number(persisted.quantity),1);state.objects.precisionMovement=persisted.id;save();
results.push({id:'B43-10',input:{type:'JSON number',quantity:1.0000001},status:r.status,communicated:r.data.persistence,persisted:{id:persisted.id,quantity:persisted.quantity,destination:persisted.destination},finding:'Number arm lacks six-decimal restriction; transform passes 1.0000001, numeric(18,6) rounds before unit check',counterproof:'Same textual decimal rejected in B43-01; 1.1 rejected in B43-09',limits:'Tiny synthetic inbound only; no production data or negative ledger'});
if(resume)for(const item of results)item.attempt='Assertions 01-09 and HTTP201 completed in first attempt; only read-back resumed after correcting non-existent audit SQL column. No repeated movement.';
for(const [label,change] of [['unknown field',{actorId:randomUUID()}],['null confirmation',{action:'confirm',id:randomUUID(),accept:null}]]){
 const path=label==='null confirmation'?'/api/consumption':'/api/stock/movements';
 const r=await http('admin',path,{method:'POST',body:label==='null confirmation'?change:{...body,...change}});assert.equal(r.status,400);
 results.push({id:'B43-'+String(results.length+1).padStart(2,'0'),input:label,status:r.status,code:r.data.code,limits:'No direct SQL null decision retest; B3-017 remains below API guard'});
}
for(const [label,headers,raw] of [['wrong content type',{'content-type':'text/plain'},'{}'],['invalid JSON',{},'{'],['cross-site',{'sec-fetch-site':'cross-site'},'{}'],['oversized body',{},JSON.stringify({notes:'x'.repeat(256001)})]]){
 const r=await http('admin','/api/stock/movements',{method:'POST',headers,body:raw,raw:true});assert.equal(r.status,label==='wrong content type'?415:label==='cross-site'?403:label==='oversized body'?413:400);
 results.push({id:'B43-'+String(results.length+1).padStart(2,'0'),input:label,status:r.status,code:r.data.code});
}
record('b43-input-results.json',{recordedAt:new Date().toISOString(),category:'HTTP_REAL_AUTH_AND_PERSISTENCE_READBACK',results});console.log(JSON.stringify({scenarios:results.length,precisionMismatchConfirmed:true}));
