import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {actor,env,fixtures,issue,rpc,setup} from './v4-fixtures.mjs';
import {contingencyBody,contingencyPacket,recordContingency} from './contingency-fixtures.mjs';
import {sql,sqlLiteral as q} from '../../scripts/test-environment.mjs';
const state=patient=>sql("select jsonb_build_object('stock',(select jsonb_agg(to_jsonb(x) order by id) from public.stock_movements x where care_recipient_id="+q(patient)+"),'docs',(select jsonb_agg(to_jsonb(x) order by id) from public.operational_documents x where care_recipient_id="+q(patient)+"),'events',(select count(*) from public.document_events where care_recipient_id="+q(patient)+"),'notifications',(select count(*) from public.requisition_notifications where care_recipient_id="+q(patient)+"))");
const detail=(client,patient,id,process='REQ')=>rpc(client,'contingency_cases',{p_patient:patient,p_process:process,p_id:id});
const decision=(patient,id,action,body,revision=1)=>contingencyPacket(patient,'REQ',{p_id:id,p_expected:revision,p_action:action,p_body:body});
test('contingency preserves explicit unknowns and digital attribution without changing any physical facts',async()=>{
 const f=await setup(),pro=await actor('professional',f.patient),packet=contingencyPacket(f.patient),before=state(f.patient);
 const first=await rpc(pro,'contingency_command',packet),again=await rpc(pro,'contingency_command',packet);assert.equal(first.caseId,again.caseId);assert.equal(again.replayed,true);
 const row=await detail(pro,f.patient,first.caseId);assert.equal(row.actorId,fixtures.professional.id);assert.equal(row.content.performer,null);assert.equal(row.content.receiver,null);assert.equal(row.content.occurredOn,null);assert.equal(row.revision,1);assert.equal(row.events.length,0);assert.equal(state(f.patient),before);
 assert.equal((await pro.from('contingency_cases').select('*')).error?.code,'PGRST205');
 assert.throws(()=>sql('update private.contingency_cases set actor_name='+q('Outra pessoa')+' where id='+q(row.id)),/immutable/);
 assert.equal((await pro.rpc('contingency_command',{...packet,p_body:contingencyBody({receiver:'Outra declaração'})})).error?.code,'23505');
});
test('a second legitimate person links an existing fact once without another document stock entry or personal receipt',async()=>{
 const f=await setup(),req=await issue(f.patient,f.products),pro=await actor('professional',f.patient),created=await recordContingency(pro,f.patient),before=state(f.patient);
 const self=await pro.rpc('contingency_command',decision(f.patient,created.caseId,'link_existing',{reason:'Conferência própria não substitui decisão independente',targetId:req.id}));assert.equal(self.error?.code,'42501');
 const family=await actor('family',f.patient),packet=decision(f.patient,created.caseId,'link_existing',{reason:'Documento existente comparado com o registro físico fictício',targetId:req.id});
 const r=await rpc(family,'contingency_command',packet);await rpc(family,'contingency_command',packet);assert.equal(r.revision,2);
 const d=await detail(family,f.patient,created.caseId);assert.equal(d.state,'linked');assert.equal(d.events.length,1);assert.equal(d.events[0].actorId,fixtures.family.id);assert.equal(d.events[0].body.targetId,req.id);assert.equal(state(f.patient),before);
 assert.equal((await family.rpc('contingency_command',{...packet,p_key:randomUUID(),p_expected:2})).error?.code,'PT409');
});
test('clarification and supplements append history and prohibit reviewing any declaration of your own',async()=>{
 const f=await setup(),created=await recordContingency(f.admin,f.patient),family=await actor('family',f.patient);
 await rpc(family,'contingency_command',decision(f.patient,created.caseId,'needs_clarification',{reason:'Identificar o recebedor antes da conciliação',targetId:null}));
 const admin=await actor('adminA',f.patient),extra=contingencyBody({receiver:'Referência histórica declarada, sem assinatura no aplicativo'});
 await rpc(admin,'contingency_command',decision(f.patient,created.caseId,'supplement',extra,2));
 const d=await detail(admin,f.patient,created.caseId);assert.equal(d.content.receiver,null);assert.equal(d.events[1].body.receiver,extra.receiver);assert.equal(d.revision,3);
 assert.equal((await admin.rpc('contingency_command',decision(f.patient,created.caseId,'needs_clarification',{reason:'Não pode revisar o próprio relato',targetId:null},3))).error?.code,'42501');
 assert.throws(()=>sql('delete from private.contingency_events where case_id='+q(created.caseId)),/immutable/);
});
test('native validation distinguishes known zero quantity from unknown and never trusts client snapshots',async()=>{
 const f=await setup(),body=contingencyBody({materials:[{productId:f.products[0],description:null,quantity:'0',custody:'CARE_TEAM',reviewedUnit:'unidade',reviewedDecimals:0}],communications:[{person:'Pessoa histórica fictícia',channel:'paper',state:'pending',basis:'Aguardar a conferência pessoal do registro físico'}]});
 const created=await recordContingency(f.admin,f.patient,'REQ',body),d=await detail(f.admin,f.patient,created.caseId);assert.equal(d.content.materials[0].quantity,'0');assert.ok(d.content.materials[0].unit);assert.equal(d.content.communications[0].state,'pending');
 for(const invalid of [{...body,actorId:fixtures.family.id},{...body,occurredTime:'12:00'}, {...body,performer:''},{...body,materials:[{...body.materials[0],quantity:'0.1'}]},{...body,materials:[{...body.materials[0],unit:'inventada'}]},{...body,communications:[{person:'Pessoa',channel:'paper',state:'received',basis:'não equivale a aceite'}]}]){
  assert.equal((await f.admin.rpc('contingency_command',contingencyPacket(f.patient,'REQ',{p_body:invalid}))).error?.code,'22023');
 }
});
test('context revoked membership process permissions and remote-style service credentials do not confer dossier access',async()=>{
 const f=await setup(),other=await setup(),admin=await actor('adminA',f.patient),created=await recordContingency(admin,f.patient),global=await actor('global');
 assert.equal((await global.rpc('contingency_cases',{p_patient:f.patient,p_process:'REQ',p_id:created.caseId})).error?.code,'42501');
 await actor('adminA',other.patient);assert.equal((await admin.rpc('contingency_cases',{p_patient:f.patient,p_process:'REQ',p_id:created.caseId})).error?.code,'42501');
 const pro=await actor('professional',f.patient);assert.equal((await pro.rpc('contingency_cases',{p_patient:f.patient,p_process:'COM'})).error?.code,'42501');
 await actor('adminA',f.patient);sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.adminA.id));
 assert.equal((await admin.rpc('contingency_cases',{p_patient:f.patient,p_process:'REQ',p_id:created.caseId})).error?.code,'42501');
 const service=createClient(env.url,env.serviceKey,{auth:{persistSession:false}});assert.equal((await service.rpc('contingency_cases',{p_patient:f.patient,p_process:'REQ'})).error?.code,'42501');
});
test('references are patient and process scoped and paginated without inferring family science',async()=>{
 const f=await setup(),req=await issue(f.patient,f.products),family=await actor('family',f.patient),created=await recordContingency(family,f.patient),admin=await actor('adminA',f.patient),refs=await rpc(admin,'contingency_references',{p_patient:f.patient,p_process:'REQ'});
 assert.ok(refs.data.some(x=>x.id===req.id));assert.equal(refs.patientId,f.patient);assert.equal(refs.process,'REQ');
 const another=await setup(),foreign=await issue(another.patient,another.products);await actor('adminA',f.patient);
 assert.equal((await admin.rpc('contingency_command',decision(f.patient,created.caseId,'link_existing',{reason:'Referência de outro paciente deve ser recusada',targetId:foreign.id}))).error?.code,'42501');
 for(let i=0;i<26;i++)await recordContingency(admin,f.patient);
 const first=await rpc(admin,'contingency_cases',{p_patient:f.patient,p_process:'REQ',p_page:0}),next=await rpc(admin,'contingency_cases',{p_patient:f.patient,p_process:'REQ',p_page:1});
 assert.equal(first.total,27);assert.equal(first.data.length,25);assert.equal(next.data.length,2);assert.equal(new Set([...first.data,...next.data].map(x=>x.id)).size,27);
});
test('case-locked evidence reuses actual Storage attestation recovery and immutable hash selection at reconciliation',async()=>{
 const f=await setup(),req=await issue(f.patient,f.products),pro=await actor('professional',f.patient),created=await recordContingency(pro,f.patient),bytes=await sharp({create:{width:16,height:16,channels:3,background:'white'}}).jpeg().toBuffer(),hash=createHash('sha256').update(bytes).digest('hex'),key=randomUUID(),worker=createClient(env.url,env.serviceKey,{auth:{persistSession:false}});
 const args={p_patient:f.patient,p_contingency:created.caseId,p_filename:'registro-fisico-ficticio.jpg',p_mime:'image/jpeg',p_bytes:bytes.length,p_key:key,p_source_hash:hash,p_source_bytes:bytes.length,p_source_mime:'image/jpeg',p_hash:hash,p_transformation:'image-normalized-v1'};
 const a=await rpc(pro,'prepare_contingency_attachment_attempt',args);assert.equal(a.contingency_id,created.caseId);assert.equal((await rpc(pro,'prepare_contingency_attachment_attempt',args)).id,a.id);
 await rpc(worker,'attest_attachment_source',{p_id:a.id,p_actor:fixtures.professional.id,p_source_hash:hash,p_source_bytes:bytes.length,p_source_mime:'image/jpeg',p_hash:hash,p_transformation:'image-normalized-v1'});
 const family=await actor('family',f.patient),packet=decision(f.patient,created.caseId,'link_existing',{reason:'Evidência comparada com a ficha existente',targetId:req.id});
 assert.equal((await family.rpc('contingency_command',packet)).error?.code,'PT409');
 const token=randomUUID();await rpc(pro,'begin_attachment_upload',{p_id:a.id,p_source_hash:hash,p_hash:hash,p_token:token});assert.ifError((await pro.storage.from('patient-evidence').upload(a.object_path,bytes,{contentType:'image/jpeg',upsert:false})).error);
 await rpc(worker,'settle_attachment_upload',{p_id:a.id,p_actor:fixtures.professional.id,p_token:token,p_outcome:'stored'});await rpc(worker,'finalize_attachment',{p_id:a.id,p_actor:fixtures.professional.id,p_hash:hash,p_mime:'image/jpeg',p_bytes:bytes.length,p_valid:true});await rpc(pro,'bind_validated_attachment',{p_id:a.id});
 const files=await rpc(pro,'contingency_attachment_attempts',{p_patient:f.patient,p_contingency:created.caseId,p_key:key});assert.equal(files.length,1);assert.equal(files[0].sourceSha256,hash);assert.equal(files[0].state,'ready');assert.ifError((await pro.storage.from('patient-evidence').download(a.object_path)).error);
 const before=state(f.patient);await rpc(family,'contingency_command',packet);const d=await detail(family,f.patient,created.caseId);assert.deepEqual(d.events[0].body.evidence,[{id:a.id,sha256:hash}]);assert.equal(state(f.patient),before);await rpc(worker,'finalize_attachment',{p_id:a.id,p_actor:fixtures.professional.id,p_hash:hash,p_mime:'image/jpeg',p_bytes:bytes.length,p_valid:true});await rpc(pro,'bind_validated_attachment',{p_id:a.id});
 assert.equal((await pro.rpc('prepare_contingency_attachment_attempt',{...args,p_key:randomUUID()})).error?.code,'PT409');
 sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.professional.id));assert.ok((await pro.storage.from('patient-evidence').download(a.object_path)).error);
});

