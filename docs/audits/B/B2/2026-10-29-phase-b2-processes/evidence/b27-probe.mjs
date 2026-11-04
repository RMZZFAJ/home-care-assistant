import {createHash,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {fixtureFile} from '../../../../scripts/test-environment.mjs';
import {fixturePassword} from '../../../../scripts/test-constants.mjs';
import {initialize,state,save,env,actor,addAuditActor,rpc,createDoc,command,docState,countStock,recorder,rejected,assert,randomUUID,sql,sqlLiteral} from './local-harness.mjs';
await initialize();const resume=process.argv.includes('--resume'),record=recorder('B2.7',{resume}),patient=state.patient,admin=await actor('admin'),admin2=await actor('admin2'),pro=await actor('professional',resume?null:state.patient),replacement=await actor('replacement'),reader=await actor('reader');
const newHash=()=>createHash('sha256').update(randomBytes(32)).digest('hex');
const invite=async(client,name,role='reader',lifetime=3600000)=>{const hash=newHash(),row=await rpc(client,'admin_create_invitation',{p_care_recipient_id:patient,p_email:state.actors[name].email,p_role:role,p_can_manage_stock:false,p_can_count_stock:role==='professional',p_token_hash:hash,p_expires_at:new Date(Date.now()+lifetime).toISOString()});return{id:row.id,hash};};
const status=(user,status)=>rpc(admin,'admin_set_membership_status',{p_care_recipient_id:patient,p_user_id:state.actors[user].id,p_status:status});
await record.scenario('B27-01','Identidade global e papel local são fatos separados;admin local não altera perfil global',async()=>{
 const row=JSON.parse(sql(`select jsonb_build_object('globalRole',p.role,'globalScope',p.global_scope,'localRole',m.role,'membership',m.status) from public.profiles p join public.care_recipient_memberships m on m.user_id=p.id and m.care_recipient_id=${sqlLiteral(patient)} where p.id=${sqlLiteral(state.actors.admin.id)};`));assert.equal(row.localRole,'admin');assert.equal(row.globalScope,false);
 const denied=await rejected(()=>rpc(admin,'admin_set_profile',{p_user_id:state.actors.reader.id,p_full_name:'Pessoa fictícia B2 reader',p_role:'admin',p_status:'active',p_global_scope:true}));assert.equal(denied.rejected,true);return{row,globalProfileMutationRefused:denied};
});
await record.scenario('B27-02','Convite:conta errada recusada;reemissão invalida token antigo;aceito não é revogado pelo convite',async()=>{
 const first=await invite(admin,'reader'),wrong=await rejected(()=>rpc(pro,'accept_invitation',{p_token_hash:first.hash}));assert.equal(wrong.rejected,true);
 const nextHash=newHash();await rpc(admin,'admin_resend_invitation',{p_invitation_id:first.id,p_token_hash:nextHash,p_expires_at:new Date(Date.now()+3600000).toISOString()});
 const old=await rejected(()=>rpc(reader,'accept_invitation',{p_token_hash:first.hash}));assert.equal(old.rejected,true);
 const accepted=await rpc(reader,'accept_invitation',{p_token_hash:nextHash});assert.equal(accepted.role,'reader');
 const revoked=await rejected(()=>rpc(admin,'revoke_invitation',{p_invitation_id:first.id}),/accepted invitation cannot be revoked/);assert.equal(revoked.rejected,true);
 return{invitationId:first.id,wrongAccount:wrong,oldToken:old,acceptedRole:accepted.role,revokeAcceptedRefused:revoked,secretsExported:false};
});
await record.scenario('B27-03','Expiração real curta e revogação impedem aceite sem alterar vínculo já existente',async()=>{
 const timed=await invite(admin,'reader','reader',1200);await new Promise(resolve=>setTimeout(resolve,1600));
 const expired=await rejected(()=>rpc(reader,'accept_invitation',{p_token_hash:timed.hash}),/expired invitation/);assert.equal(expired.rejected,true);
 const revoked=await invite(admin,'reader');await rpc(admin,'revoke_invitation',{p_invitation_id:revoked.id});const acceptance=await rejected(()=>rpc(reader,'accept_invitation',{p_token_hash:revoked.hash}),/expired invitation/);assert.equal(acceptance.rejected,true);
 return{expiredInvitationId:timed.id,expired,revokedInvitationId:revoked.id,revokedAcceptance:acceptance,method:'New synthetic invitation;actual1.6second wait;no backdated existing record'};
});
await record.scenario('B27-04','Autoridade do emissor é revalidada;último administrador permanece protegido',async()=>{
 const pending=await invite(admin2,'replacement','reader');await status('admin2','revoked');
 const acceptance=await rejected(()=>rpc(replacement,'accept_invitation',{p_token_hash:pending.hash}),/expired invitation/);assert.equal(acceptance.rejected,true);
 const last=await rejected(()=>status('admin','revoked'),/last patient administrator/);assert.equal(last.rejected,true);
 await rpc(admin,'admin_upsert_membership',{p_care_recipient_id:patient,p_user_id:state.actors.admin2.id,p_role:'admin',p_can_manage_stock:true,p_can_count_stock:true});await actor('admin2');
 return{invitationId:pending.id,issuerRevokedAcceptance:acceptance,lastAdminRefusal:last,secondSyntheticAdminRestored:true,existingReplacementRoleUnchanged:sql(`select role from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(patient)} and user_id=${sqlLiteral(state.actors.replacement.id)};`)};
});
let pending,partial;
await record.scenario('B27-05','Preparar responsabilidades pendentes antes do desligamento:uma entrega sem aceite e outra parcial',async()=>{
 await addAuditActor('professional','professional',state.objects.secondPatient);await actor('professional',patient);await actor('admin',patient);
 pending=await createDoc(admin,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:state.products[3],quantity:'1'}]});
 partial=await createDoc(admin,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:state.products[0],quantity:'2'}]});await command(pro,partial.id,'receive',{divergences:[{lineId:partial.lines[0].id,acceptedQuantity:'1',problem:'Um material fictício ainda não foi conferido'}]});
 state.objects.departurePending=pending.id;state.objects.departurePartial=partial.id;save();return{pending:docState(pending.id),partial:docState(partial.id),stock:countStock(state.products[0])};
});
await record.scenario('B27-06','Revogação local retira autoridade imediatamente,conservando outro paciente e história',async()=>{
 await status('professional','revoked');
 const receive=await rejected(()=>command(pro,pending.id,'receive',{divergences:[]}));assert.equal(receive.rejected,true);
 const existing=docState(partial.id);assert.equal(existing.status,'disputed');assert.equal(Number(existing.lines[0].accepted),1);
 const other=await actor('professional',state.objects.secondPatient),workspace=await rpc(other,'my_workspace');assert.equal(workspace.activeContext.mode,'patient');
 const directory=await rpc(admin,'patient_directory',{p_patient:patient});assert.equal(directory.some(p=>p.id===state.actors.professional.id),false);
 return{receiveAfterRevocation:receive,otherContextStillWorks:true,history:existing,revokedExcludedFromActiveDirectory:true};
});
await record.scenario('B27-07','Entrega sem aceite pode ser reatribuída;parcial não possui sucessão equivalente',async()=>{
 await command(admin,pending.id,'reassign',{recipientId:state.actors.replacement.id,reason:'Sucessor fictício assume entrega ainda não conferida'});await command(replacement,pending.id,'receive',{divergences:[]});
 const reassign=await rejected(()=>command(admin,partial.id,'reassign',{recipientId:state.actors.replacement.id,reason:'Sucessor precisa conferir restante após desligamento'}),/reassignment not authorized/);assert.equal(reassign.rejected,true);
 const receive=await rejected(()=>command(admin,partial.id,'resolve',{lineId:partial.lines[0].id,quantity:'1',resolution:'received',reason:'Administrador não pode afirmar aceite no lugar do destinatário'}),/only designated recipient/);assert.equal(receive.rejected,true);
 await command(admin,partial.id,'cancel',{reason:'Tentativa fictícia de resolver entrega parcial após desligamento'});
 const consent=await rejected(()=>command(replacement,partial.id,'consent_cancel',{reason:'Sucessor não pode consentir como pessoa anterior',lines:[{lineId:partial.lines[0].id,returnQuantity:'1',consumedQuantity:'0'}]}),/original recipient consent/);assert.equal(consent.rejected,true);
 return{pendingRecovered:docState(pending.id),partialBlocked:docState(partial.id),reassign,receive,consent,noArtificialReturnOrConsumption:true,recoveryGap:'Immediate revocation is correct;successor workflow for previously accepted material is missing'};
});
await record.scenario('B27-08','Convite aceito antigo não reativa vínculo revogado;reativação exige administrador',async()=>{
 const hash=sql(`select token_hash from public.care_recipient_invitations where care_recipient_id=${sqlLiteral(patient)} and email=${sqlLiteral(state.actors.professional.email)} and status='accepted' order by created_at limit 1;`);
 const retained=await rejected(()=>rpc(pro,'accept_invitation',{p_token_hash:hash}),/membership revoked/);assert.equal(retained.rejected,true);
 await rpc(admin,'admin_upsert_membership',{p_care_recipient_id:patient,p_user_id:state.actors.professional.id,p_role:'professional',p_can_manage_stock:false,p_can_count_stock:true});await actor('professional',patient);
 return{acceptedInviteReplayRefused:retained,restoredByExplicitAdmin:true,scope:'Retained-token scenario represented via hash from synthetic fixture;not discovery of a token by an outsider'};
});
await record.scenario('B27-09','Administração global propõe mudança e não executa operação local sem vínculo',async()=>{
 const fixtures=JSON.parse(readFileSync(fixtureFile,'utf8')),global=createClient(env.url,env.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});assert.ifError((await global.auth.signInWithPassword({email:fixtures.global.email,password:fixturePassword})).error);await rpc(global,'select_active_context',{p_patient:null});
 const operation=await rejected(()=>rpc(global,'create_supply_document',{p_patient:patient,p_type:'ENT',p_key:randomUUID(),p_payload:{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.replacement.id,lines:[{productId:state.products[0],quantity:'1'}]}}));assert.equal(operation.rejected,true);
 const version=Number(sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(patient)};`)),proposal=await rpc(global,'configure_patient_access',{p_patient:patient,p_kind:'settings',p_change:{scienceByDispatch:false},p_key:randomUUID(),p_version:version});assert.equal(proposal.status,'pending');
 const own=await rejected(()=>rpc(global,'configure_patient_access',{p_patient:patient,p_kind:'settings',p_change:{},p_key:randomUUID(),p_version:version,p_request_id:proposal.id,p_decision:'approve'}));assert.equal(own.rejected,true);
 const applied=await rpc(admin2,'configure_patient_access',{p_patient:patient,p_kind:'settings',p_change:{},p_key:randomUUID(),p_version:version,p_request_id:proposal.id,p_decision:'approve'});assert.equal(applied.status,'applied');
 return{localOperationRefused:operation,proposalId:proposal.id,globalSelfApprovalRefused:own,localDecision:applied.status,scope:'Only synthetic patient setting changed;global identity/privileges preserved'};
});record.finish();
