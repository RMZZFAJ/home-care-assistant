import {initialize,state,actor,rpc,docState,countStock,recorder,assert,randomUUID,sql,sqlLiteral} from './local-harness.mjs';
await initialize();const record=recorder('B2.5S'),admin=await actor('admin'),family=await actor('family'),counter=await actor('balance_counter'),patient=state.patient;
const bal=(client,action,body,version=null)=>rpc(client,'balance_command',{p_patient:patient,p_action:action,p_body:body,p_key:randomUUID(),p_version:version});
await record.scenario('B25-15','Aprovação familiar de adiamento preserva prazo original;ensaio transacional com sessão Auth real',async()=>{
 const before=await rpc(counter,'balance_workspace',{p_patient:patient}),a=before.eligibility.assignment,target=before.targets.find(s=>s.starts_at>=a.ends_at);
 const request=await bal(counter,'request_deferral',{assignmentId:a.id,targetShiftId:target.id,reason:'Ensaio fictício de aprovação de adiamento com rollback'},a.version);
 const session=(await family.auth.getSession()).data.session,claims=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString());
 const authClaims={sub:claims.sub,session_id:claims.session_id,role:'authenticated',aal:claims.aal,exp:claims.exp};assert.ok(authClaims.session_id);
 const statement=`begin;set local role authenticated;select set_config('request.jwt.claims',${sqlLiteral(JSON.stringify(authClaims))},true) is not null;select public.balance_command(${sqlLiteral(patient)},'decide_deferral',${sqlLiteral(JSON.stringify({id:request.id,approve:true,reason:'Decisão familiar fictícia aprova o destino posterior'}))}::jsonb,${sqlLiteral(randomUUID())},null)->>'status';select public.balance_workspace(${sqlLiteral(patient)});rollback;`;
 const raw=sql(statement),approvedState=JSON.parse(raw.split('\n').find(line=>line.startsWith('{')));
 assert.equal(approvedState.deferrals.find(d=>d.id===request.id).status,'approved');assert.equal(approvedState.eligibility.assignment.shift_id,target.id);assert.equal(approvedState.obligations[0].original_due,before.obligations[0].original_due);
 if(before.obligations[0].state==='pending') assert.equal(Date.parse(approvedState.obligations[0].effective_due)>=Date.parse(target.ends_at),true);
 else assert.equal(approvedState.obligations[0].effective_due,before.obligations[0].effective_due);
 const after=await rpc(counter,'balance_workspace',{p_patient:patient});assert.equal(after.eligibility.assignment.id,a.id);
 await bal(family,'decide_deferral',{id:request.id,approve:false,reason:'Encerramento do ensaio fictício mantém o plantão original'});
 return{approvedInsideRollback:{status:approvedState.deferrals.find(d=>d.id===request.id).status,assignment:approvedState.eligibility.assignment,obligation:approvedState.obligations[0]},rollbackRestoredOriginal:true,scope:'Formal recount;already-counted obligation correctly retains its deadline. Extension of a still-pending weekly obligation is not proven by this sample.',method:'DB authenticated role with claims from an officially issued live Auth session;not an HTTP transport or time-elapsed proof;no token exported'};
});
await record.scenario('B25-16','Pausar regime conserva obrigação e reconto ativo;reativação não apaga história',async()=>{
 const before=await rpc(admin,'balance_workspace',{p_patient:patient}),r=before.regime;
 const body={enabled:false,timezone:r.timezone,weekday:r.weekday,shiftTypeId:r.shift_type_id,professionalId:r.designated_professional_id,startsOn:r.starts_on,reason:'Pausa fictícia de processamento sem dispensar pendências existentes'};
 await bal(admin,'configure',body,r.version);const paused=await rpc(counter,'balance_workspace',{p_patient:patient});assert.equal(paused.enabled,false);assert.equal(paused.eligibility.assignment.id,before.eligibility.assignment.id);assert.equal(paused.obligations.length,before.obligations.length);assert.equal(paused.eligibility.available,true);
 await bal(admin,'configure',{...body,enabled:true,reason:'Retomada fictícia do regime preservando ativação original'},paused.regime.version);const after=await rpc(counter,'balance_workspace',{p_patient:patient});assert.equal(after.regime.activated_at,r.activated_at);
 return{pausedEnabled:false,activeAssignmentStillExecutable:true,obligationIdsPreserved:true,originalActivationPreserved:true,meaning:'Pausa suspende geração automática; não dispensa trabalho já atribuído nem devolve ao modo anterior'};
});
await record.scenario('B25-17','Diferença física no reconto não vira débito de consumo nem ajuste antes da revisão',async()=>{
 const workspace=await rpc(counter,'balance_workspace',{p_patient:patient}),a=workspace.eligibility.assignment,id=state.objects.scheduledBalance,product=state.products[2],before=countStock(product);
 const lines=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('productId',c.product_id,'quantity',case when c.product_id=${sqlLiteral(product)} then '0' else private.stock_quantity(c.care_recipient_id,c.product_id,'CARE_TEAM')::text end) order by c.product_id) from public.care_recipient_products c where care_recipient_id=${sqlLiteral(patient)} and is_active;`));
 await rpc(counter,'revise_supply_document',{p_id:id,p_payload:{lines,notes:'Contagem física sintética encontrou zero no produto-alvo;causa da diferença ainda não é consumo',balanceAssignment:{id:a.id,version:a.version,referenceRevision:workspace.referenceRevision}},p_key:randomUUID(),p_version:docState(id).version,p_recount:true});
 assert.deepEqual(countStock(product),before);const d=docState(id);assert.equal(d.status,'submitted');const line=d.lines.find(l=>l.productId===product);assert.equal(Number(line.quantity),0);assert.equal(Number(line.metadata.expectedQuantity),1);
 await bal(admin,'assign_recount',{documentId:id,targetShiftId:a.shift_id,reason:'Nova atribuição formal fictícia para auditar passagem de responsabilidade'},d.version);
 return{before,after:countStock(product),countedQuantity:line.quantity,referenceQuantity:line.metadata.expectedQuantity,documentStatus:d.status,documentVersion:d.version,adjustmentNotYetApplied:true,next:'B2.6 handoff keeps count author/history and may test final distinct review'};
});record.finish();
