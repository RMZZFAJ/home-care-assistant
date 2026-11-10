-- Private family stock preparation;native movement remains the sole physical command.
create table private.consumption_preparations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 purpose text not null check(purpose in ('consumption_report_family','consumption_report_team','consumption_supplement','consumption_accept','consumption_reject')),
 target_resource_id uuid not null,
 revision integer not null default 1 check(revision>0),
 state text not null default 'active' check(state in ('active','discarded','consumed','completed')),
 content jsonb, content_hash text not null,
 navigation jsonb,
 created_at timestamptz not null default clock_timestamp(), saved_at timestamptz not null default clock_timestamp(),
 consumed_resource_id uuid, consumed_result jsonb,
 check((state='active')=(content is not null)),
 check((state in ('consumed','completed'))=(consumed_resource_id is not null)),
 check((state in ('consumed','completed'))=(consumed_result is not null))
);
create unique index consumption_preparation_active_slot on private.consumption_preparations(owner_id,care_recipient_id,purpose,target_resource_id) where state in ('active','consumed');
create index consumption_preparation_patient_fk on private.consumption_preparations(care_recipient_id);
create table private.consumption_preparation_commands (
 owner_id uuid not null references public.profiles(id), idempotency_key uuid not null,
 preparation_id uuid not null references private.consumption_preparations(id),
 intent_hash text not null, result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index consumption_preparation_command_fk on private.consumption_preparation_commands(preparation_id);
alter table private.consumption_preparations enable row level security;
alter table private.consumption_preparation_commands enable row level security;
revoke all on private.consumption_preparations,private.consumption_preparation_commands from public,anon,authenticated,service_role;



create function private.require_consumption_preparation_scope(p_patient uuid,p_purpose text,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare location text;begin
 if p_purpose in ('consumption_report_family','consumption_report_team') then
  if p_target is distinct from p_patient then raise exception 'invalid consumption target' using errcode='22023';end if;
  location:=case p_purpose when 'consumption_report_family' then 'FAMILY' else 'CARE_TEAM' end;
 elsif p_purpose in ('consumption_supplement','consumption_accept','consumption_reject') then
  select r.location into location from public.consumption_reports r where r.id=p_target and r.care_recipient_id=p_patient;
  if not found then raise exception 'consumption reference unavailable' using errcode='42501';end if;
 else raise exception 'invalid consumption purpose' using errcode='22023';end if;
 perform private.require_consumption_read(p_patient,location);
 if p_write then
  if p_purpose in ('consumption_report_family','consumption_report_team','consumption_supplement') then perform private.require_consumption_report(p_patient,location);
  else perform private.require_cap(p_patient,case location when 'FAMILY' then 'stock.family.manage' else 'consumption.confirm' end);end if;
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient' using errcode='42501';end if;
 end if;
end;$$;

create function private.validate_consumption_preparation(p_content jsonb,p_navigation jsonb,p_purpose text)
returns void language plpgsql set search_path='' as $$
declare f record;x jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or p_content-array['consumption','reference','referenceHash']<>'{}'::jsonb
 or not(p_content ?& array['consumption','reference','referenceHash']) or jsonb_typeof(p_content->'consumption') is distinct from 'object'
 or (p_content->'consumption')-array['kind','location','text','reason','lines','reminderId']<>'{}'::jsonb
 or not(p_content->'reference'='null'::jsonb or jsonb_typeof(p_content->'reference')='object')
 or not(p_content->'referenceHash'='null'::jsonb or jsonb_typeof(p_content->'referenceHash')='string' and p_content->>'referenceHash'~'^[0-9a-f]{64}$')
 or p_navigation is distinct from jsonb_build_object('version',1,'stage','consumption_preparation') then raise exception 'invalid consumption preparation' using errcode='22023';end if;
 for f in select * from jsonb_each((p_content->'consumption')-'lines') loop
  if jsonb_typeof(f.value) is distinct from 'string' or private.bal_comment_units(f.value#>>'{}')>(case when f.key='text' then 2000 when f.key='reason' then 1000 else 120 end) then raise exception 'invalid consumption field' using errcode='22023';end if;
 end loop;
 if jsonb_typeof(p_content->'consumption'->'lines') is distinct from 'array' or jsonb_array_length(p_content->'consumption'->'lines')>100 then raise exception 'invalid consumption private lines' using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_content->'consumption'->'lines') loop
  if jsonb_typeof(x) is distinct from 'object' or x-array['productId','name','unit','quantity']<>'{}'::jsonb or not(x ?& array['productId','name','unit','quantity']) then raise exception 'invalid consumption private line' using errcode='22023';end if;
  for f in select * from jsonb_each(x) loop
   if jsonb_typeof(f.value) is distinct from 'string' or private.bal_comment_units(f.value#>>'{}')>(case f.key when 'productId' then 120 when 'quantity' then 64 when 'unit' then 80 else 300 end) then raise exception 'invalid consumption private value' using errcode='22023';end if;
  end loop;
 end loop;
 if (select count(distinct x->>'productId') from jsonb_array_elements(p_content->'consumption'->'lines') x)<>jsonb_array_length(p_content->'consumption'->'lines') then raise exception 'duplicate consumption product' using errcode='22023';end if;
end;$$;

create function private.consumption_preparation_snapshot(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare report jsonb;catalog jsonb;reminder jsonb;location text;ledger text;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 if p_purpose in ('consumption_report_family','consumption_report_team') then location:=case p_purpose when 'consumption_report_family' then 'FAMILY' else 'CARE_TEAM' end;
 else
  report:=public.consumption_report(p_target);
  report:=jsonb_build_object('id',report->'id','version',report->'version','kind',report->'kind','location',report->'location','status',report->'status','body',report->'body','reportedBy',report->'reported_by','reportedName',report->'reported_name','createdAt',report->'created_at','lines',report->'current_lines','lastSupplement',(report->'revisions')->-1);
  location:=report->>'location';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active) order by c.product_id),'[]'::jsonb) into catalog
 from public.care_recipient_products c where c.care_recipient_id=p_patient and (exists(select 1 from jsonb_array_elements(p_fields->'lines') x where x->>'productId'=c.product_id)
 or exists(select 1 from jsonb_array_elements(coalesce(report->'lines','[]'::jsonb)) x where x->>'productId'=c.product_id));
 if nullif(p_fields->>'reminderId','') is not null then
  if p_purpose<>'consumption_report_team' then raise exception 'invalid reminder scope' using errcode='42501';end if;
  reminder:=public.notification_reference(p_patient,(p_fields->>'reminderId')::uuid,'consumption','reminder');
  if reminder->>'kind' is distinct from 'shift_reminder' then raise exception 'invalid reminder reference' using errcode='42501';end if;
 end if;
 if p_purpose='consumption_accept' then
  select encode(extensions.digest(coalesce(jsonb_agg(m.id order by m.id),'[]'::jsonb)::text,'sha256'),'hex') into ledger from public.stock_movements m where m.care_recipient_id=p_patient and (m.source_location=location or m.destination_location=location) and exists(select 1 from jsonb_array_elements(report->'lines') x where x->>'productId'=m.product_id);
 end if;
 return jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'location',location,'report',report,'catalog',catalog,'reminder',reminder,'ledgerHash',ledger);
