/* MUTABLE LOCAL: one newly invited account; no prior account changed. */
import {randomBytes,createHash} from 'node:crypto';
import {actor,service,state,save,rpc,recorder,rejected,assert,sql,sqlLiteral as lit} from './local-harness.mjs';
const audit=recorder('B3.3i',{resume:true});
await audit.scenario('B33-14','Conta convidada sem aceite não recebe vínculo por sessão ou metadata',async()=>{
 if(!state.actors.invited){const password='B3!'+randomBytes(24).toString('base64url'),email=state.tag.toLowerCase()+'-invited@example.invalid',r=await service.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(r.error);state.actors.invited={id:r.data.user.id,email,password};save();sql(`insert into public.profiles(id,full_name,role,status) values(${lit(r.data.user.id)},'Pessoa fictícia B3 convidada','professional','active');`);}
 const admin=await actor('admin'),hash=createHash('sha256').update(randomBytes(32)).digest('hex');
 await rpc(admin,'admin_create_invitation',{p_care_recipient_id:state.patient,p_email:state.actors.invited.email,p_role:'professional',p_can_manage_stock:false,p_can_count_stock:true,p_token_hash:hash,p_expires_at:new Date(Date.now()+86400000).toISOString()});
 const cl=await actor('invited',null),ws=await rpc(cl,'my_workspace'),context=await rejected(()=>rpc(cl,'select_active_context',{p_patient:state.patient}));assert.equal(context.rejected,true);assert.equal(ws.patients.length,0);return {pendingInvitation:true,workspacePatients:0,contextDenied:context};
});audit.finish();
