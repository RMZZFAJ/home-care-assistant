-- Private owner review of Flow suggestions;no provider activation or physical stock command.
create table private.flow_preparations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 purpose text not null check(purpose in ('flow_review')),
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
create unique index flow_preparation_active_slot on private.flow_preparations(owner_id,care_recipient_id,purpose,target_resource_id) where state in ('active','consumed');
create index flow_preparation_patient_fk on private.flow_preparations(care_recipient_id);
create table private.flow_preparation_commands (
 owner_id uuid not null references public.profiles(id), idempotency_key uuid not null,
 preparation_id uuid not null references private.flow_preparations(id),
 intent_hash text not null, result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index flow_preparation_command_fk on private.flow_preparation_commands(preparation_id);
alter table private.flow_preparations enable row level security;
alter table private.flow_preparation_commands enable row level security;
revoke all on private.flow_preparations,private.flow_preparation_commands from public,anon,authenticated,service_role;



create function private.require_flow_preparation_scope(p_patient uuid,p_purpose text,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_purpose is distinct from 'flow_review' or auth.uid() is null or not public.can_access_recipient(p_patient)
 or not exists(select 1 from public.flow_submissions s where s.id=p_target and s.care_recipient_id=p_patient and s.user_id=auth.uid()) then raise exception 'own flow scope required' using errcode='42501';end if;
 if p_write then perform private.require_cap(p_patient,'consumption.report');end if;
end;$$;
create function private.validate_flow_preparation(p_content jsonb,p_navigation jsonb,p_purpose text)
returns void language plpgsql immutable set search_path='' as $$
declare f jsonb;item jsonb;begin
 if p_purpose is distinct from 'flow_review' or jsonb_typeof(p_content) is distinct from 'object'
 or not(p_content ?& array['review','reference','referenceHash']) or p_content-array['review','reference','referenceHash']<>'{}'::jsonb
 or p_navigation is distinct from '{"version":1,"stage":"flow_review"}'::jsonb then raise exception 'invalid flow preparation' using errcode='22023';end if;
 f:=p_content->'review';
 if jsonb_typeof(f) is distinct from 'object' or not(f ?& array['accept','kind','text','lines']) or f-array['accept','kind','text','lines']<>'{}'::jsonb
 or jsonb_typeof(f->'accept') is distinct from 'boolean' or jsonb_typeof(f->'kind') is distinct from 'string' or f->>'kind' not in ('','consumption','shortage')
 or jsonb_typeof(f->'text') is distinct from 'string' or private.bal_comment_units(f->>'text')>2000
 or jsonb_typeof(f->'lines') is distinct from 'array' or jsonb_array_length(f->'lines')>100 then raise exception 'invalid flow fields' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(f->'lines') loop
  if jsonb_typeof(item) is distinct from 'object' or not(item ?& array['productId','name','unit','quantity']) or item-array['productId','name','unit','quantity']<>'{}'::jsonb
  or jsonb_typeof(item->'productId') is distinct from 'string' or private.bal_comment_units(item->>'productId') not between 1 and 120
  or jsonb_typeof(item->'name') is distinct from 'string' or private.bal_comment_units(item->>'name')>300
  or jsonb_typeof(item->'unit') is distinct from 'string' or private.bal_comment_units(item->>'unit')>80
  or jsonb_typeof(item->'quantity') is distinct from 'string' or private.bal_comment_units(item->>'quantity')>64 then raise exception 'invalid flow line' using errcode='22023';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(f->'lines') as lines(line) group by line->>'productId' having count(*)>1)
 or (p_content->'reference'='null'::jsonb) is distinct from (p_content->'referenceHash'='null'::jsonb)
 or (p_content->'reference'<>'null'::jsonb and (jsonb_typeof(p_content->'reference') is distinct from 'object' or jsonb_typeof(p_content->'referenceHash') is distinct from 'string' or p_content->>'referenceHash'!~'^[0-9a-f]{64}$')) then raise exception 'invalid flow reference' using errcode='22023';end if;
end;$$;
create function private.flow_preparation_snapshot(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare suggestion jsonb;catalog jsonb;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 select jsonb_build_object('id',s.id,'ownerId',s.user_id,'status',s.status,'body',s.body,'createdAt',s.created_at,'reportId',s.report_id,'reviewedAt',s.reviewed_at) into suggestion from public.flow_submissions s where s.id=p_target;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active) order by c.product_id),'[]'::jsonb) into catalog from public.care_recipient_products c where c.care_recipient_id=p_patient and exists(select 1 from jsonb_array_elements(p_fields->'lines') as lines(line) where line->>'productId'=c.product_id);
 return jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'suggestion',suggestion,'catalog',catalog);