end;$$;
create function public.consumption_preparation_reference(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;begin
 perform private.validate_consumption_preparation(jsonb_build_object('consumption',p_fields,'reference',null,'referenceHash',null),jsonb_build_object('version',1,'stage','consumption_preparation'),p_purpose);
 s:=private.consumption_preparation_snapshot(p_patient,p_purpose,p_target,p_fields);
 return jsonb_build_object('reference',s,'referenceHash',encode(extensions.digest(s::text,'sha256'),'hex'));
end;$$;
create function private.consumption_preparation_view(d private.consumption_preparations)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',d.id,'ownerId',d.owner_id,'patientId',d.care_recipient_id,'kind','CONSUMPTION','purpose',d.purpose,
 'targetDocumentId',null,'targetResourceId',d.target_resource_id,'schemaVersion',1,'revision',d.revision,'state',d.state,
 'createdAt',d.created_at,'savedAt',d.saved_at,'contentHash',d.content_hash,'content',d.content,
 'navigation',case when d.state='active' then d.navigation end,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result);
$$;

create function public.consumption_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.consumption_preparations;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 select * into d from private.consumption_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed');
 return case when found then private.consumption_preparation_view(d) else null end;
end;$$;

create function public.consumption_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.consumption_preparations;c private.consumption_preparation_commands;h text;a text:=p_body->>'action';result jsonb;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or (p_body-array['action','content','navigation'])<>'{}'::jsonb or a<>'save' and (p_body ? 'content' or p_body ? 'navigation') then raise exception 'invalid consumption preparation command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('consumption-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('consumption-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.consumption_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('consumption-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target,a='save');
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.consumption_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_consumption_preparation(p_body->'content',p_body->'navigation',p_purpose);
  insert into private.consumption_preparations(owner_id,care_recipient_id,purpose,target_resource_id,content,navigation,content_hash)
  values(auth.uid(),p_patient,p_purpose,p_target,p_body->'content',p_body->'navigation',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.consumption_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_consumption_preparation(p_body->'content',p_body->'navigation',p_purpose);
   update private.consumption_preparations set content=p_body->'content',navigation=p_body->'navigation',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.consumption_preparations set content=null,navigation=null,state='discarded',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.consumption_preparations set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('patientId',d.care_recipient_id,'ownerId',d.owner_id,'purpose',d.purpose,'targetResourceId',d.target_resource_id,'id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result,'replayed',false);
 insert into private.consumption_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'consumption_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'revision',d.revision));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target,a='save');
 return result;
end;$$;



create function public.commit_consumption_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.consumption_preparations;c private.consumption_preparation_commands;h text;f jsonb;s jsonb;cmd jsonb;lines jsonb;rid uuid;result jsonb;receipt jsonb;native jsonb;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 if p_id is null or p_expected is null or p_key is null or jsonb_typeof(p_body) is distinct from 'object' or p_body-array['command','referenceHash']<>'{}'::jsonb or not(p_body ?& array['command','referenceHash']) then raise exception 'invalid consumption confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit-consumption-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('consumption-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.consumption_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into d from private.consumption_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision is distinct from p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target,true);
 perform private.validate_consumption_preparation(d.content,d.navigation,d.purpose);f:=d.content->'consumption';
 if p_purpose not in ('consumption_report_family','consumption_report_team') then perform 1 from public.consumption_reports where id=p_target for update;end if;
 perform 1 from public.care_recipient_products cc where cc.care_recipient_id=p_patient and exists(select 1 from jsonb_array_elements(f->'lines') x where x->>'productId'=cc.product_id) order by cc.product_id for share;
 s:=private.consumption_preparation_snapshot(p_patient,p_purpose,p_target,f);
 if d.content->>'referenceHash' is null or d.content->>'referenceHash' is distinct from p_body->>'referenceHash' or d.content->>'referenceHash' is distinct from encode(extensions.digest(s::text,'sha256'),'hex') or d.content->'reference' is distinct from s then raise exception 'stale consumption preparation reference' using errcode='PT409';end if;
 if p_purpose not in ('consumption_report_family','consumption_report_team') and s->'report'->>'status' is distinct from 'reported' then raise exception 'consumption already decided' using errcode='PT409';end if;
 if p_purpose not in ('consumption_report_family','consumption_report_team') and f->>'kind' is distinct from s->'report'->>'kind' then raise exception 'consumption kind mismatch' using errcode='22023';end if;
 if f->>'location' is distinct from s->>'location' then raise exception 'consumption custody mismatch' using errcode='22023';end if;
 if p_purpose in ('consumption_report_family','consumption_report_team','consumption_supplement') then
  if exists(select 1 from jsonb_array_elements(f->'lines') x where not exists(select 1 from jsonb_array_elements(s->'catalog') cc where cc->>'id'=x->>'productId' and cc->>'name'=x->>'name' and cc->>'unit'=x->>'unit')) then raise exception 'consumption material mismatch' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('productId',x->>'productId','unit',x->>'unit','quantity',trim_scale(replace(x->>'quantity',',','.')::numeric)::text) order by ord),'[]'::jsonb) into lines from jsonb_array_elements(f->'lines') with ordinality as line(x,ord);
  if p_purpose='consumption_supplement' then cmd:=jsonb_build_object('action','supplement','id',p_target,'expectedVersion',(s->'report'->>'version')::integer,'text',trim(f->>'text'),'lines',lines,'idempotencyKey',p_key);
  else cmd:=jsonb_build_object('action','report','careRecipientId',p_patient,'kind',f->>'kind','location',s->>'location','text',trim(f->>'text'),'lines',lines,'idempotencyKey',p_key)||case when nullif(f->>'reminderId','') is not null then jsonb_build_object('reminderId',(f->>'reminderId')::uuid) else '{}'::jsonb end;end if;
 else
  if (f->>'kind') is distinct from s->'report'->>'kind' or f->'lines' is distinct from '[]'::jsonb then raise exception 'consumption decision fields mismatch' using errcode='22023';end if;
  cmd:=jsonb_build_object('action','confirm','id',p_target,'expectedVersion',(s->'report'->>'version')::integer,'accept',p_purpose='consumption_accept','idempotencyKey',p_key)||case when p_purpose='consumption_reject' then jsonb_build_object('reason',trim(f->>'reason')) else '{}'::jsonb end;
 end if;
 if cmd is distinct from p_body->'command' then raise exception 'consumption private intent mismatch' using errcode='PT409';end if;
 -- Lock keys used by the existing report/reminder writers before rejecting old native results.
 perform pg_advisory_xact_lock(hashtextextended('d3-notice:'||auth.uid()||':'||p_key,0));
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 if exists(select 1 from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key) or exists(select 1 from public.consumption_report_revisions where actor_id=auth.uid() and idempotency_key=p_key) or exists(select 1 from public.consumption_report_decisions where actor_id=auth.uid() and idempotency_key=p_key) or exists(select 1 from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key) then raise exception 'native consumption key already used' using errcode='23505';end if;
 if cmd->>'action'='report' then
  if cmd ? 'reminderId' then native:=public.report_consumption_from_reminder(p_patient,(cmd->>'reminderId')::uuid,cmd->>'kind',cmd->>'location',cmd->>'text',cmd->'lines',p_key);rid:=(native->>'id')::uuid;
  else rid:=public.report_extraordinary_consumption(p_patient,cmd->>'kind',cmd->>'location',cmd->>'text',cmd->'lines',p_key);end if;
 elsif cmd->>'action'='supplement' then native:=public.supplement_consumption_report(p_target,cmd->>'text',cmd->'lines',p_key,(cmd->>'expectedVersion')::integer);rid:=p_target;
 else native:=public.decide_consumption_report(p_target,(cmd->>'accept')::boolean,cmd->>'reason',p_key,(cmd->>'expectedVersion')::integer);rid:=p_target;end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',rid,'actorId',auth.uid(),'recordedAt',clock_timestamp(),'command',cmd,'referenceHash',d.content->>'referenceHash','preparedConsumption',f,'preparedReference',s,'report',public.consumption_report(rid));
 update private.consumption_preparations set state='consumed',revision=revision+1,content=null,navigation=null,consumed_resource_id=rid,consumed_result=receipt,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',rid,'consumedResult',receipt,'replayed',false);
 insert into private.consumption_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consumed','consumption_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'resourceId',rid));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target,true);
 return result;
end;$$;

revoke all on function private.require_consumption_preparation_scope(uuid,text,uuid,boolean),private.validate_consumption_preparation(jsonb,jsonb,text),private.consumption_preparation_snapshot(uuid,text,uuid,jsonb),private.consumption_preparation_view(private.consumption_preparations) from public,anon,authenticated,service_role;
revoke all on function public.consumption_preparation_context(uuid,text,uuid),public.consumption_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.consumption_preparation_reference(uuid,text,uuid,jsonb),public.commit_consumption_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.consumption_preparation_context(uuid,text,uuid),public.consumption_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.consumption_preparation_reference(uuid,text,uuid,jsonb),public.commit_consumption_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
