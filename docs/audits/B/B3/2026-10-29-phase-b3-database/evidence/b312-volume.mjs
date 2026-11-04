/* LOCAL ROLLBACK ONLY. Bounded1000-event COM fixture with live Auth for read;
 * no business API throughput, no original rows, provider or trigger changes. */
import {actor,state,sql,sqlLiteral as lit,randomUUID,recorder,assert} from './local-harness.mjs';
const audit=recorder('B3.12v',{resume:true});audit.result.method='1000 NEW owner-generated synthetic document events in rollback with current triggers; actual Auth session for old/current reads; timeout30s per statement.';
await audit.scenario('B312-09','Mil eventos mantêm versão antiga verificável e armazenam500500 resumos',async()=>{
 const client=await actor('admin'),session=(await client.auth.getSession()).data.session,d=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString()),claims={sub:state.actors.admin.id,role:'authenticated',session_id:d.session_id},p=randomUUID(),id=randomUUID();
 const raw=sql(`begin;set local statement_timeout='30s';
 insert into public.care_recipients(id,display_name,is_development) values(${lit(p)},'Paciente fictício B3 mil eventos rollback',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${lit(p)},${lit(state.actors.admin.id)},'admin');
 select set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true) is not null;select public.select_active_context(${lit(p)}) is not null;
 insert into public.operational_documents(id,care_recipient_id,type,status,created_by,idempotency_key) values(${lit(id)},${lit(p)},'COM','draft',${lit(state.actors.admin.id)},gen_random_uuid());
 do $b3$ declare i integer;metrics jsonb:='[]';started timestamptz:=clock_timestamp();begin
 for i in 1..1000 loop update public.operational_documents set version=i where id=${lit(id)};perform private.record_document_event(${lit(id)},'b3.volume.fixture','{}',gen_random_uuid());
 if i in(100,500,1000) then metrics:=metrics||jsonb_build_array((select jsonb_build_object('events',i,'sumLogicalBodyBytes',sum(octet_length(body::text)),'sumStoredBodyBytes',sum(pg_column_size(body)),'summarizedEntries',sum(jsonb_array_length(body->'history')),'fixtureElapsedMs',extract(epoch from clock_timestamp()-started)*1000) from public.document_events where document_id=${lit(id)}));end if;end loop;
 perform set_config('b3.volume.metrics',jsonb_build_object('samples',metrics,'digestMismatches',(select count(*) from public.document_events where document_id=${lit(id)} and content_hash<>encode(extensions.digest(body::text,'sha256'),'hex')))::text,true);end $b3$;
 set local role authenticated;
 select current_setting('b3.volume.metrics')::jsonb||jsonb_build_object('detailEvents',jsonb_array_length(public.operational_document(${lit(id)})->'events'),'oldVersionAccessible',(select count(*)=1 from public.document_events where document_id=${lit(id)} and version=1),'oldVersionVerifies',(select public.verify_document_integrity(document_id,version,content_hash) from public.document_events where document_id=${lit(id)} and version=1));reset role;rollback;`);
 const result=JSON.parse(raw.split('\n').find(x=>x.startsWith('{')));assert.equal(result.detailEvents,1000);assert.equal(result.samples.at(-1).summarizedEntries,500500);assert.equal(result.digestMismatches,0);assert.equal(result.oldVersionAccessible,true);assert.equal(result.oldVersionVerifies,true);
 const remaining=Number(sql(`select count(*) from public.care_recipients where id=${lit(p)};`));assert.equal(remaining,0);return {...result,rolledBack:true,fixturePatientRemaining:remaining,limits:'COM event fixture, one admin, no lines; elapsed includes fixture writes/metrics, not user-command latency or production throughput. Logical bytes differ from compressed storage, relation/TOAST/index size and backup size. REQ has additional snapshot fields.'};
});audit.finish();