end;$$;
create function public.flow_preparation_reference(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,true);
 perform private.validate_flow_preparation(jsonb_build_object('review',p_fields,'reference',null,'referenceHash',null),'{"version":1,"stage":"flow_review"}',p_purpose);
 if (p_fields->>'accept')::boolean then perform private.require_consumption_read(p_patient,'CARE_TEAM');end if;
 s:=private.flow_preparation_snapshot(p_patient,p_purpose,p_target,p_fields);
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,true);
 return jsonb_build_object('reference',s,'referenceHash',encode(extensions.digest(s::text,'sha256'),'hex'));
end;$$;
create function private.flow_preparation_view(d private.flow_preparations)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',d.id,'ownerId',d.owner_id,'patientId',d.care_recipient_id,'kind','FLOW','purpose',d.purpose,
 'targetDocumentId',null,'targetResourceId',d.target_resource_id,'schemaVersion',1,'revision',d.revision,'state',d.state,
 'createdAt',d.created_at,'savedAt',d.saved_at,'contentHash',d.content_hash,'content',d.content,
 'navigation',case when d.state='active' then d.navigation end,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result);
$$;

create function public.flow_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.flow_preparations;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 select * into d from private.flow_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed');
 return case when found then private.flow_preparation_view(d) else null end;
end;$$;

create function public.flow_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.flow_preparations;c private.flow_preparation_commands;h text;a text:=p_body->>'action';result jsonb;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or (p_body-array['action','content','navigation'])<>'{}'::jsonb or a<>'save' and (p_body ? 'content' or p_body ? 'navigation') then raise exception 'invalid consumption preparation command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('flow-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('flow-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.flow_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('flow-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,a='save');
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.flow_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_flow_preparation(p_body->'content',p_body->'navigation',p_purpose);
  insert into private.flow_preparations(owner_id,care_recipient_id,purpose,target_resource_id,content,navigation,content_hash)
  values(auth.uid(),p_patient,p_purpose,p_target,p_body->'content',p_body->'navigation',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.flow_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_flow_preparation(p_body->'content',p_body->'navigation',p_purpose);
   update private.flow_preparations set content=p_body->'content',navigation=p_body->'navigation',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.flow_preparations set content=null,navigation=null,state='discarded',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.flow_preparations set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('patientId',d.care_recipient_id,'ownerId',d.owner_id,'purpose',d.purpose,'targetResourceId',d.target_resource_id,'id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result,'replayed',false);
 insert into private.flow_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'flow_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'revision',d.revision));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,a='save');
 return result;
end;$$;



create function public.commit_flow_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.flow_preparations;c private.flow_preparation_commands;h text;f jsonb;s jsonb;lines jsonb;cmd jsonb;native jsonb;receipt jsonb;result jsonb;r public.consumption_reports;expected_status text;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 if p_id is null or p_expected is null or p_key is null or jsonb_typeof(p_body) is distinct from 'object' or not(p_body ?& array['command','referenceHash']) or p_body-array['command','referenceHash']<>'{}'::jsonb then raise exception 'invalid flow confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('flow-confirmation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('flow-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.flow_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('flow-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 select * into d from private.flow_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision is distinct from p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 -- Native review locks the Flow row before creating its report. Preserve that order.
 perform 1 from public.flow_submissions where id=p_target for update;
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,true);
 perform private.validate_flow_preparation(d.content,d.navigation,d.purpose);f:=d.content->'review';
 perform 1 from public.care_recipient_products cp where cp.care_recipient_id=p_patient and exists(select 1 from jsonb_array_elements(f->'lines') as items(line) where line->>'productId'=cp.product_id) order by cp.product_id for share;
 s:=private.flow_preparation_snapshot(p_patient,p_purpose,p_target,f);
 if d.content->>'referenceHash' is null or d.content->>'referenceHash' is distinct from p_body->>'referenceHash' or d.content->>'referenceHash' is distinct from encode(extensions.digest(s::text,'sha256'),'hex') or d.content->'reference' is distinct from s then raise exception 'stale flow reference' using errcode='PT409';end if;
 if s->'suggestion'->>'status' is distinct from 'pending_confirmation' then raise exception 'flow already reviewed' using errcode='PT409';end if;
 if (f->>'accept')::boolean then
  perform private.require_consumption_read(p_patient,'CARE_TEAM');
  if f->>'kind' not in ('consumption','shortage') or private.bal_comment_units(btrim(f->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))<3 then raise exception 'flow review incomplete' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(f->'lines') as items(line) where line->>'quantity'!~'^[0-9]+([.,][0-9]+)?$' or not exists(select 1 from jsonb_array_elements(s->'catalog') as catalogs(cat) where cat->>'id'=line->>'productId' and cat->>'name'=line->>'name' and cat->>'unit'=line->>'unit')) then raise exception 'invalid flow material' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('productId',line->>'productId','quantity',trim_scale(replace(line->>'quantity',',','.')::numeric)::text) order by ord),'[]'::jsonb) into lines from jsonb_array_elements(f->'lines') with ordinality as items(line,ord);
  cmd:=jsonb_build_object('id',p_target,'accept',true,'kind',f->>'kind','text',btrim(f->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'),'lines',lines);
 else cmd:=jsonb_build_object('id',p_target,'accept',false,'kind','shortage','text','Sugestão descartada pelo próprio autor','lines','[]'::jsonb);end if;
 if cmd is distinct from p_body->'command' then raise exception 'flow private intent mismatch' using errcode='PT409';end if;
 -- The native key is the suggestion UUID,not the private command UUID.
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_target,0));
 if exists(select 1 from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_target) then raise exception 'native flow report key already used' using errcode='23505';end if;
 native:=public.review_flow_submission(p_target,(cmd->>'accept')::boolean,cmd->>'kind',cmd->>'text',cmd->'lines');
 expected_status:=case when (cmd->>'accept')::boolean then 'confirmed' else 'rejected' end;
 if native->>'status' is distinct from expected_status then raise exception 'native flow result mismatch' using errcode='PT409';end if;
 if expected_status='confirmed' then
  select * into r from public.consumption_reports where id=(native->>'reportId')::uuid;
  if not found or r.care_recipient_id is distinct from p_patient or r.reported_by is distinct from auth.uid() or r.idempotency_key is distinct from p_target or r.kind is distinct from cmd->>'kind' or r.location is distinct from 'CARE_TEAM' or r.body is distinct from cmd->>'text' then raise exception 'native flow report mismatch' using errcode='PT409';end if;
 elsif native->'reportId' is distinct from 'null'::jsonb then raise exception 'native flow rejection mismatch' using errcode='PT409';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',p_target,'actorId',auth.uid(),'recordedAt',clock_timestamp(),'command',cmd,'referenceHash',d.content->>'referenceHash','preparedReview',f,'preparedReference',s,'nativeResult',native);
 update private.flow_preparations set state='consumed',revision=revision+1,content=null,navigation=null,consumed_resource_id=p_target,consumed_result=receipt,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',p_target,'consumedResult',receipt,'replayed',false);
 insert into private.flow_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consumed','flow_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'resourceId',p_target));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,true);
 return result;
