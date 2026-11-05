/* LOCAL cross-layer intent test; one NEW fictitious patient, no old data changed. */
import assert from 'node:assert/strict';
import { state,http,select,record,save } from './http-local.mjs';
import { sql,sqlLiteral } from '../../../../scripts/test-environment.mjs';
await select('global',null);
const created=await http('global','/api/admin',{method:'POST',body:{action:'recipient',id:null,displayName:'Residência inicialmente inativa fictícia '+state.tag,isActive:false,isDevelopment:true,initialAdministratorEmail:state.actors.admin.email}});
assert.equal(created.status,200);const id=created.data.data.id;assert(id);assert.equal(created.data.data.is_active,true);
state.objects.inactiveIntentPatient=id;save();
const read=()=>JSON.parse(sql(`begin read only;select jsonb_build_object('isActive',is_active,'isDevelopment',is_development,'administratorActive',exists(select 1 from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(id)} and user_id=${sqlLiteral(state.actors.admin.id)} and role='admin' and status='active')) from public.care_recipients where id=${sqlLiteral(id)};rollback;`));
const initially=read();assert.equal(initially.isActive,true);assert.equal(initially.administratorActive,true);
await select('admin',id);
const changed=await http('admin','/api/admin',{method:'POST',body:{action:'recipient',id,displayName:'Residência inicialmente inativa fictícia '+state.tag,isActive:false,isDevelopment:true}});assert.equal(changed.status,200);assert.equal(read().isActive,false);
record('b412-create-state-results.json',{recordedAt:new Date().toISOString(),category:'HTTP_REAL_AUTH_AND_PERSISTENCE_READBACK',results:[{id:'B412-02',contract:'Create patient must honor inactive intent or reject unsupported field explicitly',requestedActive:false,createStatus:created.status,communicatedActive:created.data.data.is_active,initiallyPersisted:initially,counterproof:{localUpdateStatus:changed.status,finalPersistedActive:false,initialAdministratorPreserved:true},cause:'Creation adapter accepts isActive but calls create_patient_with_administrator without it;RPC passes hardcoded true',limits:'One new synthetic development patient;no unauthorized user gained access;not a global-to-local bypass. Existing update works.'}]});
await select('admin');console.log(JSON.stringify({scenarios:1,ignoredActiveFlagConfirmed:true,newPatientEndsInactive:true}));
