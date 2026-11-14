import { randomUUID } from 'node:crypto';
import { actor, fixtures, rpc } from './v4-fixtures.mjs';
export async function preparedPatient(active=true){
 const global=await actor('global');
 const content={displayName:'Residência fictícia local '+randomUUID().slice(0,8),isActive:active,isDevelopment:true,timeZone:'America/Sao_Paulo',administratorEmail:fixtures.family.email,ownerId:fixtures.global.id,substituteId:fixtures.adminA.id,responseMinutes:60,showGuide:true,teamIds:[]};
 const draft=await rpc(global,'residence_preparation_command',{p_id:null,p_expected:null,p_action:'save',p_content:content,p_step:0,p_key:randomUUID()});
 const created=await rpc(global,'residence_preparation_command',{p_id:draft.id,p_expected:draft.revision,p_action:'create',p_content:content,p_step:1,p_key:randomUUID()});
 const local=await actor('family',created.patientId);
 return {patient:created.patientId,preparation:created,content,global,local};
}