test('official recovery either finds the one result or fences a late command without saving an ordinary draft',async()=>{
 const f=await setup(),packet=contingencyPacket(f.patient),before=state(f.patient),probe={p_patient:f.patient,p_process:'REQ',p_key:packet.p_key,p_resolve:false};
 const unknown=await rpc(f.admin,'contingency_recovery',probe);assert.equal(unknown.persistence,'unconfirmed');
 const closed=await rpc(f.admin,'contingency_recovery',{...probe,p_resolve:true});assert.equal(closed.persistence,'not_executed');assert.equal((await f.admin.rpc('contingency_command',packet)).error?.code,'23505');assert.equal(state(f.patient),before);
 const next=contingencyPacket(f.patient),[command,recovery]=await Promise.all([f.admin.rpc('contingency_command',next),f.admin.rpc('contingency_recovery',{...probe,p_key:next.p_key,p_resolve:true})]);assert.ifError(recovery.error);
 if(recovery.data.persistence==='confirmed'){assert.ifError(command.error);assert.equal(recovery.data.caseId,command.data.caseId);}else{assert.equal(recovery.data.persistence,'not_executed');assert.equal(command.error?.code,'23505');}
 assert.equal(Number(sql('select count(*) from private.contingency_cases where care_recipient_id='+q(f.patient))),command.error?0:1);
 assert.equal((await f.admin.rpc('contingency_recovery',{...probe,p_key:next.p_key,p_process:'COM'})).error?.code,'42501');assert.equal(state(f.patient),before);
});