end;$$;
create function public.flow_preparation_list(p_patient uuid,p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rows jsonb;begin
 if auth.uid() is null or not public.can_access_recipient(p_patient) then raise exception 'patient access required' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null) then raise exception 'invalid private flow cursor' using errcode='22023';end if;
 select coalesce(jsonb_agg(row order by saved_at desc,id desc),'[]'::jsonb) into rows from (select jsonb_build_object('id',d.id,'targetResourceId',d.target_resource_id,'revision',d.revision,'state',d.state,'savedAt',d.saved_at) as row,d.saved_at,d.id from private.flow_preparations d where d.owner_id=auth.uid() and d.care_recipient_id=p_patient and d.state in ('active','consumed') and (p_before is null or (d.saved_at,d.id)<(p_before,p_before_id)) order by d.saved_at desc,d.id desc limit p_limit+1) q;
 return jsonb_build_object('data',case when jsonb_array_length(rows)>p_limit then rows-p_limit else rows end,'next',case when jsonb_array_length(rows)>p_limit then jsonb_build_object('at',rows->(p_limit-1)->>'savedAt','id',rows->(p_limit-1)->>'id') else null end);
end;$$;

revoke all on function private.require_flow_preparation_scope(uuid,text,uuid,boolean),private.validate_flow_preparation(jsonb,jsonb,text),private.flow_preparation_snapshot(uuid,text,uuid,jsonb),private.flow_preparation_view(private.flow_preparations),public.flow_preparation_context(uuid,text,uuid),public.flow_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.flow_preparation_reference(uuid,text,uuid,jsonb),public.commit_flow_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),public.flow_preparation_list(uuid,timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.flow_preparation_context(uuid,text,uuid),public.flow_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.flow_preparation_reference(uuid,text,uuid,jsonb),public.commit_flow_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),public.flow_preparation_list(uuid,timestamptz,uuid,integer) to authenticated;
notify pgrst,'reload schema';
