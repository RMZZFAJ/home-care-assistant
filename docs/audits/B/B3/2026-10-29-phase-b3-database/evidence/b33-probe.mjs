/* MUTABLE LOCAL ONLY. New B3 synthetic Auth, patients, catalogue, memberships. */
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {initialize,actor,addAuditActor,createAuditPatient,state,save,env,rpc,recorder,rejected,sql,sqlLiteral as lit,assert,randomUUID,service} from './local-harness.mjs';
await initialize();
const audit=recorder('B3.3',{resume:true}),admin=await actor('admin');
await actor('professional');
await audit.scenario('B33-01','Dois pacientes e profissional compartilhado, com contexto explícito',async()=>{
 if(!state.objects.patientB){state.objects.patientB=await createAuditPatient('isolamento B',[['shared','professional']]);save();}
 await addAuditActor('shared','professional');await addAuditActor('outsider','reader',state.objects.patientB);
 const a=await actor('shared'),wa=await rpc(a,'my_workspace');
 await rpc(a,'select_active_context',{p_patient:state.objects.patientB});
 const cross=await rejected(()=>rpc(a,'stock_overview',{p_patient:state.patient}));assert.equal(cross.rejected,true);
 await actor('shared',state.patient);
 return {twoPatients:true,sharedMemberships:wa.patients.filter(p=>[state.patient,state.objects.patientB].includes(p.id)).length,crossContextDenied:cross};
});
await audit.scenario('B33-02','Matriz de papéis reais e capacidades, sem metadata autoritativa',async()=>{
 const rows=[];for(const name of ['admin','family','supervisor','professional','reader','shared']){
 const client=await actor(name),capabilities=await rpc(client,'patient_capabilities',{p_patient:state.patient});
 const read=await client.from('care_recipients').select('id').eq('id',state.patient);
 assert.ifError(read.error);rows.push({actor:name,patient:'A',visible:read.data.length,capabilities});}
 return rows;
});
await audit.scenario('B33-03','Contexto A não permite B; admin tem vínculo em ambos e outros papéis não têm B',async()=>{
 const outsider=await actor('outsider',state.objects.patientB),foreign=await rpc(outsider,'stock_overview',{p_patient:state.objects.patientB});
 const rows=[];for(const name of ['admin','family','supervisor','professional','reader']){const cl=await actor(name);const read=await cl.from('care_recipients').select('id').eq('id',state.objects.patientB);assert.ifError(read.error);assert.equal(read.data.length,0);const command=await rejected(()=>rpc(cl,'stock_overview',{p_patient:state.objects.patientB}));assert.equal(command.rejected,true);rows.push({actor:name,tableRows:read.data.length,rpc:command});}return {foreignReadAuthorized:Array.isArray(foreign)||!!foreign,denials:rows};
});
await audit.scenario('B33-04','Escalada por metadata controlável e DML direto é recusada',async()=>{
 const cl=await actor('professional');const changed=await cl.auth.updateUser({data:{role:'admin',global_scope:true,can_manage_stock:true}});assert.ifError(changed.error);
 const profile=sql(`select role::text||':'||global_scope::text from public.profiles where id=${lit(state.actors.professional.id)};`);
 const out=await rejected(()=>rpc(cl,'family_stock_movement',{p_patient:state.patient,p_product:state.products[0],p_quantity:1,p_action:'inbound',p_reason:'Teste adversarial B3',p_key:randomUUID()}));
 const direct=await cl.from('profiles').update({role:'admin',global_scope:true}).eq('id',state.actors.professional.id);
 assert.equal(out.rejected,true);assert.ok(direct.error);assert.equal(profile,'professional:false');return {metadataUpdated:true,databaseProfile:profile,operationalDenied:out,directUpdateDenied:direct.error.code};
});
await audit.scenario('B33-05','Anon só alcança os dois contratos deliberadamente mínimos',async()=>{
 const anon=createClient(env.url,env.anonKey,{auth:{persistSession:false}}),tables=await anon.from('requisitions').select('id').eq('care_recipient_id',state.patient);
 assert.ok(tables.error);const verify=await rpc(anon,'verify_document_integrity',{p_id:randomUUID(),p_version:1,p_hash:'0'.repeat(64)});
 const invite=await rpc(anon,'invitation_registration_allowed',{p_token_hash:'0'.repeat(64),p_email:'synthetic@example.invalid'});
 return {tableDenied:tables.error.code,verify,invalidInvitationAllowed:invite};
});
await audit.scenario('B33-06','Leitor e profissional não recebem autoridade de administração',async()=>{
 const rows=[];for(const name of ['reader','professional','family']){const cl=await actor(name),result=await rejected(()=>rpc(cl,'admin_upsert_recipient_product',{p_care_recipient_id:state.patient,p_product_id:null,p_name:'Adição indevida B3',p_category:'higiene',p_unit:'unidade',p_aliases:[],p_is_active:true}));assert.equal(result.rejected,true);rows.push({actor:name,result});}return rows;
});
await audit.scenario('B33-07','Revogação local vale para token já emitido e preserva outro paciente',async()=>{
 const shared=await actor('shared');await rpc(admin,'admin_set_membership_status',{p_care_recipient_id:state.patient,p_user_id:state.actors.shared.id,p_status:'revoked'});
 const read=await shared.from('care_recipients').select('id').eq('id',state.patient),denied=await rejected(()=>rpc(shared,'stock_overview',{p_patient:state.patient}));assert.ifError(read.error);assert.equal(read.data.length,0);assert.equal(denied.rejected,true);
 await rpc(shared,'select_active_context',{p_patient:state.objects.patientB});const b=await rpc(shared,'stock_overview',{p_patient:state.objects.patientB});
 return {oldTokenRowsA:read.data.length,oldTokenDeniedA:denied,otherPatientAuthorized:!!b};
});
await audit.scenario('B33-08','JWT ainda criptograficamente válido não restaura sessão encerrada',async()=>{
 const {client}=await addAuditActor('sessiontest','professional'),session=(await client.auth.getSession()).data.session;assert.ok(session);
 const old=createClient(env.url,env.anonKey,{auth:{persistSession:false},global:{headers:{authorization:'Bearer '+session.access_token}}});
 assert.equal(await rpc(old,'my_session_valid'),true);const out=await client.auth.signOut({scope:'local'});assert.ifError(out.error);
 const valid=await rpc(old,'my_session_valid'),ws=await rejected(()=>rpc(old,'my_workspace'));assert.equal(valid,false);assert.equal(ws.rejected,true);
 return {previousTokenSessionValid:valid,workspaceDenied:ws,noTokenExported:true};
});
await audit.scenario('B33-09','Global sem vínculo não opera sobre residência B3',async()=>{
 const {fixtureFile}=await import('../../../../scripts/test-environment.mjs'),{fixturePassword}=await import('../../../../scripts/test-constants.mjs'),f=JSON.parse(readFileSync(fixtureFile));
 const cl=createClient(env.url,env.anonKey,{auth:{persistSession:false}});const login=await cl.auth.signInWithPassword({email:f.global.email,password:fixturePassword});assert.ifError(login.error);await rpc(cl,'select_active_context',{p_patient:null});
 const read=await rejected(()=>rpc(cl,'stock_overview',{p_patient:state.patient})),select=await rejected(()=>rpc(cl,'select_active_context',{p_patient:state.patient}));assert.equal(read.rejected,true);assert.equal(select.rejected,true);return {operational:read,selectContext:select};
});
await audit.scenario('B33-10','Cliente service_role sem grant não altera ledger ou paciente',async()=>{
 const a=await service.from('stock_movements').update({quantity:99}).eq('id',randomUUID()),b=await service.from('care_recipients').update({is_active:false}).eq('id',state.patient);assert.ok(a.error);assert.ok(b.error);return {ledger:a.error.code,patient:b.error.code};
});
audit.finish();
