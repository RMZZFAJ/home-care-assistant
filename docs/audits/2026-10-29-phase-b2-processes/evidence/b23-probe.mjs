import { initialize, state, save, actor, rpc, createDoc, command, docState, countStock, recorder, rejected, assert, randomUUID, sql, sqlLiteral } from './local-harness.mjs';
await initialize();
const record=recorder('B2.3'),admin=await actor('admin'),family=await actor('family'),pro=await actor('professional'),replacement=await actor('replacement');
const p=state.products[0],req=state.objects.reqSupply,repeat=state.objects.reqRepeated;
const payload=(product,quantity,recipient=state.actors.professional.id)=>({source:'FAMILY',destination:'CARE_TEAM',recipientId:recipient,lines:[{productId:product,quantity}]});
let partial;
await record.scenario('B23-01','Expedir quatro unidades para duas REQs da mesma necessidade não duplica crédito físico',async()=>{
 const before=countStock(p),body=payload(p,'4');body.lines[0].requisitionItemIds=[req.lines[0].id,repeat.lines[0].id];body.lines[0].metadata={sharedNeedReason:'Mesma necessidade fictícia revisada em duas requisições'};
 partial=await createDoc(family,'ENT',body);const after=countStock(p);
 assert.equal(Number(after.FAMILY),Number(before.FAMILY)-4);assert.equal(Number(after.TRANSIT),Number(before.TRANSIT)+4);
 state.objects.entPartial=partial.id;save();return{before,after,document:docState(partial.id),linkedRequests:2};
});
await record.scenario('B23-02','Somente o destinatário designado pode aceitar, mesmo com acesso ao paciente',async()=>{
 const before=countStock(p),wrong=await rejected(()=>command(replacement,partial.id,'receive',{divergences:[]}),/only designated recipient/);
 assert.equal(wrong.rejected,true);assert.deepEqual(countStock(p),before);return{wrong,before,after:countStock(p)};
});
await record.scenario('B23-03','Aceite parcial positivo credita dois, conserva dois em trânsito e recupera mesma tentativa',async()=>{
 const before=countStock(p),key=randomUUID(),version=docState(partial.id).version,body={divergences:[{lineId:partial.lines[0].id,acceptedQuantity:'2',problem:'Faltam duas unidades na conferência fictícia',notes:'Auditoria local'}]};
 await command(pro,partial.id,'receive',body,key,version);const after=countStock(p),first=docState(partial.id);
 await command(pro,partial.id,'receive',body,key,version);assert.deepEqual(countStock(p),after);assert.equal(docState(partial.id).events,first.events);
 assert.equal(Number(after.CARE_TEAM),Number(before.CARE_TEAM)+2);assert.equal(Number(after.TRANSIT),Number(before.TRANSIT)-2);
 const fulfillment=await rpc(pro,'requisition_fulfillment',{p_requisition:req.id});assert.equal(fulfillment.fulfilled,1);
 const lifecycle=JSON.parse(sql(`select jsonb_build_object('completed',completed_at is not null,'fulfillment',fulfillment_state) from public.requisition_lifecycle where requisition_id=${sqlLiteral(req.id)};`));assert.equal(lifecycle.completed,false);
 return{before,after,document:first,fulfillment,lifecycle,positiveLineAttendedButOperationalCompletionBlocked:true,retryNoDuplicate:true};
});
await record.scenario('B23-04','REQ com ENT vinculada não pode ser cancelada durante divergência',async()=>{
 const refused=await rejected(()=>rpc(admin,'transition_requisition_status',{p_requisition_id:req.id,p_to_status:'cancelled',p_reason:'Necessidade fictícia revista com entrega ainda divergente'}),/resolve linked deliveries/);assert.equal(refused.rejected,true);return{refused,delivery:docState(partial.id),stock:countStock(p)};
});
await record.scenario('B23-05','Conciliação returned/missing encerra divergência sem fingir conferência integral',async()=>{
 await command(admin,partial.id,'resolve',{lineId:partial.lines[0].id,quantity:'1',resolution:'returned',reason:'Uma unidade fictícia retornou fisicamente à origem'});
 const afterReturn=countStock(p);
 await command(pro,partial.id,'resolve',{lineId:partial.lines[0].id,quantity:'1',resolution:'missing',reason:'Uma unidade fictícia teve extravio confirmado na conciliação'});
 const final=docState(partial.id);assert.equal(final.status,'confirmed');assert.equal(final.lines[0].fullyChecked,false);assert.equal(Number(final.lines[0].accepted),2);assert.equal(Number(final.lines[0].reconciled),2);assert.equal(Number(countStock(p).TRANSIT),0);
 const otherFulfillment=await rpc(pro,'requisition_fulfillment',{p_requisition:repeat.id});assert.equal(otherFulfillment.fulfilled,1);
 const lifecycle=JSON.parse(sql(`select jsonb_build_object('completed',completed_at is not null,'manualArchive',manual_archive_required) from public.requisition_lifecycle where requisition_id=${sqlLiteral(req.id)};`));assert.equal(lifecycle.completed,true);
 return{afterReturn,afterLoss:countStock(p),final,secondRequest:otherFulfillment,lifecycle,physicalAcceptedAcrossSharedNeed:'2, not 4'};
});
await record.scenario('B23-06','Reatribuição antes do aceite invalida autoridade anterior; cancelar devolve trânsito',async()=>{
 const product=state.products[2],before=countStock(product),d=await createDoc(family,'ENT',payload(product,'1'));
 await command(admin,d.id,'reassign',{recipientId:state.actors.replacement.id,reason:'Substituição fictícia antes da primeira conferência'});
 const old=await rejected(()=>command(pro,d.id,'receive',{divergences:[]}),/only designated recipient/);assert.equal(old.rejected,true);
 await command(admin,d.id,'cancel',{reason:'Transferência fictícia dispensada antes de recebimento'});
 const after=countStock(product);assert.equal(Number(after.FAMILY),Number(before.FAMILY));assert.equal(Number(after.TRANSIT),Number(before.TRANSIT));
 return{old,final:docState(d.id),before,after};
});
await record.scenario('B23-07','Cancelamento posterior ao aceite sem consumo exige consentimento e devolução real',async()=>{
 const product=state.products[2],before=countStock(product),d=await createDoc(family,'ENT',payload(product,'1'));
 await command(pro,d.id,'receive',{divergences:[]});await command(admin,d.id,'cancel',{reason:'Cancelamento fictício com retorno físico integral disponível'});
 assert.equal(docState(d.id).status,'cancellation_pending');
 const wrong=await rejected(()=>command(replacement,d.id,'consent_cancel',{reason:'Pessoa incorreta não pode consentir',lines:[{lineId:d.lines[0].id,returnQuantity:'1',consumedQuantity:'0'}]}),/original recipient consent/);assert.equal(wrong.rejected,true);
 await command(pro,d.id,'consent_cancel',{reason:'Destinatário confirma devolução física fictícia integral',lines:[{lineId:d.lines[0].id,returnQuantity:'1',consumedQuantity:'0'}]});
 const after=countStock(product);assert.equal(Number(after.FAMILY),Number(before.FAMILY));assert.equal(Number(after.CARE_TEAM),Number(before.CARE_TEAM));assert.equal(docState(d.id).status,'cancelled');
 return{before,after,final:docState(d.id),wrong,originalAcceptedQuantityPreserved:true};
});
let consumedDelivery;
await record.scenario('B23-08','Solicitação de cancelamento não oferece recusa/retirada formal nem fila específica de consentimento',async()=>{
 const product=state.products[1];consumedDelivery=await createDoc(family,'ENT',payload(product,'2'));
 await command(pro,consumedDelivery.id,'receive',{divergences:[]});await command(admin,consumedDelivery.id,'cancel',{reason:'Solicitação fictícia posteriormente contestada pelo recebedor'});
 const refusal=await rejected(()=>command(pro,consumedDelivery.id,'reject_cancel',{reason:'Destinatário fictício discorda do cancelamento'}),/invalid operation/);assert.equal(refusal.rejected,true);
 const pending=await pro.from('operational_documents').select('id,status').eq('care_recipient_id',state.patient).eq('recipient_id',state.actors.professional.id).eq('type','ENT').eq('status','pending_receipt');assert.ifError(pending.error);
 const all=await pro.from('operational_documents').select('id,status').eq('id',consumedDelivery.id);assert.ifError(all.error);
 assert.equal(pending.data.some(row=>row.id===consumedDelivery.id),false);assert.equal(all.data[0].status,'cancellation_pending');
 state.objects.entCancelPending=consumedDelivery.id;save();
 return{refusal,persisted:docState(consumedDelivery.id),defaultPendingInboxContainsTarget:false,allAuthorizedQueryContainsTarget:true,source:'delivery-inbox.tsx options; /api/deliveries status allowlist; dashboard pending_receipt queries',limits:'RPC/query plus static consumer; no browser task rendering in this scenario'};
});
await record.scenario('B23-09','DB-001 reexecutado: consumo confirmado impede conciliação por42702 e não altera ledger',async()=>{
 const product=state.products[1],report=await rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'consumption',p_location:'CARE_TEAM',p_text:'Uso extraordinário fictício de uma unidade após recebimento',p_lines:[{productId:product,quantity:'1'}],p_key:randomUUID()});
 await rpc(admin,'confirm_extraordinary_consumption',{p_id:report,p_accept:true});
 const before=countStock(product),documentBefore=docState(consumedDelivery.id);
 const result=await rejected(()=>command(pro,consumedDelivery.id,'consent_cancel',{reason:'Uma devolvida e uma consumida de fato neste cenário fictício',lines:[{lineId:consumedDelivery.lines[0].id,returnQuantity:'1',consumedQuantity:'1'}]}));
 assert.equal(result.rejected,true);assert.equal(result.sqlstate,'42702');assert.deepEqual(countStock(product),before);assert.deepEqual(docState(consumedDelivery.id),documentBefore);
 return{result,before,after:countStock(product),documentBefore,documentAfter:docState(consumedDelivery.id),consumptionReport:report,noArtificialWorkaround:true};
});
await record.scenario('B23-10','Retorno CARE_TEAM→FAMILY usa ENT distinta e aceite familiar',async()=>{
 const before=countStock(p),d=await createDoc(admin,'ENT',{source:'CARE_TEAM',destination:'FAMILY',recipientId:state.actors.family.id,lines:[{productId:p,quantity:'1'}]});
 await command(family,d.id,'receive',{divergences:[]});const after=countStock(p);
 assert.equal(Number(after.CARE_TEAM),Number(before.CARE_TEAM)-1);assert.equal(Number(after.FAMILY),Number(before.FAMILY)+1);assert.equal(Number(after.TRANSIT),Number(before.TRANSIT));
 return{before,after,document:docState(d.id),originalDeliveryNotRewritten:true};
});
await record.scenario('B23-11','Entrega complementar resolve received e stale version não duplica aceites',async()=>{
 const product=state.products[2],d=await createDoc(family,'ENT',payload(product,'2'));
 await command(pro,d.id,'receive',{divergences:[{lineId:d.lines[0].id,acceptedQuantity:'1',problem:'Uma unidade fictícia chegará depois'}]});
 const version=docState(d.id).version;
 await command(pro,d.id,'resolve',{lineId:d.lines[0].id,quantity:'1',resolution:'received',reason:'Complemento físico fictício chegou e foi conferido'});
 const before=countStock(product),stale=await rejected(()=>command(pro,d.id,'resolve',{lineId:d.lines[0].id,quantity:'1',resolution:'received',reason:'Tela antiga tentou repetir complemento'},randomUUID(),version),/stale document version/);
 assert.equal(stale.rejected,true);assert.deepEqual(countStock(product),before);assert.equal(docState(d.id).lines[0].fullyChecked,true);
 return{stale,final:docState(d.id),stock:before};
});
record.finish();
