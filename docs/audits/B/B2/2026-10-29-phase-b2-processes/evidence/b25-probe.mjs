import {initialize,state,save,actor,addAuditActor,rpc,createDoc,command,docState,countStock,recorder,rejected,assert,randomUUID,sql,sqlLiteral} from './local-harness.mjs';
await initialize();const record=recorder('B2.5'),admin=await actor('admin'),family=await actor('family'),pro=await actor('professional'),supervisor=await actor('supervisor');
const patient=state.patient;
const review=async change=>rpc(admin,'configure_patient_access',{p_patient:patient,p_kind:'settings',p_change:change,p_key:randomUUID(),p_version:Number(sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(patient)};`))});
const countLines=()=>JSON.parse(sql(`select jsonb_agg(jsonb_build_object('productId',c.product_id,'quantity',private.stock_quantity(c.care_recipient_id,c.product_id,'CARE_TEAM')::text) order by c.product_id) from public.care_recipient_products c where care_recipient_id=${sqlLiteral(patient)} and is_active;`));
const approvals=id=>JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('group',review_group,'actor',actor_id,'countVersion',count_version) order by count_version,review_group),'[]') from public.bal_approvals where document_id=${sqlLiteral(id)};`));
let legacy;
await record.scenario('B25-01','Regime anterior: supervisor pode aprovar a própria contagem com revisão obrigatória',async()=>{
 await review({balReview:'required',balApprovers:['supervisor'],balRequirement:'any'});
 const d=await createDoc(supervisor,'BAL',{lines:countLines()});assert.equal(d.status,'submitted');
 const result=await command(supervisor,d.id,'approve',{group:'supervisor'});
 assert.equal(result.status,'approved');const a=approvals(d.id);assert.equal(a[0].actor,state.actors.supervisor.id);
 state.objects.legacySelfReview=d.id;save();return{document:docState(d.id),approvals:a,counterId:state.actors.supervisor.id,selfReviewAccepted:true,scope:'Legacy mode without balanceContext;not the scheduled regime'};
});
await record.scenario('B25-02','Contagem required conserva política original quando configuração atual muda',async()=>{
 await review({balReview:'required',balApprovers:['family','supervisor'],balRequirement:'all'});
 legacy=await createDoc(pro,'BAL',{lines:countLines()});
 await review({balReview:'optional'});
 await command(family,legacy.id,'approve',{group:'family'});
 const d=await rpc(admin,'operational_document',{p_id:legacy.id});assert.equal(d.status,'submitted');assert.equal(d.workflow_data.reviewPolicy.balReview,'required');assert.equal(d.workflow_data.reviewPolicy.balRequirement,'all');
 return{document:docState(legacy.id),capturedPolicy:d.workflow_data.reviewPolicy,currentPolicy:'optional',approvals:approvals(legacy.id),capturedPolicyPreserved:true};
});
await record.scenario('B25-03','Recebimento durante revisão invalida referência;reconto preserva aprovações sem reutilizá-las',async()=>{
 const ent=await createDoc(admin,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:state.products[0],quantity:'1'}]});await command(pro,ent.id,'receive',{divergences:[]});
 const refusal=await rejected(()=>command(supervisor,legacy.id,'approve',{group:'supervisor'}),/reference changed/);assert.equal(refusal.rejected,true);
 const beforeRecount=approvals(legacy.id),version=docState(legacy.id).version;
 await rpc(pro,'revise_supply_document',{p_id:legacy.id,p_payload:{lines:countLines(),notes:'Nova conferência física sintética após chegada durante revisão'},p_key:randomUUID(),p_version:version,p_recount:true});
 assert.equal(approvals(legacy.id).length,beforeRecount.length);
 await command(family,legacy.id,'approve',{group:'family'});assert.equal(docState(legacy.id).status,'submitted');
 await command(supervisor,legacy.id,'approve',{group:'supervisor'});assert.equal(docState(legacy.id).status,'approved');
 return{refusal,beforeRecount,afterRecount:approvals(legacy.id),document:docState(legacy.id),oldReviewDidNotApproveNewCount:true};
});
await record.scenario('B25-04','Relato livre sem linhas persiste,mas confirmação não consegue convertê-lo em consumo',async()=>{
 const id=await rpc(pro,'report_extraordinary_consumption',{p_patient:patient,p_kind:'consumption',p_location:'CARE_TEAM',p_text:'Relato fictício somente textual de material utilizado fora da rotina',p_lines:[],p_key:randomUUID()});
 const refused=await rejected(()=>rpc(admin,'confirm_extraordinary_consumption',{p_id:id,p_accept:true}),/structured confirmation required/);assert.equal(refused.rejected,true);
 const row=JSON.parse(sql(`select jsonb_build_object('id',id,'status',status,'lines',lines) from public.consumption_reports where id=${sqlLiteral(id)};`));assert.equal(row.status,'reported');
 state.objects.freeTextConsumption=id;save();return{row,refused,recovery:'Rejeitar e criar novo estruturado é possível;API/UI não oferecem complementar linhas com vínculo ao original'};
});
let reportId;
await record.scenario('B25-05','Consumo estruturado debita somente na confirmação e retry não duplica',async()=>{
 const product=state.products[2],before=countStock(product);reportId=await rpc(pro,'report_extraordinary_consumption',{p_patient:patient,p_kind:'consumption',p_location:'CARE_TEAM',p_text:'Uma unidade fictícia utilizada e conferida no cenário operacional',p_lines:[{productId:product,quantity:'1'}],p_key:randomUUID()});assert.deepEqual(countStock(product),before);
 await rpc(admin,'confirm_extraordinary_consumption',{p_id:reportId,p_accept:true});const after=countStock(product);assert.equal(Number(after.CARE_TEAM),Number(before.CARE_TEAM)-1);
 await rpc(admin,'confirm_extraordinary_consumption',{p_id:reportId,p_accept:true});assert.deepEqual(countStock(product),after);return{reportId,before,after,retryNoDuplicate:true};
});
await record.scenario('B25-06','Decisão oposta posterior devolve sucesso vazio sem aplicar rejeição',async()=>{
 const result=await rpc(supervisor,'confirm_extraordinary_consumption',{p_id:reportId,p_accept:false});
 const row=JSON.parse(sql(`select jsonb_build_object('status',status,'confirmedBy',confirmed_by) from public.consumption_reports where id=${sqlLiteral(reportId)};`));assert.equal(row.status,'confirmed');assert.equal(result,null);
 return{requestedDecision:'reject',rpcSucceeded:true,rpcResult:result,persisted:row,sourceConsequence:'API returns200 data:null and console treats operation as confirmed;there is no expectedVersion/decision conflict'};
});
await record.scenario('B25-07','Falta confirmada e consumo rejeitado não produzem débito',async()=>{
 const product=state.products[2],before=countStock(product),shortage=await rpc(pro,'report_extraordinary_consumption',{p_patient:patient,p_kind:'shortage',p_location:'CARE_TEAM',p_text:'Falta fictícia observada sem afirmar uso de quantidade',p_lines:[],p_key:randomUUID()});await rpc(admin,'confirm_extraordinary_consumption',{p_id:shortage,p_accept:true});
 const rejectedReport=await rpc(pro,'report_extraordinary_consumption',{p_patient:patient,p_kind:'consumption',p_location:'CARE_TEAM',p_text:'Relato fictício que não foi confirmado na conferência',p_lines:[{productId:product,quantity:'1'}],p_key:randomUUID()});await rpc(admin,'confirm_extraordinary_consumption',{p_id:rejectedReport,p_accept:false});assert.deepEqual(countStock(product),before);
 return{before,after:countStock(product),shortageId:shortage,rejectedReport,uiLanguageLimit:'Confirmation dialog currently claims consumption for both kinds;source examined,not rendered here'};
});
let counter,type,workspace,assignment,targets;
const bal=(client,action,body,version=null)=>rpc(client,'balance_command',{p_patient:patient,p_action:action,p_body:body,p_key:randomUUID(),p_version:version});
const shift=(action,body,version=null)=>rpc(admin,'schedule_command',{p_patient:patient,p_action:action,p_body:body,p_key:randomUUID(),p_version:version});
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
const offset=days=>new Date(Date.parse(today+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
await record.scenario('B25-08','Ativação opt-in cria obrigação e atribuição na janela de plantão real',async()=>{
 await review({balReview:'required',balApprovers:['family','supervisor'],balRequirement:'all'});
 counter=await addAuditActor('balance_counter','supervisor');
 const before=await rpc(admin,'balance_workspace',{p_patient:patient});assert.equal(before.enabled,false);
 type=await shift('type',{name:'Plantão diário fictício B2 de contagem',startsLocal:'00:00',durationMinutes:1440});
 await shift('series',{professionalId:counter.id,shiftTypeId:type.id,timezone:'America/Sao_Paulo',recurrence:'weekly',weekdays:[0,1,2,3,4,5,6],anchorDate:today,validUntil:offset(3),notes:'Programação sintética para auditar BAL'});
 await bal(admin,'configure',{enabled:true,timezone:'America/Sao_Paulo',weekday:new Date(today+'T12:00:00Z').getUTCDay(),shiftTypeId:type.id,professionalId:counter.id,startsOn:today,reason:'Ativação explícita somente na residência fictícia B2'});
 workspace=await rpc(counter.client,'balance_workspace',{p_patient:patient});assignment=workspace.eligibility.assignment;targets=workspace.targets;
 assert.equal(workspace.eligibility.available,true);assert.equal((await rpc(admin,'balance_workspace',{p_patient:patient})).eligibility.available,false);
 state.objects.balanceType=type.id;state.objects.balanceCounter=counter.id;save();
 return{beforeEnabled:false,regime:workspace.regime,assignment,obligations:workspace.obligations,adminNotCounter:true};
});
await record.scenario('B25-09','Pessoa diferente ou payload sem atribuição não substitui responsável real',async()=>{
 const payload={lines:countLines(),balanceAssignment:{id:assignment.id,version:assignment.version,referenceRevision:workspace.referenceRevision}};
 const other=await rejected(()=>createDoc(pro,'BAL',payload,randomUUID(),true));assert.equal(other.rejected,true);
 const missing=await rejected(()=>createDoc(counter.client,'BAL',{lines:countLines()},randomUUID(),true));assert.equal(missing.rejected,true);
 return{other,missing};
});
await record.scenario('B25-10','Pedido de adiamento conserva prazo;supervisão não decide;família pode rejeitar',async()=>{
 const target=targets.find(s=>s.starts_at>=assignment.ends_at);assert.ok(target);
 const request=await bal(counter.client,'request_deferral',{assignmentId:assignment.id,targetShiftId:target.id,reason:'Ausência fictícia requer avaliação familiar'},assignment.version);
 const pending=await rpc(counter.client,'balance_workspace',{p_patient:patient});assert.equal(pending.eligibility.assignment.id,assignment.id);assert.equal(pending.eligibility.assignment.ends_at,assignment.ends_at);
 const denied=await rejected(()=>bal(supervisor,'decide_deferral',{id:request.id,approve:true,reason:'Supervisão não substitui decisão familiar'}),/family approval/);assert.equal(denied.rejected,true);
 await bal(family,'decide_deferral',{id:request.id,approve:false,reason:'Família fictícia mantém responsabilidade e prazo vigentes'});
 const final=await rpc(counter.client,'balance_workspace',{p_patient:patient});assert.equal(final.eligibility.assignment.id,assignment.id);return{requestId:request.id,pendingKeptDeadline:true,denied,decision:final.deferrals.find(d=>d.id===request.id)};
});
await record.scenario('B25-11','Destino alterado deixa adiamento pendente e bloqueia até a rejeição enquanto origem válida',async()=>{
 const target=targets.find(s=>s.starts_at>=assignment.ends_at);
 const request=await bal(counter.client,'request_deferral',{assignmentId:assignment.id,targetShiftId:target.id,reason:'Proposta fictícia cujo plantão de destino será alterado'},assignment.version);
 await shift('change',{id:target.id,notes:'Nota operacional fictícia alterada após proposta',reason:'Atualização legítima da ocorrência futura de destino'},target.version);
 await bal(admin,'refresh',{});
 const afterRefresh=await rpc(admin,'balance_workspace',{p_patient:patient}),still=afterRefresh.deferrals.find(d=>d.id===request.id);
 const refuse=await rejected(()=>bal(family,'decide_deferral',{id:request.id,approve:false,reason:'Família deseja rejeitar proposta cujo destino foi alterado'}),/stale document target shift/);
 assert.equal(still.status,'pending');assert.equal(refuse.rejected,true);
 return{requestId:request.id,statusAfterRefresh:still.status,rejectAttempt:refuse,originalAssignmentActive:afterRefresh.eligibility.assignment.id===assignment.id,recovery:'Contar/encerrar atribuição torna proposta stale;durante origem ativa,não há rejeição efetiva neste caminho'};
});
await record.scenario('B25-12','Scheduler de prazo simulado preserva atraso e transfere responsabilidade;rollback mantém fixture',async()=>{
 const when=new Date(Date.parse(assignment.ends_at)+1000).toISOString();
 const before=await rpc(admin,'balance_workspace',{p_patient:patient});
 const raw=sql(`begin;select private.process_bal_patient(${sqlLiteral(patient)},${sqlLiteral(when)}::timestamptz);select jsonb_build_object('assignmentStates',(select jsonb_agg(jsonb_build_object('status',status,'missedAt',missed_at,'endsAt',ends_at)) from public.bal_assignments where care_recipient_id=${sqlLiteral(patient)}),'obligations',(select jsonb_agg(jsonb_build_object('originalDue',original_due,'effectiveDue',effective_due,'missedAt',missed_at)) from public.bal_obligations where care_recipient_id=${sqlLiteral(patient)}));rollback;`);
 const simulation=JSON.parse(raw.split('\n').find(line=>line.startsWith('{')));assert.equal(simulation.assignmentStates.some(a=>a.status==='missed'),true);
 const after=await rpc(admin,'balance_workspace',{p_patient:patient});assert.equal(after.eligibility.assignment.id,before.eligibility.assignment.id);
 return{simulationClock:when,simulation,rollbackPreservedAssignment:true,method:'Scoped privileged scheduler call inside transaction;not an Auth authorization test or real elapsed day'};
});
let scheduled;
await record.scenario('B25-13','Contagem agendada conclui obrigação física,mas revisão e ajuste ainda podem estar pendentes',async()=>{
 workspace=await rpc(counter.client,'balance_workspace',{p_patient:patient});assignment=workspace.eligibility.assignment;
 const payload={lines:countLines(),balanceAssignment:{id:assignment.id,version:assignment.version,referenceRevision:workspace.referenceRevision}};
 scheduled=await createDoc(counter.client,'BAL',payload);assert.equal(scheduled.status,'submitted');
 const after=await rpc(admin,'balance_workspace',{p_patient:patient});assert.equal(after.obligations[0].state,'counted');assert.equal(after.assignments.find(a=>a.id===assignment.id).status,'counted');
 const self=await rejected(()=>command(counter.client,scheduled.id,'approve',{group:'supervisor'}),/distinct balance reviewer/);assert.equal(self.rejected,true);
 state.objects.scheduledBalance=scheduled.id;save();return{document:docState(scheduled.id),obligation:after.obligations[0],assignment:after.assignments.find(a=>a.id===assignment.id),deferrals:after.deferrals.map(d=>({id:d.id,status:d.status})),selfReviewRejected:self,interpretation:'counted is physical obligation fulfilled,not final approval of stock'};
});
await record.scenario('B25-14','BAL agendado não pode ser cancelado para apagar contagem;reconto formal fica disponível',async()=>{
 const refused=await rejected(()=>command(admin,scheduled.id,'cancel',{reason:'Tentativa fictícia de apagar contagem já vinculada à obrigação'}),/formal recount/);assert.equal(refused.rejected,true);
 await bal(admin,'assign_recount',{documentId:scheduled.id,targetShiftId:assignment.shift_id,reason:'Nova conferência física fictícia formal sem apagar versão anterior'},docState(scheduled.id).version);
 const after=await rpc(counter.client,'balance_workspace',{p_patient:patient});assert.equal(after.eligibility.assignment.kind,'recount');assert.equal(after.eligibility.available,true);
 return{refused,recountAssignment:after.eligibility.assignment,document:docState(scheduled.id),nextGroup:'B2.6 may inspect same-window handoff using this active formal recount'};
});
record.finish();
