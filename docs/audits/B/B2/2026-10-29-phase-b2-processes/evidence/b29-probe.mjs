// Local, new synthetic facts only. This probe extends cross-process coverage.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {initialize,state,actor,rpc,createDoc,command,docState,countStock,recorder,assert,randomUUID,sql,sqlLiteral} from './local-harness.mjs';
import {app,safeError} from './http-harness.mjs';
await initialize();
const record=recorder('B2.9',{resume:true}),admin=await actor('admin'),pro=await actor('professional'),family=await actor('family');
const earlier=JSON.parse(readFileSync(new URL('b28-results.json',import.meta.url)));
const req=state.objects.continuityRequest,ent=earlier.scenarios.find(s=>s.id==='B28-03').observed.deliveryId;
const hash=b=>createHash('sha256').update(b).digest('hex');
await record.scenario('B29-01','Cancelar ENT reabre REQ arquivada e conserva motivo anterior e PDF antigo',async()=>{
 const liveBefore=await rpc(admin,'requisition_progress',{p_id:req});
 const before=liveBefore.archivedAt?liveBefore:earlier.scenarios.find(s=>s.id==='B28-04').observed;
 assert.ok(before.archivedAt);
 if(docState(ent).status==='confirmed')await command(admin,ent,'cancel',{reason:'Fato fictício posterior ao arquivo exige devolver integralmente o material recebido'});
 else assert.equal(docState(ent).status,'cancellation_pending');
 const reopened=await rpc(admin,'requisition_progress',{p_id:req});assert.equal(reopened.archivedAt,null);assert.equal(reopened.completedAt,null);
 const event=JSON.parse(sql(`select body->'event' from public.document_events where document_id=${sqlLiteral(req)} and action='req.reopened' order by version desc limit 1;`));assert.equal(event.previousArchiveReason,before.archiveReason);assert.equal(event.operationalIssue,true);
 const beforeReturn=countStock(state.products[0]),line=docState(ent).lines[0];
 await command(pro,ent,'consent_cancel',{reason:'Devolução física fictícia de uma unidade ainda não consumida neste cenário',lines:[{lineId:line.id,returnQuantity:'1',consumedQuantity:'0'}]});
 const afterReturn=countStock(state.products[0]);assert.equal(Number(afterReturn.FAMILY),Number(beforeReturn.FAMILY)+1);assert.equal(Number(afterReturn.CARE_TEAM),Number(beforeReturn.CARE_TEAM)-1);
 const final=await rpc(admin,'requisition_progress',{p_id:req}),fulfillment=await rpc(pro,'requisition_fulfillment',{p_requisition:req});assert.equal(fulfillment.fulfilled,0);assert.equal(final.completedAt,null);
 const old=await app('professional',`/api/documents/${req}/pdf?version=5`);assert.equal(old.status,200);assert.equal(hash(Buffer.from(await old.arrayBuffer())),earlier.scenarios.find(s=>s.id==='B28-05').observed.currentHash);
 return{before:{archivedAt:before.archivedAt,archiveReason:before.archiveReason},reopened:{completedAt:reopened.completedAt,archivedAt:reopened.archivedAt,manualArchiveRequired:reopened.manualArchiveRequired},reopeningEvent:event,beforeReturn,afterReturn,delivery:docState(ent),final:{fulfilled:fulfillment.fulfilled,completedAt:final.completedAt},historicalPdfHashPreserved:true};
});
await record.scenario('B29-02','Duas pessoas aprovam a mesma COM com tela antiga;somente uma decisão persiste',async()=>{
 const stock=countStock(state.products[3]),d=await createDoc(family,'COM',{origin:'purchase',lines:[{productId:state.products[3],quantity:'2'}]}),version=d.version;assert.equal(d.status,'pending_approval');
 const send=name=>app(name,`/api/documents/${d.id}`,{method:'POST',body:{action:'approve',expectedVersion:version,idempotencyKey:randomUUID(),body:{lines:[{lineId:d.lines[0].id,quantity:'2'}]}}});
 const responses=await Promise.all([send('admin'),send('admin2')]);const status=responses.map(r=>r.status).sort();assert.deepEqual(status,[200,409]);
 const outcomes=[];for(let i=0;i<responses.length;i++)outcomes.push({actor:['admin','admin2'][i],...(responses[i].status===200?{status:200}:await safeError(responses[i]))});
 const after=docState(d.id);assert.equal(after.version,version+1);assert.equal(after.events,2);assert.deepEqual(countStock(state.products[3]),stock);
 return{documentId:d.id,readVersion:version,outcomes,document:after,stockUnchanged:true,method:'Two independent concurrent HTTP requests, distinct officially authenticated identities and keys'};
});
await record.scenario('B29-03','Resposta de aceite descartada e repetição HTTP preservam único crédito;chave nova com versão antiga conflita',async()=>{
 const p=state.products[3],before=countStock(p);assert.ok(Number(before.FAMILY)>=1);
 const d=await createDoc(admin,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:p,quantity:'1'}]});
 const key=randomUUID(),body={action:'receive',expectedVersion:d.version,idempotencyKey:key,body:{divergences:[]}},path=`/api/documents/${d.id}`;
 const discarded=await app('professional',path,{method:'POST',body});assert.equal(discarded.status,200);await discarded.arrayBuffer();
 const first=docState(d.id),after=countStock(p);
 const retries=await Promise.all([app('professional',path,{method:'POST',body}),app('professional',path,{method:'POST',body})]);assert.deepEqual(retries.map(r=>r.status),[200,200]);for(const r of retries)await r.arrayBuffer();
 assert.deepEqual(docState(d.id),first);assert.deepEqual(countStock(p),after);assert.equal(Number(after.CARE_TEAM),Number(before.CARE_TEAM)+1);assert.equal(Number(after.TRANSIT),Number(before.TRANSIT));
 const stale=await app('professional',path,{method:'POST',body:{...body,idempotencyKey:randomUUID()}});assert.equal(stale.status,409);assert.deepEqual(countStock(p),after);
 return{delivery:d.id,before,after,concurrentRetryStatuses:[200,200],newKeyStale:await safeError(stale),eventsUnchangedOnRetry:true,method:'First successful response deliberately ignored, then independent HTTP retries;not actual network fault injection or offline durability'};
});
await record.scenario('B29-04','HTTP aceita correção familiar sem referência de compensação',async()=>{
 const p=state.objects.exactProduct;
 const existing=sql(`select id from public.stock_movements where care_recipient_id=${sqlLiteral(state.patient)} and product_id=${sqlLiteral(p)} and quantity=0.001 and reference_type='family_manual' and performed_by=${sqlLiteral(state.actors.admin.id)} and created_at>${sqlLiteral(record.result.startedAt)}::timestamptz order by created_at desc limit 1;`);
 let before=null,id=existing;
 if(!id){before=countStock(p);const response=await app('admin','/api/stock/movements',{method:'POST',body:{careRecipientId:state.patient,productId:p,quantity:'0.001',action:'correction_in',reason:'Experimento fictício autorizado de rastreabilidade sem referência original',idempotencyKey:randomUUID()}});assert.equal(response.status,201);id=(await response.json()).id;}
 const row=JSON.parse(sql(`select jsonb_build_object('id',id,'referenceType',reference_type,'referenceId',reference_id,'quantity',quantity::text) from public.stock_movements where id=${sqlLiteral(id)};`));assert.equal(row.referenceId,null);
 return{httpStatus:201,before,after:countStock(p),movement:row,readbackResumed:Boolean(existing),limits:existing?'Initial HTTP201 assertion passed before wrong read-back column;before snapshot was not persisted;movement not repeated':null,extends:'B2-005 API enforcement,not privilege escalation;no compensation used to bypass another defect'};
});
await record.scenario('B29-05','Decisão oposta de consumo por HTTP retorna200/null e conserva confirmação anterior',async()=>{
 const prior=JSON.parse(readFileSync(new URL('b25-results.json',import.meta.url))),id=prior.scenarios.find(s=>s.id==='B25-05').observed.reportId,before=countStock(state.products[2]);
 const response=await app('admin2','/api/consumption',{method:'POST',body:{action:'confirm',id,accept:false}});assert.equal(response.status,200);const result=await response.json();assert.equal(result.data,null);
 const status=sql(`select status from public.consumption_reports where id=${sqlLiteral(id)};`);assert.equal(status,'confirmed');assert.deepEqual(countStock(state.products[2]),before);
 return{reportId:id,requestedDecision:'reject',httpStatus:200,data:result.data,persistedStatus:status,noAdditionalMovement:true,extends:'B2-011: genuine API behavior rather than inferred HTTP status'};
});
await record.scenario('B29-06','Pendência antiga fica fora dos100 relatos apesar de contador e referência direta',async()=>{
 const oldest=await rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'shortage',p_location:'CARE_TEAM',p_text:'Pendência fictícia antiga B2.9 que precisa permanecer reencontrável',p_lines:[],p_key:randomUUID()});
 for(let n=0;n<100;n++)await rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'shortage',p_location:'CARE_TEAM',p_text:'Relato fictício posterior B2.9 '+n,p_lines:[],p_key:randomUUID()});
 const list=await app('admin',`/api/consumption?careRecipientId=${state.patient}&ref=${oldest}`);assert.equal(list.status,200);const data=(await list.json()).data;assert.equal(data.length,100);assert.equal(data.some(r=>r.id===oldest),false);
 const dashboard=await app('admin',`/api/dashboard?careRecipientId=${state.patient}`);assert.equal(dashboard.status,200);const counts=(await dashboard.json()).data;assert.ok(counts.consumptionPending>=101);
 const persisted=JSON.parse(sql(`select jsonb_build_object('status',status,'kind',kind,'lines',lines) from public.consumption_reports where id=${sqlLiteral(oldest)};`));assert.equal(persisted.status,'reported');
 return{oldestId:oldest,newReports:101,listCount:data.length,targetInReturnedList:false,dashboardConsumptionPending:counts.consumptionPending,persisted,knownFinding:'A BE-001 revalidated API/query;not deleted data or UI selector failure',method:'101 officially authenticated new shortage reports,no stock debit,no backdated changes to existing records'};
});
record.finish();
