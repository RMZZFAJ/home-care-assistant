/* LOCAL: NEW rollback-only history fixture; own synthetic COM for read checks.
 * Actual Auth claims for document permissions; simulated service SQL for job.
 * No restore, old version edit, external send, reset or trigger change. */
import {createClient} from '@supabase/supabase-js';
import {actor,state,env,rpc,sql,sqlLiteral as lit,randomUUID,assert,recorder,createDoc} from './local-harness.mjs';
const audit=recorder('B3.12h',{resume:true});audit.result.method='Second-pass rollback history fixture with live Auth session claims; anonymous limited verification HTTP; rollback job contract with simulated service role. No provider proof.';
const admin=await actor('admin'),session=(await admin.auth.getSession()).data.session,decoded=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString()),claims={sub:state.actors.admin.id,role:'authenticated',session_id:decoded.session_id};
await audit.scenario('B312-06','Duzentas versões preservam hash antigo mas acumulam20100 entradas resumidas',async()=>{
 const patient=randomUUID(),doc=randomUUID(),text=sql(`begin;set local statement_timeout='30s';
 insert into public.care_recipients(id,display_name,is_development) values(${lit(patient)},'Paciente fictício B3 história rollback',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${lit(patient)},${lit(state.actors.admin.id)},'admin');
 select set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true) is not null;
 select public.select_active_context(${lit(patient)}) is not null;
 insert into public.operational_documents(id,care_recipient_id,type,status,created_by,idempotency_key,payload) values(${lit(doc)},${lit(patient)},'COM','draft',${lit(state.actors.admin.id)},gen_random_uuid(),'{}');
 do $b3$ declare i integer;metrics jsonb:='[]';old_hash text;begin
 for i in 1..200 loop update public.operational_documents set version=i where id=${lit(doc)};
 perform private.record_document_event(${lit(doc)},'b3.history.fixture','{}',gen_random_uuid());
 if i=1 then select content_hash into old_hash from public.document_events where document_id=${lit(doc)} and version=1;end if;
 if i in(10,100,200) then metrics:=metrics||jsonb_build_array((select jsonb_build_object('events',i,'sumStoredBodyBytes',sum(pg_column_size(body)),'sumLogicalBodyBytes',sum(octet_length(body::text)),'summarizedEntries',sum(jsonb_array_length(body->'history')),'latestLogicalBodyBytes',(select octet_length(body::text) from public.document_events where document_id=${lit(doc)} and version=i)) from public.document_events where document_id=${lit(doc)}));end if;
 end loop;
 perform set_config('b3.metrics',jsonb_build_object('samples',metrics,'oldHash',old_hash,'digestMismatches',(select count(*) from public.document_events where document_id=${lit(doc)} and content_hash<>encode(extensions.digest(body::text,'sha256'),'hex')))::text,true);end $b3$;
 set local role authenticated;
 select current_setting('b3.metrics')::jsonb||jsonb_build_object('authorizedDetailEventCount',jsonb_array_length(public.operational_document(${lit(doc)})->'events'),'oldVersionVerifies',public.verify_document_integrity(${lit(doc)},1,current_setting('b3.metrics')::jsonb->>'oldHash'));
 reset role;rollback;`),result=JSON.parse(text.split('\n').find(x=>x.startsWith('{')));
 assert.equal(result.authorizedDetailEventCount,200);assert.equal(result.oldVersionVerifies,true);assert.equal(result.digestMismatches,0);assert.equal(result.samples.at(-1).summarizedEntries,20100);
 const remaining=Number(sql(`select count(*) from public.care_recipients where id=${lit(patient)};`));assert.equal(remaining,0);delete result.oldHash;return {...result,rolledBack:true,fixturePatientRemaining:remaining,limits:'200 bounded versions, not1000 or production benchmark; owner events are fixture creation, not public command authorization. pg_column_size sum is not full relation/TOAST/index size'};
});
await audit.scenario('B312-07','Verificação pública limitada não retorna conteúdo e exige hash exato de versão existente',async()=>{
 const row=JSON.parse(sql(`select jsonb_build_object('id',document_id,'version',version,'hash',content_hash) from public.document_events where document_id=${lit(state.objects.lifecycleReq.id)} order by version limit 1;`)),anon=createClient(env.url,env.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const known=await rpc(anon,'verify_document_integrity',{p_id:row.id,p_version:row.version,p_hash:row.hash}),wrong=await rpc(anon,'verify_document_integrity',{p_id:row.id,p_version:row.version,p_hash:'0'.repeat(64)}),missing=await rpc(anon,'verify_document_integrity',{p_id:randomUUID(),p_version:row.version,p_hash:row.hash}),read=await anon.from('operational_documents').select('id,canonical_snapshot').eq('id',row.id);
 assert.equal(known,true);assert.equal(wrong,false);assert.equal(missing,false);assert.ok(read.error||read.data.length===0);return {knownExactHash:true,wrongHash:false,missingId:false,privateContentReadDenied:true,returnType:typeof known,classification:'Deliberate public boolean verification surface; not a RLS finding. Hash is integrity anchor in database, not independent digital signature against a compromised owner'};
});
await audit.scenario('B312-08','Job histórico pode permanecer válido após cancelamento; nova ação documental continua bloqueada',async()=>{
 const d=await createDoc(admin,'COM',{lines:[{productId:state.products[0],quantity:'1'}]}),text=sql(`begin;set local statement_timeout='30s';select set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true) is not null;
 select public.supply_document_command(${lit(d.id)},'cancel','{"reason":"Cancelamento fictício B3 durante job"}',${lit(randomUUID())},${d.version}) is not null;
 select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;
 do $b3$ declare n uuid:=gen_random_uuid();w uuid:=gen_random_uuid();payload jsonb;allowed boolean;blocked boolean:=false;begin
 insert into public.requisition_notifications(id,care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,attempts,event_key,leased_by,lease_expires_at) values(n,${lit(state.patient)},${lit(d.id)},${lit(state.actors.family.id)},'family','Pessoa fictícia B3 job histórico','internal','processing',1,'com.issued',w,now()+interval '1 minute');
 allowed:=public.validate_notification_job(n,w);payload:=public.notification_document_payload(n,w);
 perform set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true);
 begin perform public.supply_document_command(${lit(d.id)},'approve','{"lines":[]}',gen_random_uuid(),${d.version+1});exception when others then blocked:=sqlerrm='document is terminal';end;
 perform set_config('b3.result',jsonb_build_object('jobStillValid',allowed,'payloadHistoricalVersion',payload->'version','payloadHistoricalStatus',payload->'snapshot'->>'status','currentStatus',(select status from public.operational_documents where id=${lit(d.id)}),'currentVersion',(select version from public.operational_documents where id=${lit(d.id)}),'newActionBlocked',blocked,'externalSending',false)::text,true);end $b3$;
 select current_setting('b3.result')::jsonb;rollback;`),result=JSON.parse(text.split('\n').find(x=>x.startsWith('{')));assert.equal(result.jobStillValid,true);assert.equal(result.currentStatus,'cancelled');assert.equal(result.newActionBlocked,true);assert.equal(result.payloadHistoricalVersion,d.version);return {...result,rolledBack:true,classification:'Historical event notification contract, not permission to act on cancelled document; delivery ordering/labels require product/external validation',limits:'New COM and rollback job fixture; actual Auth claims for cancellation, simulated service SQL, no actual worker/provider'};
});audit.finish();
