/* MUTABLE LOCAL ONLY: new actors/reports/links, own B3 contexts and profile.
 * No original records, cleanup, DDL, external calls or provider messages. */
import sharp from 'sharp';
import {createHash,randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {actor,addAuditActor,state,env,service,rpc,rejected,recorder,assert,randomUUID,sql,sqlLiteral as lit,save,createDoc,countStock} from './local-harness.mjs';
import {raw,atStockLock,safe} from './concurrency-harness.mjs';
import {httpActor,origin} from './http-client.mjs';
const audit=recorder('B3.12',{resume:true});
audit.result.method='Second-pass independent local Auth/HTTP/Storage and persisted reads. Synthetic data only; no provider/browser/remote validation.';
const admin=await actor('admin'),family=await actor('family');
await audit.scenario('B312-01','JWT de sessão encerrada altera perfil e avatar próprios apesar da recusa da API',async()=>{
 const who=await addAuditActor('identity_session','professional'),s=await httpActor('identity_session'),session=(await s.client.auth.getSession()).data.session;
 const oldCookie=[...s.jar].map(([k,v])=>k+'='+v).join('; '),old=createClient(env.url,env.anonKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{authorization:'Bearer '+session.access_token}}});
 const jpeg=await sharp({create:{width:8,height:8,channels:3,background:'#504070'}}).jpeg().toBuffer(),path=who.id+'/b3-identity-'+randomUUID()+'.jpg';
 const upload=await s.client.storage.from('profile-avatars').upload(path,jpeg,{contentType:'image/jpeg'});assert.ifError(upload.error);
 const signout=await s.client.auth.signOut({scope:'local'});assert.ifError(signout.error);assert.equal(await rpc(old,'my_session_valid'),false);
 const api=await fetch(origin+'/api/profile',{headers:{cookie:oldCookie},signal:AbortSignal.timeout(15000)});assert.ok([401,403].includes(api.status));
 const name='Pessoa fictícia B3 após encerramento '+randomUUID().slice(0,8);
 await rpc(old,'update_my_profile',{p_name:name,p_registration:null,p_state:null,p_category:null,p_preferences:{}});await rpc(old,'set_my_avatar',{p_path:path});
 const stored=JSON.parse(sql(`select jsonb_build_object('nameChanged',full_name=${lit(name)},'avatarChanged',avatar_path=${lit(path)}) from public.profiles where id=${lit(who.id)};`));assert.equal(stored.nameChanged,true);assert.equal(stored.avatarChanged,true);
 const business=await rejected(()=>rpc(old,'stock_overview',{p_patient:state.patient}));assert.equal(business.sqlstate,'42501');
 return {appSessionValid:false,apiProfileStatus:api.status,directProfileWriteAccepted:true,directAvatarPointerAccepted:true,persisted:stored,businessReadDenied:business,scope:'Own new synthetic profile/avatar; JWT not expired. Other login of same new identity remains valid. No cross-user/patient access or password/email change demonstrated'};
});
await audit.scenario('B312-02','Trocar contexto enquanto movimento aguarda lock não revalida paciente depois da espera',async()=>{
 await actor('admin',state.patient);const product=state.objects.raceProduct,before=countStock(product),key=randomUUID();let switched=false;
 const race=await atStockLock(state.patient,[()=>raw(admin,'family_stock_movement',{p_patient:state.patient,p_product:product,p_quantity:'1',p_action:'inbound',p_reason:'Contexto concorrente fictício B3',p_key:key})],{afterWait:async()=>{const context=await rpc(admin,'select_active_context',{p_patient:state.objects.patientB});switched=context.careRecipientId===state.objects.patientB||context.patientId===state.objects.patientB||context.care_recipient_id===state.objects.patientB;if(!switched)switched=JSON.stringify(context).includes(state.objects.patientB);assert.equal(switched,true);}});
 const after=countStock(product),denied=await rejected(()=>rpc(admin,'family_stock_movement',{p_patient:state.patient,p_product:product,p_quantity:'1',p_action:'inbound',p_reason:'Contexto novo fictício B3',p_key:randomUUID()}));assert.equal(race.responses[0].status,200);assert.equal(after.movements,before.movements+1);assert.equal(denied.sqlstate,'42501');await actor('admin',state.patient);
 return {barrierWaiters:race.waitersObserved,contextSwitchedBeforeRelease:switched,response:race.responses.map(safe),movementAddedToOriginalPatient:after.movements-before.movements,newOldPatientCallDenied:denied,relation:'Same authorization-before-lock family as B38-06; context change affects future calls, in-flight command keeps original explicit patient. No cross-patient ID substitution or loss of membership'};
});
await audit.scenario('B312-03','Mesmo produto e usuário em dois pacientes não permitem vincular necessidade estrangeira',async()=>{
 const other=state.objects.patientB,pro=await addAuditActor('professional','professional',other),otherAdmin=await actor('admin',other);
 await rpc(otherAdmin,'admin_adopt_product',{p_care_recipient_id:other,p_product_id:'fralda'});
 const result=await rpc(pro.client,'submit_requisition',{p_care_recipient_id:other,p_idempotency_key:randomUUID(),p_payload_hash:'server-computes',p_lines:[{productId:'fralda',currentStock:'0',urgent:true}],p_extra_items:[],p_observations:[]}),foreign=result[0].requisition_id;
 const item=sql(`select id from public.requisition_items where requisition_id=${lit(foreign)} and product_id='fralda';`);assert.ok(item);await actor('admin',state.patient);await rpc(admin,'admin_adopt_product',{p_care_recipient_id:state.patient,p_product_id:'fralda'});await actor('professional',state.patient);
 const key=randomUUID(),before=Number(sql(`select count(*) from public.operational_documents where care_recipient_id=${lit(state.patient)};`)),denied=await rejected(()=>createDoc(family,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:'fralda',quantity:'1',requisitionItemIds:[item]}]},key,true));
 assert.equal(denied.rejected,true);assert.match(denied.message,/invalid requisition line link/);const rows=Number(sql(`select count(*) from public.operational_documents where created_by=${lit(state.actors.family.id)} and idempotency_key=${lit(key)};`)),after=Number(sql(`select count(*) from public.operational_documents where care_recipient_id=${lit(state.patient)};`));assert.equal(rows,0);assert.equal(after,before);
 state.objects.foreignLinkedReq=foreign;save();return {foreignRequisition:foreign,sameGlobalProduct:'fralda',professionalHasBothMemberships:true,denied,draftRowsPersisted:rows,mainDocumentCountUnchanged:true,scope:'Cross-tenant association rejected independently of product identity or membership; both patients synthetic'};
});
await audit.scenario('B312-04','Flow exige serviço, preserva replay igual, dono da confirmação e revogação atual',async()=>{
 const who=await addAuditActor('flow_author','professional'),hash=()=>createHash('sha256').update(randomBytes(32)).digest('hex'),h=hash(),session=await rpc(who.client,'create_flow_session',{p_patient:state.patient,p_hash:h});
 const publicCall=await rejected(()=>rpc(who.client,'flow_exchange',{p_hash:h}));assert.equal(publicCall.sqlstate,'42501');const start=await rpc(service,'flow_exchange',{p_hash:h});assert.equal(start.purpose,'occurrence');
 const body={kind:'shortage',text:'Ocorrência fictícia B3 Flow',lines:[]},first=await rpc(service,'flow_exchange',{p_hash:h,p_submit:body}),again=await rpc(service,'flow_exchange',{p_hash:h,p_submit:body}),conflict=await rejected(()=>rpc(service,'flow_exchange',{p_hash:h,p_submit:{...body,text:body.text+' diferente'}}));assert.equal(first.pendingConfirmation,true);assert.equal(again.pendingConfirmation,true);assert.equal(conflict.sqlstate,'42501');
 const submissions=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('id',id,'status',status)) from public.flow_submissions where session_id=${lit(session)};`));assert.equal(submissions.length,1);const other=await actor('professional'),notOwner=await rejected(()=>rpc(other,'review_flow_submission',{p_id:submissions[0].id,p_accept:true,p_kind:'shortage',p_text:body.text,p_lines:[]}));assert.equal(notOwner.sqlstate,'42501');
 const reviewed=await rpc(who.client,'review_flow_submission',{p_id:submissions[0].id,p_accept:true,p_kind:'shortage',p_text:body.text,p_lines:[]});assert.equal(reviewed.status,'confirmed');
 const h2=hash();await rpc(who.client,'create_flow_session',{p_patient:state.patient,p_hash:h2});await rpc(admin,'admin_set_membership_status',{p_care_recipient_id:state.patient,p_user_id:who.id,p_status:'revoked'});const revoked=await rejected(()=>rpc(service,'flow_exchange',{p_hash:h2}));assert.equal(revoked.sqlstate,'42501');
 return {session,publicCallDenied:publicCall.sqlstate,catalogLoaded:true,sameBodyReplay:true,differentBodyDenied:conflict.sqlstate,submissionRows:submissions.length,otherActorDenied:notOwner.sqlstate,reviewedStatus:reviewed.status,newReportId:reviewed.reportId,revokedActorDenied:revoked.sqlstate,limits:'Service RPC contract only; no Meta cryptography/editor/publication/WhatsApp delivery/OTP validation'};
});
await audit.scenario('B312-05','Nulos nas opções de lista documental ignoram a limitação SQL apesar do limite numérico',async()=>{
 const ordinary=await rpc(admin,'operational_document_list',{p_patient:state.patient,p_size:1,p_page:1}),nul=await rpc(admin,'operational_document_list',{p_patient:state.patient,p_size:null,p_page:null});assert.equal(ordinary.data.length,1);assert.equal(nul.data.length,nul.total);assert.equal(nul.pageSize,null);
 return {ordinaryPageRows:ordinary.data.length,nullPageRows:nul.data.length,total:nul.total,returnedPage:nul.page,returnedPageSize:nul.pageSize,classification:'Direct authorized RPC nullable parameter bypass of intended1..100 page bound; API pageParameters mitigates; no unauthorized rows demonstrated',cause:'SQL IF with NULL not-between yields NULL, LIMIT NULL means no limit'};
});
audit.finish();await actor('admin',state.patient);await actor('professional',state.patient);