test('material snapshots reject a different reviewed unit or precision before preserving a physical declaration',async()=>{
 const f=await setup(),body=contingencyBody({materials:[{productId:f.products[0],description:null,quantity:'1',custody:'FAMILY',reviewedUnit:'mL',reviewedDecimals:3}]}),before=state(f.patient);
 assert.equal((await f.admin.rpc('contingency_command',contingencyPacket(f.patient,'REQ',{p_body:body}))).error?.code,'PT409');assert.equal(Number(sql('select count(*) from private.contingency_cases where care_recipient_id='+q(f.patient))),0);assert.equal(state(f.patient),before);
});
test('two independent real reviewers serialize on the same recorded revision and only one immutable decision remains',async()=>{
 const f=await setup(),req=await issue(f.patient,f.products),pro=await actor('professional',f.patient),created=await recordContingency(pro,f.patient),admin=await actor('adminA',f.patient),family=await actor('family',f.patient),before=state(f.patient),body={reason:'Conferência independente fictícia com referência existente',targetId:req.id};
 const r=await Promise.all([admin.rpc('contingency_command',decision(f.patient,created.caseId,'link_existing',body)),family.rpc('contingency_command',decision(f.patient,created.caseId,'link_existing',body))]);assert.equal(r.filter(x=>!x.error).length,1);assert.equal(r.filter(x=>x.error?.code==='PT409').length,1);assert.equal((await detail(admin,f.patient,created.caseId)).events.length,1);assert.equal(state(f.patient),before);
});

test('known physical date time zone and historical people remain distinct from the authenticated digital registration',async()=>{
 const f=await setup(),body=contingencyBody({occurredOn:'2026-11-11',occurredTime:'13:45',timeZone:'America/Sao_Paulo',performer:'Pessoa histórica declarada',receiver:'Referência física do recebedor'}),created=await recordContingency(f.admin,f.patient,'REQ',body),d=await detail(f.admin,f.patient,created.caseId);
 assert.equal(d.content.occurredOn,'2026-11-11');assert.equal(d.content.occurredTime,'13:45');assert.equal(d.content.timeZone,'America/Sao_Paulo');assert.equal(d.content.performer,body.performer);assert.equal(d.content.receiver,body.receiver);assert.equal(d.actorId,fixtures.adminA.id);assert.notEqual(d.actorName,body.performer);assert.match(d.recordedAt,/T/);assert.equal(d.canReview,false);
});
