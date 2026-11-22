import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {preparedPatient} from './local-preparation-fixtures.mjs';
import {actor,fixtures,rpc,setup} from './v4-fixtures.mjs';
import {sql,sqlLiteral as q} from '../../scripts/test-environment.mjs';
const read=client=>patient=>rpc(client,'local_preparation_context',{p_patient:patient});
const facts=patient=>sql("select jsonb_build_object('members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id="+q(patient)+"),'docs',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id="+q(patient)+"),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"),'events',(select count(*) from public.document_events where care_recipient_id="+q(patient)+"));");
test('global creation hands off to its real initial local administrator without granting its creator local access',async()=>{
 const f=await preparedPatient(),before=facts(f.patient),data=await read(f.local)(f.patient);
 assert.equal(data.patientId,f.patient);assert.equal(data.patient.name,f.content.displayName);assert.equal(data.patient.referenceTimeZone,f.content.timeZone);
 assert.equal(data.people.activeMemberships,1);assert.deepEqual(data.catalogue,{activeProducts:0,inactiveProducts:0});
 assert.deepEqual(data.stock,{familyMovements:0,teamMovements:0,canManageFamily:true});assert.equal(data.source,'registered_metadata');
 assert.equal(data.balance.enabled,false);assert.equal(data.balance.timeZone,null);assert.equal(data.communication.guideConfigured,true);
 assert.equal(Object.hasOwn(data,'physicalVerified'),false);assert.equal(facts(f.patient),before);
 assert.equal((await f.global.rpc('local_preparation_context',{p_patient:f.patient})).error?.code,'42501');
 assert.equal(sql('select count(*) from public.care_recipient_memberships where care_recipient_id='+q(f.patient)+' and user_id='+q(fixtures.global.id)), '0');
});
test('explicit adoption and real opening movement change their own facts while preparation reads never duplicate them',async()=>{
 const f=await preparedPatient(),model='opening-model-'+randomUUID();
 sql('insert into public.products(id,name,category,unit,is_active) values('+[q(model),q('Material fictício de abertura'),q('higiene'),q('unidade'),'true'].join(',')+')');
 await rpc(f.local,'admin_adopt_product',{p_care_recipient_id:f.patient,p_product_id:model});
 const adopted=await read(f.local)(f.patient);assert.equal(adopted.catalogue.activeProducts,1);assert.equal(adopted.stock.familyMovements,0);
 const key=randomUUID(),packet={p_patient:f.patient,p_product:model,p_action:'inbound',p_quantity:'5',p_reason:'Conferência física fictícia de abertura com origem declarada',p_key:key};
 await rpc(f.local,'family_stock_movement',packet);await rpc(f.local,'family_stock_movement',packet);
 const before=facts(f.patient),first=await read(f.local)(f.patient),second=await read(f.local)(f.patient);
 assert.equal(first.stock.familyMovements,1);assert.equal(second.stock.familyMovements,1);assert.equal(first.stock.teamMovements,0);
 assert.equal(sql('select count(*) from public.stock_movements where care_recipient_id='+q(f.patient)+' and product_id='+q(model)),'1');
 assert.equal(facts(f.patient),before);
});
test('revoked read capabilities return null rather than stock metadata through write permission',async()=>{
 const f=await setup();
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.adminA.id)+",'stock.family.read',false),("+q(f.patient)+","+q(fixtures.adminA.id)+",'stock.team.read',false)");
 assert.ok(Number(sql('select count(*) from public.stock_movements where care_recipient_id='+q(f.patient)))>0);
 const data=await read(f.admin)(f.patient);assert.equal(data.stock.familyMovements,null);assert.equal(data.stock.teamMovements,null);assert.equal(data.stock.canManageFamily,true);
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.adminA.id)+",'catalog.manage',false)");
 assert.equal((await read(f.admin)(f.patient)).catalogue,null);
});
test('selected context, actual membership and preparation capability are all required independently of a global identity',async()=>{
 const f=await setup(),other=await setup();
 await actor('adminA',other.patient);assert.equal((await f.admin.rpc('local_preparation_context',{p_patient:f.patient})).error?.code,'42501');
 await actor('adminA',f.patient);
 const reader=await actor('reader',f.patient);assert.equal((await reader.rpc('local_preparation_context',{p_patient:f.patient})).error?.code,'42501');
 const global=await actor('global');assert.equal((await global.rpc('local_preparation_context',{p_patient:f.patient})).error?.code,'42501');
 sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.adminA.id));
 assert.equal((await f.admin.rpc('local_preparation_context',{p_patient:f.patient})).error?.code,'42501');
});
test('inactive preparation stays readable without presenting enabled stock actions, and grants exclude anonymous and service roles',async()=>{
 const f=await preparedPatient(false),data=await read(f.local)(f.patient);
 assert.equal(data.patient.active,false);assert.equal(data.stock.canManageFamily,false);assert.equal(data.schedules.canManageTeam,false);assert.equal(data.balance.canConfigure,false);
 const grants=JSON.parse(sql("select jsonb_build_object('anon',has_function_privilege('anon','public.local_preparation_context(uuid)','execute'),'service',has_function_privilege('service_role','public.local_preparation_context(uuid)','execute'),'authenticated',has_function_privilege('authenticated','public.local_preparation_context(uuid)','execute'))"));
 assert.deepEqual(grants,{anon:false,service:false,authenticated:true});
});
