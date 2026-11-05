import {initialize,state,save,actor,addAuditActor,createAuditPatient,rpc,docState,countStock,recorder,rejected,assert,randomUUID,sql,sqlLiteral} from './local-harness.mjs';
await initialize();const record=recorder('B2.6'),patient=state.patient,admin=await actor('admin'),family=await actor('family'),supervisor=await actor('supervisor'),oldCounter=await actor('balance_counter'),replacement=await actor('replacement');
const s=(client,action,body,version=null,key=randomUUID(),p=patient)=>rpc(client,'schedule_command',{p_patient:p,p_action:action,p_body:body,p_version:version,p_key:key});
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()),offset=days=>new Date(Date.parse(today+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const shifts=series=>JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('id',id,'start',starts_at,'end',ends_at,'status',status,'version',version,'professional',professional_id) order by starts_at),'[]') from public.scheduled_shifts where care_recipient_id=${sqlLiteral(patient)} and series_id=${sqlLiteral(series)};`));
let worker,type,series,rows;
await record.scenario('B26-01','Série noturna12x36 proposta materializa intervalos e retry preserva identidade',async()=>{
 worker=await addAuditActor('schedule_worker','professional');type=await s(admin,'type',{name:'Noturno fictício B2',startsLocal:'19:00',durationMinutes:720});
 const key=randomUUID(),body={professionalId:worker.id,shiftTypeId:type.id,timezone:'America/Sao_Paulo',recurrence:'cycle',workHours:12,restHours:36,weekdays:[],anchorDate:offset(10),validUntil:offset(14),notes:'Programação noturna sintética'};
 series=await s(worker.client,'series',body,null,key);assert.equal(series.status,'proposed');assert.equal((await s(worker.client,'series',body,null,key)).id,series.id);
 const own=await rejected(()=>s(worker.client,'approve',{id:series.id},series.version));assert.equal(own.rejected,true);
 await s(admin,'approve',{id:series.id},series.version);rows=shifts(series.id);assert.equal(rows.length,3);assert.equal(Date.parse(rows[0].end)-Date.parse(rows[0].start),12*3600000);assert.equal(Date.parse(rows[1].start)-Date.parse(rows[0].start),48*3600000);
 return{seriesId:series.id,shifts:rows,retrySameSeries:true,ownApprovalRefused:own,timezone:'America/Sao_Paulo',presenceProven:false};
});
await record.scenario('B26-02','Sobreposição recusa transação inteira;plantão adjacente é permitido',async()=>{
 const before=Number(sql(`select count(*) from public.shift_series where care_recipient_id=${sqlLiteral(patient)};`));
 const overlap=await rejected(()=>s(admin,'series',{professionalId:worker.id,shiftTypeId:type.id,timezone:'America/Sao_Paulo',recurrence:'once',weekdays:[],anchorDate:offset(10),validUntil:offset(10),notes:'Conflito sintético deliberado'}),/schedule overlap/);assert.equal(overlap.sqlstate,'23P01');
 assert.equal(Number(sql(`select count(*) from public.shift_series where care_recipient_id=${sqlLiteral(patient)};`)),before);
 const adjacentType=await s(admin,'type',{name:'Diurno adjacente fictício B2',startsLocal:'07:00',durationMinutes:720});
 const adjacent=await s(admin,'series',{professionalId:worker.id,shiftTypeId:adjacentType.id,timezone:'America/Sao_Paulo',recurrence:'once',weekdays:[],anchorDate:offset(11),validUntil:offset(11),notes:'Inicia exatamente quando termina o noturno'});
 const adjacentRows=shifts(adjacent.id);assert.equal(Date.parse(adjacentRows[0].start),Date.parse(rows[0].end));return{overlap,noPartialSeriesOnRefusal:true,adjacent:adjacentRows};
});
await record.scenario('B26-03','Proposta pontual não muda agenda antes da decisão autorizada',async()=>{
 const target=rows[2],start=new Date(Date.parse(target.start)+3600000).toISOString(),end=new Date(Date.parse(target.end)+3600000).toISOString();
 const change=await s(worker.client,'propose_change',{id:target.id,startsAt:start,endsAt:end,reason:'Ajuste fictício de uma hora sem conflitar com outro plantão'},target.version);
 assert.equal(shifts(series.id).find(row=>row.id===target.id).start,target.start);
 await s(admin,'decide_change',{id:change.id,approve:true,reason:'Gestor fictício conferiu pessoa,horário e efeitos'});
 const after=shifts(series.id).find(row=>row.id===target.id);assert.equal(Date.parse(after.start),Date.parse(start));rows=shifts(series.id);
 return{changeId:change.id,before:target,after,decisionSummarySource:'UI currently omits concrete before/after (A UX-001/B1-UX-001);not rendered by this RPC scenario'};
});
await record.scenario('B26-04','Proposta antiga não reaplica versão superada,mas pode ser rejeitada explicitamente',async()=>{
 const target=rows[2],change=await s(worker.client,'propose_change',{id:target.id,reason:'Proposta fictícia anterior à alteração direta do gestor'},target.version);
 await s(admin,'change',{id:target.id,notes:'Atualização direta legítima da programação',reason:'Mudança de nota posterior à proposta'},target.version);
 const approval=await rejected(()=>s(admin,'decide_change',{id:change.id,approve:true,reason:'Tentativa de aplicar proposta obsoleta'}),/stale document/);assert.equal(approval.rejected,true);
 const rejection=await s(admin,'decide_change',{id:change.id,approve:false,reason:'Proposta substituída por atualização válida já aplicada'});assert.equal(rejection.status,'rejected');
 return{approval,rejectionStatus:rejection.status,currentShift:shifts(series.id).find(row=>row.id===target.id),oldVersionDidNotOverwrite:true};
});
await record.scenario('B26-05','Encerramento de série publicada conserva passado e cancela ocorrências após corte',async()=>{
 const current=JSON.parse(sql(`select to_jsonb(s) from public.shift_series s where id=${sqlLiteral(series.id)};`));
 const result=await s(admin,'end_series',{id:series.id,fromDate:offset(12),reason:'Encerramento fictício preserva primeiro plantão e corta futuros'},current.version);
 const final=shifts(series.id);assert.equal(final.filter(row=>row.status==='published').length,1);assert.equal(final.filter(row=>row.status==='cancelled').length,2);
 return{endedOn:result.ended_on,seriesStatus:result.status,final,historyPreserved:true};
});
await record.scenario('B26-06','DB-003 revalidado:aprovar proposta após end_series republica ocorrências além do corte',async()=>{
 const proposer=await actor('professional'),body={professionalId:state.actors.professional.id,shiftTypeId:type.id,timezone:'America/Sao_Paulo',recurrence:'cycle',workHours:12,restHours:36,weekdays:[],anchorDate:offset(20),validUntil:offset(24),notes:'Sequência sintética proposta,corte e aprovação posterior'};
 const proposed=await s(proposer,'series',body),ended=await s(admin,'end_series',{id:proposed.id,fromDate:offset(22),reason:'Gestor encerra a partir da data fictícia definida'},proposed.version),afterEnd=shifts(proposed.id);
 assert.equal(afterEnd.filter(row=>row.status==='cancelled').length,2);
 const approved=await s(admin,'approve',{id:proposed.id},ended.version),afterApproval=shifts(proposed.id);
 assert.equal(approved.ended_on,offset(22));assert.equal(afterApproval.filter(row=>row.status==='published').length,3);
 state.objects.republishedSeries=proposed.id;save();return{seriesId:proposed.id,cutoff:approved.ended_on,afterEnd,afterApproval,knownFinding:'A DB-003 now CONFIRMED_LOCAL;UI hides end action for proposed series but API/RPC accepts sequence',limits:'Not claiming this end action was clicked in current UI'};
});
await record.scenario('B26-07','Mudança do tipo afeta definições futuras,sem retimar ocorrências já gravadas',async()=>{
 const before=shifts(series.id);await s(admin,'type',{id:type.id,name:'Noturno fictício B2 renomeado',startsLocal:'18:00',durationMinutes:600,active:true},type.version);
 assert.deepEqual(shifts(series.id),before);return{intervalsUnchanged:true,typeDefinition:{startsLocal:'18:00',durationMinutes:600},existing:before,historyMeaning:'Nome atual do tipo é projetado na consulta;intervalos originais permanecem'};
});
await record.scenario('B26-08','Gestão de escala não desloca janela de BAL vigente',async()=>{
 const b=await rpc(admin,'balance_workspace',{p_patient:patient}),a=b.eligibility.assignment,target=b.targets.find(row=>row.id===a.shift_id);
 const refused=await rejected(()=>s(admin,'change',{id:target.id,startsAt:new Date(Date.parse(target.starts_at)+3600000).toISOString(),endsAt:new Date(Date.parse(target.ends_at)+3600000).toISOString(),reason:'Alteração de agenda não autoriza adiar obrigação BAL'},target.version),/family deferral/);assert.equal(refused.rejected,true);
 return{refused,assignmentBefore:a,assignmentAfter:(await rpc(admin,'balance_workspace',{p_patient:patient})).eligibility.assignment};
});
let transferred;
await record.scenario('B26-09','Substituir pessoa na mesma janela durante reconto invalida atribuição sem sucessor automático',async()=>{
 const before=await rpc(admin,'balance_workspace',{p_patient:patient}),a=before.eligibility.assignment,target=before.targets.find(row=>row.id===a.shift_id);
 await s(admin,'change',{id:target.id,professionalId:state.actors.replacement.id,reason:'Substituição fictícia no mesmo período de reconto pendente'},target.version);
 await rpc(admin,'balance_command',{p_patient:patient,p_action:'refresh',p_body:{},p_key:randomUUID(),p_version:null});
 const after=await rpc(admin,'balance_workspace',{p_patient:patient});assert.equal(after.assignments.find(row=>row.id===a.id).status,'invalidated');assert.equal(after.eligibility.assignment,null);
 const still=docState(state.objects.scheduledBalance);assert.equal(still.status,'submitted');
 transferred=after.targets.find(row=>row.id===target.id);
 return{beforeAssignment:a,afterAssignment:after.eligibility.assignment,oldAssignment:after.assignments.find(row=>row.id===a.id),substituteShift:transferred,document:still,recovery:'Revisor pode designar novo reconto no plantão substituído;não ocorreu transferência automática nesta modalidade counted/recount',limits:'Does not refute automatic same-window transfer in an OPEN cycle with draft,covered historically'};
});
await record.scenario('B26-10','Designação formal recupera reconto com novo contador e conserva autor original',async()=>{
 const id=state.objects.scheduledBalance,originalCreator=sql(`select created_by from public.operational_documents where id=${sqlLiteral(id)};`);
 await rpc(admin,'balance_command',{p_patient:patient,p_action:'assign_recount',p_body:{documentId:id,targetShiftId:transferred.id,reason:'Revisor fictício transfere reconto formal ao profissional substituto'},p_key:randomUUID(),p_version:docState(id).version});
 const b=await rpc(replacement,'balance_workspace',{p_patient:patient}),a=b.eligibility.assignment;assert.equal(a.professional_id,state.actors.replacement.id);
 const lines=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('productId',c.product_id,'quantity',case when c.product_id=${sqlLiteral(state.products[2])} then '0' else private.stock_quantity(c.care_recipient_id,c.product_id,'CARE_TEAM')::text end)) from public.care_recipient_products c where care_recipient_id=${sqlLiteral(patient)} and is_active;`));
 const payload={lines,balanceAssignment:{id:a.id,version:a.version,referenceRevision:b.referenceRevision},notes:'Substituto fictício efetua nova conferência física;autor original preservado'};
 const old=await rejected(()=>rpc(oldCounter,'revise_supply_document',{p_id:id,p_payload:payload,p_key:randomUUID(),p_version:docState(id).version,p_recount:true}));assert.equal(old.rejected,true);
 await rpc(replacement,'revise_supply_document',{p_id:id,p_payload:payload,p_key:randomUUID(),p_version:docState(id).version,p_recount:true});
 const d=await rpc(admin,'operational_document',{p_id:id});assert.equal(d.created_by,originalCreator);assert.equal(d.payload.balanceContext.professionalId,state.actors.replacement.id);
 return{oldActorRefusal:old,createdBy:d.created_by,actualCounter:d.payload.balanceContext.professionalId,documentVersion:d.version,events:d.events,originalAuthorPreserved:true};
});
await record.scenario('B26-11','Revisores distintos aplicam diferença BAL como ajuste,sem debitá-la como consumo',async()=>{
 const id=state.objects.scheduledBalance,product=state.products[2],before=countStock(product),args={p_patient:patient,p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date(Date.now()+60000).toISOString()},metricsBefore=await rpc(admin,'stock_consumption_metrics',args);
 for(const [client,group] of [[family,'family'],[supervisor,'supervisor']]) await rpc(client,'supply_document_command',{p_id:id,p_action:'approve',p_body:{group},p_key:randomUUID(),p_version:docState(id).version});
 const after=countStock(product),metricsAfter=await rpc(admin,'stock_consumption_metrics',args);assert.equal(Number(before.CARE_TEAM),1);assert.equal(Number(after.CARE_TEAM),0);assert.deepEqual(metricsAfter,metricsBefore);assert.equal(docState(id).status,'approved');
 return{before,after,document:docState(id),metricsBefore,metricsAfter,adjustmentReference:'bal,not consumption'};
});
await record.scenario('B26-12','Conflito entre pacientes informa só indisponibilidade e conserva isolamento',async()=>{
 const other=await createAuditPatient('segundo contexto de escala',[['schedule_worker','professional']]),otherAdmin=await actor('admin',other);
 const otherType=await s(otherAdmin,'type',{name:'Plantão fictício de outro paciente',startsLocal:'19:00',durationMinutes:720},null,randomUUID(),other);
 const conflict=await rejected(()=>s(otherAdmin,'series',{professionalId:worker.id,shiftTypeId:otherType.id,timezone:'America/Sao_Paulo',recurrence:'once',weekdays:[],anchorDate:offset(10),validUntil:offset(10),notes:'Conflito entre contextos sintéticos'},null,randomUUID(),other),/schedule overlap/);assert.equal(conflict.sqlstate,'23P01');assert.equal(conflict.message,'schedule_command: schedule overlap');
 await actor('admin',patient);await actor('schedule_worker',patient);
 const read=await worker.client.from('scheduled_shifts').select('id').eq('care_recipient_id',other);assert.ifError(read.error);assert.equal(read.data.length,0);
 state.objects.secondPatient=other;save();return{otherPatient:other,conflict,crossContextRowsVisible:0,limits:'Worker also has legitimate other membership,but active session context remains primary;no foreign scheduling detail returned'};
});record.finish();
