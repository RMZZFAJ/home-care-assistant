-- Private BAL preparations use real patient/cycle/assignment/deferral anchors.
-- They never manufacture an operational document or a document version.
create table private.balance_preparations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 purpose text not null check(purpose in ('configure','assign','request_deferral','defer','approve_deferral','reject_deferral')),
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
create unique index balance_preparation_active_slot on private.balance_preparations(owner_id,care_recipient_id,purpose,target_resource_id) where state in ('active','consumed');
create index balance_preparation_patient_fk on private.balance_preparations(care_recipient_id);
create table private.balance_preparation_commands (
 owner_id uuid not null references public.profiles(id), idempotency_key uuid not null,
 preparation_id uuid not null references private.balance_preparations(id),
 intent_hash text not null, result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index balance_preparation_command_fk on private.balance_preparation_commands(preparation_id);
alter table private.balance_preparations enable row level security;
alter table private.balance_preparation_commands enable row level security;
revoke all on private.balance_preparations,private.balance_preparation_commands from public,anon,authenticated,service_role;

create function private.require_balance_preparation_scope(p_patient uuid,p_purpose text,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare a public.bal_assignments;
begin
 perform private.require_cap(p_patient,'bal.read');
 if p_target is null or p_purpose is null or p_purpose not in ('configure','assign','request_deferral','defer','approve_deferral','reject_deferral') then raise exception 'invalid balance preparation scope' using errcode='22023';end if;
 if p_purpose='configure' then
  if p_target<>p_patient then raise exception 'balance preparation unavailable' using errcode='42501';end if;
 elsif p_purpose='assign' then
  if not exists(select 1 from public.bal_cycles where id=p_target and care_recipient_id=p_patient) then raise exception 'balance preparation unavailable' using errcode='42501';end if;
 elsif p_purpose in ('request_deferral','defer') then
  select * into a from public.bal_assignments where id=p_target and care_recipient_id=p_patient;
  if not found then raise exception 'balance preparation unavailable' using errcode='42501';end if;
 else
  if not exists(select 1 from public.bal_deferrals where id=p_target and care_recipient_id=p_patient) then raise exception 'balance preparation unavailable' using errcode='42501';end if;
 end if;
 if not p_write then return;end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient' using errcode='42501';end if;
 if p_purpose in ('configure','assign') then
  if not private.bal_family_authority(p_patient,'bal.schedule.manage') then raise exception 'family balance scheduling authorization required' using errcode='42501';end if;
 elsif p_purpose='request_deferral' then
  if not private.can(p_patient,'bal.defer.request') or (a.professional_id<>auth.uid() and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active' and role='supervisor')) then raise exception 'deferral request authorization required' using errcode='42501';end if;
 else
  if not private.bal_family_authority(p_patient,'bal.defer.approve') then raise exception 'family deferral approval required' using errcode='42501';end if;
 end if;
end;$$;

create function private.balance_preparation_hash(p_workspace jsonb,p_purpose text,p_target uuid)
returns text language sql immutable set search_path='' as $$
 select encode(extensions.digest(jsonb_build_object('purpose',p_purpose,'target',p_target,
  'regime',p_workspace->'regime','enabled',p_workspace->'enabled',
  'types',case when p_purpose='configure' then (select jsonb_object_agg(x->>'id',x) from jsonb_array_elements(p_workspace->'types') x) end,
  'professionals',case when p_purpose='configure' then (select jsonb_object_agg(x->>'id',x) from jsonb_array_elements(p_workspace->'professionals') x) end,
  'targets',case when p_purpose not in ('approve_deferral','reject_deferral') then (select jsonb_object_agg(x->>'id',x) from jsonb_array_elements(p_workspace->'targets') x) end,
  'assignments',case when p_purpose<>'configure' then (select jsonb_object_agg(x->>'id',x) from jsonb_array_elements(p_workspace->'assignments') x where p_purpose='assign' or x->>'id'=p_target::text or x->>'status'='active') end,
  'obligations',case when p_purpose<>'configure' then (select jsonb_object_agg(x->>'id',x) from jsonb_array_elements(p_workspace->'obligations') x where p_purpose<>'assign' or x->>'cycle_id'=p_target::text) end,
  'deferral',case when p_purpose in ('approve_deferral','reject_deferral') then (select x from jsonb_array_elements(p_workspace->'deferrals') x where x->>'id'=p_target::text) end
 )::text,'sha256'),'hex');
$$;

create function private.validate_balance_preparation(p_content jsonb,p_navigation jsonb,p_purpose text)
returns void language plpgsql set search_path='' as $$
declare f record;
begin
 if jsonb_typeof(p_content) is distinct from 'object' or (p_content-array['values','referenceHash','referenceVersion'])<>'{}'::jsonb
  or not(p_content ?& array['values','referenceHash','referenceVersion']) or jsonb_typeof(p_content->'values') is distinct from 'object'
  or ((p_content->'values')-array['reason','enabled','weekday','shiftTypeId','shiftTypeLabel','professionalId','professionalLabel','timezone','startsOn','targetShiftId','targetShiftLabel','targetShiftQuery'])<>'{}'::jsonb
  or not((p_content->'referenceHash')='null'::jsonb or jsonb_typeof(p_content->'referenceHash')='string' and p_content->>'referenceHash'~'^[0-9a-f]{64}$')
  or not((p_content->'referenceVersion')='null'::jsonb or jsonb_typeof(p_content->'referenceVersion')='number' and p_content->>'referenceVersion'~'^[1-9][0-9]{0,9}$' and (p_content->>'referenceVersion')::numeric<=2147483647)
  or p_navigation is distinct from jsonb_build_object('version',1,'stage','bal_'||p_purpose) then raise exception 'invalid balance preparation content' using errcode='22023';end if;
 for f in select * from jsonb_each(p_content->'values') loop
  if jsonb_typeof(f.value)<>'string' or private.bal_comment_units(f.value#>>'{}')>3000 then raise exception 'invalid balance preparation field' using errcode='22023';end if;
 end loop;
end;$$;

create function private.balance_preparation_view(d private.balance_preparations)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',d.id,'ownerId',d.owner_id,'patientId',d.care_recipient_id,'kind','BAL','purpose',d.purpose,
 'targetDocumentId',null,'targetResourceId',d.target_resource_id,'schemaVersion',1,'revision',d.revision,'state',d.state,
 'createdAt',d.created_at,'savedAt',d.saved_at,'contentHash',d.content_hash,'content',d.content,
 'navigation',case when d.state='active' then d.navigation end,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result);
$$;

create function private.balance_preparation_workspace(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w jsonb;target jsonb;begin
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 w:=public.balance_workspace(p_patient);
 if p_purpose in ('approve_deferral','reject_deferral') then
  select to_jsonb(d)||jsonb_build_object('decisionContext',private.bal_deferral_context(d.id)) into target from public.bal_deferrals d where d.id=p_target and d.care_recipient_id=p_patient;
  w:=jsonb_set(w,'{deferrals}',coalesce((select jsonb_agg(x) from jsonb_array_elements(w->'deferrals') x where x->>'id'<>p_target::text),'[]'::jsonb)||jsonb_build_array(target));
 elsif p_purpose in ('request_deferral','defer') then
  select to_jsonb(a) into target from public.bal_assignments a where a.id=p_target and a.care_recipient_id=p_patient;
  w:=jsonb_set(w,'{assignments}',coalesce((select jsonb_agg(x) from jsonb_array_elements(w->'assignments') x where x->>'id'<>p_target::text),'[]'::jsonb)||jsonb_build_array(target));
 elsif p_purpose='assign' then
  w:=jsonb_set(w,'{obligations}',coalesce((select jsonb_agg(x) from jsonb_array_elements(w->'obligations') x where x->>'cycle_id'<>p_target::text),'[]'::jsonb)||coalesce((select jsonb_agg(to_jsonb(o) order by o.id) from public.bal_obligations o where o.cycle_id=p_target and o.care_recipient_id=p_patient),'[]'::jsonb));
 end if;
 return w;
end;$$;
revoke all on function private.balance_preparation_workspace(uuid,text,uuid) from public,anon,authenticated,service_role;

create function public.balance_preparation_reference(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w jsonb;begin
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 w:=private.balance_preparation_workspace(p_patient,p_purpose,p_target);
 return jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'workspace',w,'referenceHash',private.balance_preparation_hash(w,p_purpose,p_target));
end;$$;

create function public.balance_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.balance_preparations;begin
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 select * into d from private.balance_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed');
 return case when found then private.balance_preparation_view(d) else null end;
end;$$;

create function public.balance_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.balance_preparations;c private.balance_preparation_commands;h text;a text:=p_body->>'action';result jsonb;begin
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or (p_body-array['action','content','navigation'])<>'{}'::jsonb or a<>'save' and (p_body ? 'content' or p_body ? 'navigation') then raise exception 'invalid balance preparation command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('balance-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('balance-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.balance_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('balance-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target,a='save');
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.balance_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_balance_preparation(p_body->'content',p_body->'navigation',p_purpose);
  insert into private.balance_preparations(owner_id,care_recipient_id,purpose,target_resource_id,content,navigation,content_hash)
  values(auth.uid(),p_patient,p_purpose,p_target,p_body->'content',p_body->'navigation',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.balance_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_balance_preparation(p_body->'content',p_body->'navigation',p_purpose);
   update private.balance_preparations set content=p_body->'content',navigation=p_body->'navigation',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.balance_preparations set content=null,navigation=null,state='discarded',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.balance_preparations set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('patientId',d.care_recipient_id,'ownerId',d.owner_id,'purpose',d.purpose,'targetResourceId',d.target_resource_id,'id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result,'replayed',false);
 insert into private.balance_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'balance_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'revision',d.revision));
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target,a='save');
 return result;
end;$$;

create function public.commit_balance_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.balance_preparations;c private.balance_preparation_commands;h text;after_hash text;f jsonb;command jsonb;b jsonb;v integer;native jsonb;receipt jsonb;result jsonb;resource uuid;reason text;
begin
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 if p_key is null or p_id is null or p_expected is null or jsonb_typeof(p_body) is distinct from 'object' or (p_body-array['command','referenceHash','expectedVersion'])<>'{}'::jsonb or not(p_body ?& array['command','referenceHash','expectedVersion']) then raise exception 'invalid balance preparation confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit-balance-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('balance-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.balance_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 select * into d from private.balance_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision<>p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target,true);
 perform private.validate_balance_preparation(d.content,d.navigation,d.purpose);
 if d.content->>'referenceHash' is null or d.content->>'referenceHash' is distinct from p_body->>'referenceHash' or d.content->'referenceVersion' is distinct from p_body->'expectedVersion' or d.content->>'referenceHash' is distinct from private.balance_preparation_hash(private.balance_preparation_workspace(p_patient,p_purpose,p_target),p_purpose,p_target) then raise exception 'stale document balance preparation reference' using errcode='PT409';end if;
 f:=d.content->'values';v:=(d.content->>'referenceVersion')::integer;
 reason:=btrim(coalesce(f->>'reason',''),U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
 if private.bal_comment_units(reason) not between 3 and 1000 then raise exception 'invalid balance preparation reason' using errcode='22023';end if;
 if p_purpose='configure' then
  if f->>'enabled' not in ('true','false') or f->>'weekday' !~ '^[0-6]$' then raise exception 'invalid balance preparation configuration' using errcode='22023';end if;
  b:=jsonb_build_object('enabled',(f->>'enabled')::boolean,'weekday',(f->>'weekday')::integer,'timezone',f->>'timezone','shiftTypeId',(f->>'shiftTypeId')::uuid,'professionalId',nullif(f->>'professionalId','')::uuid,'startsOn',f->>'startsOn','reason',reason);
  command:=jsonb_build_object('action','configure','body',b);
 elsif p_purpose='assign' then
  b:=jsonb_build_object('cycleId',p_target,'targetShiftId',(f->>'targetShiftId')::uuid,'reason',reason);
  command:=jsonb_build_object('action','assign','body',b);
 elsif p_purpose in ('request_deferral','defer') then
  b:=jsonb_build_object('assignmentId',p_target,'targetShiftId',(f->>'targetShiftId')::uuid,'reason',reason);
  command:=jsonb_build_object('action',p_purpose,'body',b);
 else
  b:=jsonb_build_object('id',p_target,'approve',p_purpose='approve_deferral','reason',reason);
  command:=jsonb_build_object('action','decide_deferral','body',b);
 end if;
 if command is distinct from p_body->'command' then raise exception 'balance preparation confirmation mismatch' using errcode='23505';end if;
 if exists(select 1 from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key) then raise exception 'native balance idempotency key already belongs to another entrypoint' using errcode='23505';end if;
 if p_purpose='assign' then native:=public.resolve_balance_assignment(p_patient,p_target,(b->>'targetShiftId')::uuid,reason,p_key);
 else native:=public.balance_command(p_patient,command->>'action',b,p_key,v);end if;
 resource:=case when p_purpose='configure' then p_patient when p_purpose='assign' then (native->>'assignmentId')::uuid else (native->>'id')::uuid end;
 if resource is null then raise exception 'balance command did not confirm resource';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',resource,'actorId',auth.uid(),'recordedAt',clock_timestamp(),'command',command,'expectedVersion',v,'referenceHash',p_body->>'referenceHash','nativeResult',native,'preparedValues',d.content->'values');
 after_hash:=private.balance_preparation_hash(private.balance_preparation_workspace(p_patient,p_purpose,p_target),p_purpose,p_target);
 update private.balance_preparations set content=null,navigation=null,state='consumed',consumed_resource_id=resource,consumed_result=receipt,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('patientId',d.care_recipient_id,'ownerId',d.owner_id,'purpose',d.purpose,'targetResourceId',d.target_resource_id,'id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',resource,'consumedResult',receipt,'replayed',false);
 insert into private.balance_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_balance_preparation_scope(p_patient,p_purpose,p_target,true);
 if after_hash is distinct from private.balance_preparation_hash(private.balance_preparation_workspace(p_patient,p_purpose,p_target),p_purpose,p_target) then raise exception 'balance reference changed during private confirmation' using errcode='PT409';end if;
 return result;
end;$$;

revoke all on function private.require_balance_preparation_scope(uuid,text,uuid,boolean),private.balance_preparation_hash(jsonb,text,uuid),private.validate_balance_preparation(jsonb,jsonb,text),private.balance_preparation_view(private.balance_preparations) from public,anon,authenticated,service_role;
revoke all on function public.balance_preparation_reference(uuid,text,uuid),public.balance_preparation_context(uuid,text,uuid),public.balance_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_balance_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.balance_preparation_reference(uuid,text,uuid),public.balance_preparation_context(uuid,text,uuid),public.balance_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_balance_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) to authenticated;

create function public.balance_preparation_list(p_patient uuid,p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform private.require_cap(p_patient,'bal.read');
 if (p_before is null)<>(p_before_id is null) or p_limit is null or p_limit not between 1 and 50 then raise exception 'invalid balance preparation page' using errcode='22023';end if;
 select jsonb_build_object('total',(select count(*) from private.balance_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and state in ('active','consumed')),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'purpose',purpose,'targetResourceId',target_resource_id,'state',state,'createdAt',created_at,'savedAt',saved_at) order by created_at desc,id desc)
 from (select * from private.balance_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and state in ('active','consumed') and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit p_limit) d),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.balance_preparation_list(uuid,timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.balance_preparation_list(uuid,timestamptz,uuid,integer) to authenticated;
