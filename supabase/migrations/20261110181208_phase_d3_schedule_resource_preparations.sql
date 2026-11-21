-- Existing schedule resources have real foreign-key anchors. Saving is private;
-- only the native command can alter a type, series, shift or proposal.
create table private.schedule_resource_preparations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 purpose text not null check(purpose in ('shift_type_edit','schedule_series_end','schedule_series_approve','schedule_series_reject','schedule_shift_edit','schedule_change_approve','schedule_change_reject','schedule_change_close')),
 target_type_id uuid references public.shift_types(id),target_series_id uuid references public.shift_series(id),
 target_shift_id uuid references public.scheduled_shifts(id),target_change_id uuid references public.shift_change_requests(id),
 target_resource_id uuid generated always as (coalesce(target_type_id,target_series_id,target_shift_id,target_change_id)) stored,
 revision integer not null default 1 check(revision>0),state text not null default 'active' check(state in ('active','discarded','consumed','completed')),
 content jsonb,content_hash text not null,navigation jsonb,reference_snapshot jsonb,
 created_at timestamptz not null default clock_timestamp(),saved_at timestamptz not null default clock_timestamp(),
 consumed_change_id uuid references public.shift_change_requests(id),consumed_resource_id uuid,consumed_result jsonb,
 check(num_nonnulls(target_type_id,target_series_id,target_shift_id,target_change_id)=1),
 check((target_type_id is not null)=(purpose='shift_type_edit')),
 check((target_series_id is not null)=(purpose in ('schedule_series_end','schedule_series_approve','schedule_series_reject'))),
 check((target_shift_id is not null)=(purpose='schedule_shift_edit')),
 check((target_change_id is not null)=(purpose in ('schedule_change_approve','schedule_change_reject','schedule_change_close'))),
 check((state='active')=(content is not null)),check((state in ('consumed','completed'))=(consumed_result is not null)),
 check((state in ('consumed','completed'))=(consumed_resource_id is not null)),
 check(consumed_resource_id is null or consumed_resource_id=coalesce(consumed_change_id,target_resource_id)),
 check(consumed_change_id is null or purpose='schedule_shift_edit')
);
create unique index schedule_resource_preparation_slot on private.schedule_resource_preparations(owner_id,care_recipient_id,purpose,target_resource_id) where state in ('active','consumed');
create index schedule_resource_preparation_owner_cursor on private.schedule_resource_preparations(owner_id,care_recipient_id,saved_at desc,id desc);
create index schedule_resource_preparation_patient_fk on private.schedule_resource_preparations(care_recipient_id);
create index schedule_resource_preparation_type_fk on private.schedule_resource_preparations(target_type_id);
create index schedule_resource_preparation_series_fk on private.schedule_resource_preparations(target_series_id);
create index schedule_resource_preparation_shift_fk on private.schedule_resource_preparations(target_shift_id);
create index schedule_resource_preparation_change_fk on private.schedule_resource_preparations(target_change_id);
create index schedule_resource_preparation_consumed_change_fk on private.schedule_resource_preparations(consumed_change_id);
create table private.schedule_resource_preparation_commands (
 owner_id uuid not null references public.profiles(id),idempotency_key uuid not null,
 preparation_id uuid not null references private.schedule_resource_preparations(id),intent_hash text not null,result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index schedule_resource_preparation_command_fk on private.schedule_resource_preparation_commands(preparation_id);
alter table private.schedule_resource_preparations enable row level security;
alter table private.schedule_resource_preparation_commands enable row level security;
revoke all on private.schedule_resource_preparations,private.schedule_resource_preparation_commands from public,anon,authenticated,service_role;

create function private.require_schedule_resource_scope(p_patient uuid,p_purpose text,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare worker uuid;
begin
 if p_target is null or p_purpose is null or p_purpose not in ('shift_type_edit','schedule_series_end','schedule_series_approve','schedule_series_reject','schedule_shift_edit','schedule_change_approve','schedule_change_reject','schedule_change_close') then raise exception 'invalid schedule preparation scope' using errcode='22023';end if;
 if private.auth_session() is null or not public.can_access_recipient(p_patient) then raise exception 'schedule preparation unavailable' using errcode='42501';end if;
 -- Recovery of one's own fields does not require operational read/write grants.
 if not p_write then return;end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if p_purpose='shift_type_edit' then
  perform private.require_cap(p_patient,'schedule.types.manage');
  if not exists(select 1 from public.shift_types where id=p_target and care_recipient_id=p_patient) then raise exception 'schedule preparation unavailable' using errcode='42501';end if;
 elsif p_purpose in ('schedule_series_end','schedule_series_approve','schedule_series_reject') then
  select professional_id into worker from public.shift_series where id=p_target and care_recipient_id=p_patient;
  if not found then raise exception 'schedule preparation unavailable' using errcode='42501';end if;
  perform private.require_schedule_management(p_patient,worker);
 elsif p_purpose='schedule_shift_edit' then
  select professional_id into worker from public.scheduled_shifts where id=p_target and care_recipient_id=p_patient;
  if not found or not(private.can(p_patient,'schedule.manage.team') or worker=auth.uid() and private.can(p_patient,'schedule.manage.own') or private.can(p_patient,'schedule.propose') and (worker=auth.uid() or private.can(p_patient,'schedule.read.team'))) then raise exception 'schedule authorization required' using errcode='42501';end if;
 else
  perform private.require_cap(p_patient,'schedule.manage.team');
  if not exists(select 1 from public.shift_change_requests where id=p_target and care_recipient_id=p_patient) then raise exception 'schedule preparation unavailable' using errcode='42501';end if;
 end if;
end;$$;

create function private.schedule_resource_source(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w jsonb:=jsonb_build_object('types','[]'::jsonb,'series','[]'::jsonb,'shifts','[]'::jsonb,'changes','[]'::jsonb,'professionals','[]'::jsonb,'events','[]'::jsonb);target jsonb;choices jsonb:='[]'::jsonb;v integer;source_version integer;h text;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if not(private.can(p_patient,'schedule.read.team') or private.can(p_patient,'schedule.read.own')) then raise exception 'schedule reference unavailable' using errcode='42501';end if;
 if p_purpose='shift_type_edit' then
  select to_jsonb(t) into target from public.shift_types t where t.id=p_target and t.care_recipient_id=p_patient;
  if target is not null then w:=jsonb_set(w,'{types}',jsonb_build_array(target));end if;
 elsif p_purpose in ('schedule_series_end','schedule_series_approve','schedule_series_reject') then
  select to_jsonb(ser)||jsonb_build_object(
   'publication_blocked',ser.ended_on is not null or not private.schedule_worker(p_patient,ser.professional_id),
   'professional_name',(select full_name from public.profiles where id=ser.professional_id),
   'type_name',(select name from public.shift_types where id=ser.shift_type_id),
   'occurrences',coalesce((select jsonb_agg(private.schedule_shift_snapshot(occurrence) order by occurrence.starts_at,occurrence.id) from public.scheduled_shifts occurrence where occurrence.series_id=ser.id),'[]'))
   into target from public.shift_series ser where ser.id=p_target and ser.care_recipient_id=p_patient and private.schedule_visible(p_patient,ser.professional_id);
  if target is not null then w:=jsonb_set(w,'{series}',jsonb_build_array(target));end if;
 elsif p_purpose='schedule_shift_edit' then
  select private.schedule_shift_snapshot(s) into target from public.scheduled_shifts s where s.id=p_target and s.care_recipient_id=p_patient and private.schedule_visible(p_patient,s.professional_id);
  if target is not null then w:=jsonb_set(w,'{shifts}',jsonb_build_array(target));end if;
  -- Membership is necessary for the native schedule_worker predicate. Start
  -- there instead of evaluating every profile in the retained test directory.
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name) order by p.full_name),'[]') into choices
   from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
   where m.care_recipient_id=p_patient and m.status='active' and private.schedule_worker(p_patient,p.id)
   and (private.can(p_patient,'schedule.read.team') or private.can(p_patient,'schedule.propose') or p.id=auth.uid());
 else
  -- Use the native visibility and snapshot facts for a directly addressed
  -- historical proposal as well as for pending operational work.
  select to_jsonb(c)||jsonb_build_object(
   'is_stale',s.version<>c.shift_version or s.status<>'published' or ser.ended_on is not null and (s.starts_at at time zone s.timezone)::date>=ser.ended_on or not private.schedule_worker(p_patient,c.proposed_professional_id),
   'current_professional_name',(select full_name from public.profiles where id=c.professional_id),
   'current_proposed_professional_name',(select full_name from public.profiles where id=c.proposed_professional_id),
   'bal_impact',jsonb_build_object('has_assignment',exists(select 1 from public.bal_assignments a where a.shift_id=s.id and a.status='active'),
    'changes_window',s.starts_at<>c.starts_at or s.ends_at<>c.ends_at,
    'requires_family_decision',exists(select 1 from public.bal_assignments a where a.shift_id=s.id and a.status='active' and a.ends_at>now()) and (s.starts_at<>c.starts_at or s.ends_at<>c.ends_at),
    'assignment_deadline',(select max(a.ends_at) from public.bal_assignments a where a.shift_id=s.id and a.status='active')))
   into target from public.shift_change_requests c join public.scheduled_shifts s on s.id=c.shift_id and s.care_recipient_id=c.care_recipient_id join public.shift_series ser on ser.id=s.series_id and ser.care_recipient_id=c.care_recipient_id
   where c.id=p_target and c.care_recipient_id=p_patient and private.schedule_visible(p_patient,c.professional_id);
  select version into source_version from public.scheduled_shifts where id=(target->>'shift_id')::uuid and care_recipient_id=p_patient;
  if target is not null then w:=jsonb_set(w,'{changes}',jsonb_build_array(target));end if;
 end if;
 if target is null then raise exception 'schedule reference unavailable' using errcode='42501';end if;
 v:=(target->>'version')::integer;
 h:=encode(extensions.digest(jsonb_build_array(p_patient,p_purpose,p_target,source_version,w)::text,'sha256'),'hex');
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 return jsonb_build_object('reference',jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'hash',h,'version',v,'sourceVersion',source_version,'workspace',w),'professionals',choices);
end;$$;

create function public.schedule_resource_preparation_reference(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language sql security definer set search_path='' as $$select private.schedule_resource_source(p_patient,p_purpose,p_target);$$;

create function private.validate_schedule_resource_fields(p_purpose text,p_content jsonb,p_navigation jsonb)
returns void language plpgsql set search_path='' as $$
declare f jsonb:=p_content->'scheduleAction';r record;expected text[];form text:=f->>'form';op text:=f->>'operation';max_units integer;
begin
 if jsonb_typeof(p_content) is distinct from 'object' or (p_content-array['scheduleAction','referenceHash','referenceVersion'])<>'{}' or not(p_content ?& array['scheduleAction','referenceHash','referenceVersion'])
  or jsonb_typeof(f) is distinct from 'object' or p_navigation is distinct from jsonb_build_object('version',1,'stage','schedule_resource') then raise exception 'invalid schedule preparation content' using errcode='22023';end if;
 if not((p_content->'referenceHash')='null'::jsonb or jsonb_typeof(p_content->'referenceHash')='string' and p_content->>'referenceHash'~'^[0-9a-f]{64}$')
  or not((p_content->'referenceVersion')='null'::jsonb or jsonb_typeof(p_content->'referenceVersion')='number' and p_content->>'referenceVersion'~'^[1-9][0-9]{0,9}$' and (p_content->>'referenceVersion')::numeric<=2147483647)
  or ((p_content->'referenceHash')='null'::jsonb) is distinct from ((p_content->'referenceVersion')='null'::jsonb) then raise exception 'invalid schedule reference' using errcode='22023';end if;
 if p_purpose='shift_type_edit' and form='type' then expected:=array['form','name','start','duration','active'];
 elsif p_purpose in ('schedule_series_end','schedule_series_approve','schedule_series_reject') and form='series' and op=(case p_purpose when 'schedule_series_end' then 'end_series' when 'schedule_series_approve' then 'approve' else 'reject' end) then expected:=array['form','operation','from','reason'];
 elsif p_purpose='schedule_shift_edit' and form='shift' and op in ('change','propose_change','cancel') then expected:=array['form','operation','professionalId','start','end','notes','reason'];
 elsif p_purpose in ('schedule_change_approve','schedule_change_reject','schedule_change_close') and form='decision' and op=(case p_purpose when 'schedule_change_approve' then 'approve' when 'schedule_change_reject' then 'reject' else 'close' end) then expected:=array['form','operation','reason'];
 else raise exception 'invalid schedule preparation purpose' using errcode='22023';end if;
 if (f-expected)<>'{}' or not(f ?& expected) then raise exception 'invalid schedule preparation fields' using errcode='22023';end if;
 for r in select * from jsonb_each(f) loop
  if r.key='active' then if jsonb_typeof(r.value)<>'boolean' then raise exception 'invalid schedule preparation flag' using errcode='22023';end if;continue;end if;
  max_units:=case r.key when 'name' then 100 when 'duration' then 32 when 'notes' then 2000 when 'reason' then 1000 when 'start' then case when form='type' then 8 else 16 end when 'end' then 16 else 40 end;
  if jsonb_typeof(r.value)<>'string' or private.bal_comment_units(r.value#>>'{}')>max_units then raise exception 'invalid schedule preparation field' using errcode='22023';end if;
 end loop;
 if form='type' and (f->>'start'!~'^(|([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?)$' or f->>'duration'!~'^(|-?([0-9]+(\.[0-9]+)?|\.[0-9]+)([eE][+-]?[0-9]+)?)$') then raise exception 'invalid schedule type fields' using errcode='22023';end if;
 if form='series' and f->>'from'<>'' then perform (f->>'from')::date;end if;
 if form='shift' then
  if f->>'professionalId'<>'' then perform (f->>'professionalId')::uuid;end if;
  if f->>'start'!~'^(|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2})$' or f->>'end'!~'^(|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2})$' then raise exception 'invalid schedule civil fields' using errcode='22023';end if;
 end if;
end;$$;

create function private.schedule_resource_instant(p_civil text,p_original text,p_timezone text)
returns text language plpgsql stable set search_path='' as $$
declare civil timestamp;candidate timestamptz;i integer;
begin
 if to_char(p_original::timestamptz at time zone p_timezone,'YYYY-MM-DD"T"HH24:MI')=p_civil then return p_original;end if;
 if p_civil is null or p_civil!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then raise exception 'invalid schedule civil time' using errcode='22023';end if;
 civil:=p_civil::timestamp;candidate:=civil at time zone 'UTC';
 for i in 1..4 loop candidate:=candidate+(civil-(candidate at time zone p_timezone));end loop;
 if to_char(candidate at time zone p_timezone,'YYYY-MM-DD"T"HH24:MI')<>p_civil then raise exception 'nonexistent schedule civil time' using errcode='22023';end if;
 return to_char(candidate at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
end;$$;

create function private.schedule_resource_intent(d private.schedule_resource_preparations)
returns jsonb language plpgsql stable set search_path='' as $$
declare f jsonb:=d.content->'scheduleAction';b jsonb:=jsonb_build_object('id',d.target_resource_id);a text;reason text:=btrim(coalesce(f->>'reason',''));s jsonb;n numeric;
begin
 if f->>'form'='type' then
  n:=(f->>'duration')::numeric;
  if length(btrim(f->>'name')) not between 2 and 100 or n is null or n<>trunc(n) or n not between 15 and 1440 or f->>'start'='' then raise exception 'invalid complete schedule type' using errcode='22023';end if;
  a:='type';b:=b||jsonb_build_object('name',btrim(f->>'name'),'startsLocal',f->>'start','durationMinutes',n::integer,'active',f->'active');
 elsif f->>'form'='series' then
  a:=f->>'operation';
  if a='end_series' then if f->>'from'='' then raise exception 'schedule effective date required' using errcode='22023';end if;b:=b||jsonb_build_object('fromDate',f->>'from');end if;
 elsif f->>'form'='decision' then
  a:=case when f->>'operation'='close' then 'close_obsolete' else 'decide_change' end;
  if a='decide_change' then b:=b||jsonb_build_object('approve',f->>'operation'='approve');end if;
 else
  a:=f->>'operation';
  if a<>'cancel' then
   select x into s from jsonb_array_elements(d.reference_snapshot->'workspace'->'shifts') x where x->>'id'=d.target_resource_id::text;
   if s is null or f->>'professionalId'='' then raise exception 'schedule reference and professional required' using errcode='22023';end if;
   b:=b||jsonb_build_object('professionalId',f->>'professionalId','startsAt',private.schedule_resource_instant(f->>'start',s->>'starts_at',s->>'timezone'),'endsAt',private.schedule_resource_instant(f->>'end',s->>'ends_at',s->>'timezone'),'notes',f->>'notes');
  end if;
 end if;
 if a in ('end_series','reject','change','propose_change','cancel','close_obsolete') or a='decide_change' and not(b->>'approve')::boolean then
  if length(reason)<3 then raise exception 'schedule reason required' using errcode='22023';end if;
 end if;
 if f ? 'reason' and f->>'reason'<>'' then
  if length(reason)<3 then raise exception 'schedule reason required' using errcode='22023';end if;
  b:=b||jsonb_build_object('reason',reason);
 end if;
 return jsonb_build_object('action',a,'body',b);
end;$$;

create function private.schedule_resource_preparation_view(d private.schedule_resource_preparations)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ref jsonb:=d.reference_snapshot;
begin
 -- Saved operational snapshots are only disclosed while native read still permits
 -- the target. Human fields, opaque versions and one's own receipts remain recoverable.
 if ref is not null then
  begin perform private.schedule_resource_source(d.care_recipient_id,d.purpose,d.target_resource_id);
  exception when insufficient_privilege then ref:=null;end;
 end if;
 return jsonb_build_object('id',d.id,'ownerId',d.owner_id,'patientId',d.care_recipient_id,'kind','SCHEDULE','purpose',d.purpose,'targetDocumentId',null,'targetResourceId',d.target_resource_id,'schemaVersion',1,'revision',d.revision,'state',d.state,'createdAt',d.created_at,'savedAt',d.saved_at,'contentHash',d.content_hash,'content',case when d.state='active' then d.content||jsonb_build_object('reference',ref) end,'navigation',case when d.state='active' then d.navigation end,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result);
end;$$;

create function public.schedule_resource_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_resource_preparations;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 select * into d from private.schedule_resource_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed');
 if not found then return null;end if;
 return private.schedule_resource_preparation_view(d);
end;$$;

create function public.schedule_resource_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_resource_preparations;c private.schedule_resource_preparation_commands;h text;a text:=p_body->>'action';result jsonb;ref jsonb;new_content jsonb:=p_body->'content';ref_hash text;ref_version integer;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or (p_id is null)<>(p_expected is null)
  or (p_body-case when a='save' then array['action','content','navigation'] else array['action'] end)<>'{}' then raise exception 'invalid schedule preparation command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('command',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-key:'||auth.uid()||':'||p_key,0));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 select * into c from private.schedule_resource_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if p_id is null then
  if a<>'save' then raise exception 'private draft identity required' using errcode='22023';end if;
  if exists(select 1 from private.schedule_resource_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
 else
  select * into d from private.schedule_resource_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or d.revision is distinct from p_expected or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
 end if;
 if a='save' then
  perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target,true);
  perform private.validate_schedule_resource_fields(p_purpose,new_content,p_body->'navigation');
  ref_hash:=new_content->>'referenceHash';ref_version:=(new_content->>'referenceVersion')::integer;
  if ref_hash is not null then
   if d.reference_snapshot->>'hash'=ref_hash and (d.reference_snapshot->>'version')::integer=ref_version then ref:=d.reference_snapshot;
   else
    -- The human filling remains saveable if its old operational reference is
    -- no longer readable/current. An unverified reference never permits commit.
    begin ref:=private.schedule_resource_source(p_patient,p_purpose,p_target)->'reference';
    exception when insufficient_privilege then ref:=null;end;
    if ref->>'hash' is distinct from ref_hash or (ref->>'version')::integer is distinct from ref_version then ref:=null;end if;
   end if;
  end if;
  if p_id is null then
   insert into private.schedule_resource_preparations(owner_id,care_recipient_id,purpose,target_type_id,target_series_id,target_shift_id,target_change_id,content,content_hash,navigation,reference_snapshot)
   values(auth.uid(),p_patient,p_purpose,case when p_purpose='shift_type_edit' then p_target end,case when p_purpose in ('schedule_series_end','schedule_series_approve','schedule_series_reject') then p_target end,case when p_purpose='schedule_shift_edit' then p_target end,case when p_purpose in ('schedule_change_approve','schedule_change_reject','schedule_change_close') then p_target end,new_content,encode(extensions.digest(new_content::text,'sha256'),'hex'),p_body->'navigation',ref) returning * into d;
  else
   update private.schedule_resource_preparations set content=new_content,content_hash=encode(extensions.digest(new_content::text,'sha256'),'hex'),navigation=p_body->'navigation',reference_snapshot=ref,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  end if;
 else
  update private.schedule_resource_preparations set state=case a when 'discard' then 'discarded' else 'completed' end,content=null,navigation=null,reference_snapshot=null,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 end if;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'patientId',p_patient,'ownerId',auth.uid(),'purpose',p_purpose,'targetResourceId',p_target,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result,'replayed',false);
 insert into private.schedule_resource_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'schedule_resource_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'revision',d.revision));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target,a='save');return result;
end;$$;

create function public.commit_schedule_resource_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_resource_preparations;c private.schedule_resource_preparation_commands;h text;ref jsonb;native jsonb;receipt jsonb;result jsonb;j private.schedule_commands;native_version integer;command jsonb:=p_body->'command';obsolete_only boolean:=false;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if p_key is null or p_body is null or p_id is null or p_expected is null or p_expected<1 then raise exception 'invalid schedule preparation commit' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-key:'||auth.uid()||':'||p_key,0));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 select * into c from private.schedule_resource_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;
  select * into d from private.schedule_resource_preparations where id=c.preparation_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target;
  if not found or d.consumed_result is null then raise exception 'private draft invariant failed' using errcode='XX000';end if;
  return jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',d.consumed_result,'replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target,true);
 select * into d from private.schedule_resource_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision is distinct from p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 if d.reference_snapshot is null or command is distinct from private.schedule_resource_intent(d) or p_body->'expectedVersion' is distinct from d.content->'referenceVersion' or p_body->'referenceHash' is distinct from d.content->'referenceHash' or p_body->'sourceVersion' is distinct from d.reference_snapshot->'sourceVersion' or (p_body-array['command','expectedVersion','referenceHash','sourceVersion'])<>'{}' then raise exception 'private schedule intent mismatch' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target,true);
 ref:=private.schedule_resource_source(p_patient,p_purpose,p_target)->'reference';
 if ref->>'hash' is distinct from d.content->>'referenceHash' or ref->'version' is distinct from d.content->'referenceVersion' then
  -- Preserve the native decision's explicit obsolete outcome for a concurrent
  -- source change. This exception can never approve the changed proposal.
  if p_purpose='schedule_change_approve' and ref->'version'=d.content->'referenceVersion' and exists(select 1 from jsonb_array_elements(ref->'workspace'->'changes') x where x->>'status'='pending' and (x->>'is_stale')::boolean) then obsolete_only:=true;
  else raise exception 'stale schedule reference' using errcode='PT409';end if;
 end if;
 if p_purpose='schedule_change_approve' and exists(select 1 from jsonb_array_elements(ref->'workspace'->'changes') x where x->'source_snapshot'='null'::jsonb or x->'proposed_snapshot'='null'::jsonb) then raise exception 'schedule decision source required' using errcode='PT409';end if;
 if exists(select 1 from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key) then raise exception 'native schedule key already used' using errcode='PT409';end if;
 native_version:=(d.content->>'referenceVersion')::integer;
 native:=public.schedule_command(p_patient,command->>'action',command->'body',p_key,native_version);
 if obsolete_only and native->>'status' is distinct from 'obsolete' then raise exception 'stale schedule reference changed before obsolete outcome' using errcode='PT409';end if;
 select * into j from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 -- An edit keeps the original resource creator. The actor is the native journal's
 -- actor, never the resource's created_by column or a browser-provided identity.
 if not found or j.result is distinct from native or j.request is distinct from jsonb_build_object('action',command->>'action','body',command->'body','version',native_version)
  or native->>'care_recipient_id' is distinct from p_patient::text or native->>'id' is null
  or (command->>'action'<>'propose_change' and native->>'id' is distinct from p_target::text) then raise exception 'native schedule invariant failed' using errcode='XX000';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',native->'id','actorId',auth.uid(),'recordedAt',j.created_at,'idempotencyKey',p_key,'command',command,'expectedVersion',native_version,'sourceVersion',d.reference_snapshot->'sourceVersion','referenceHash',d.content->'referenceHash','fields',d.content->'scheduleAction','sourceTimezone',case when d.content->'scheduleAction'->>'form'='shift' then d.reference_snapshot->'workspace'->'shifts'->0->'timezone' else 'null'::jsonb end,'nativeResult',jsonb_build_object('id',native->'id','version',native->'version','status',native->'status','active',native->'is_active'));
 update private.schedule_resource_preparations set state='consumed',content=null,navigation=null,reference_snapshot=null,revision=revision+1,saved_at=clock_timestamp(),consumed_change_id=case when command->>'action'='propose_change' then (native->>'id')::uuid end,consumed_resource_id=(native->>'id')::uuid,consumed_result=receipt where id=d.id returning * into d;
 result:=jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',receipt,'replayed',false);
 insert into private.schedule_resource_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consume','schedule_resource_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'resource_id',d.consumed_resource_id));
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target,true);return result;
end;$$;

-- Called only under original-key, private-slot and native-patient locks. A
-- different hash is not proof of nonapplication: reversible facts may revert.
create function private.schedule_resource_recovery(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_original_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_resource_preparations;c private.schedule_resource_preparation_commands;h text;common jsonb;reason text;v integer;source_version integer;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if p_id is null or p_original_key is null or p_expected is null or p_expected<1 or jsonb_typeof(p_body) is distinct from 'object' or p_body->'command'->'body'->>'id' is distinct from p_target::text then raise exception 'invalid schedule recovery reference' using errcode='22023';end if;
 select * into d from private.schedule_resource_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 common:=jsonb_build_object('patientId',p_patient,'ownerId',auth.uid(),'purpose',p_purpose,'targetResourceId',p_target,'key',p_original_key,'expectedRevision',p_expected,'command',p_body->'command','expectedVersion',p_body->'expectedVersion','sourceVersion',p_body->'sourceVersion','referenceHash',p_body->'referenceHash','current',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state));
 select * into c from private.schedule_resource_preparation_commands where owner_id=auth.uid() and idempotency_key=p_original_key;
 if found then
  if c.intent_hash=h then
   if d.consumed_result is null then raise exception 'private draft invariant failed' using errcode='XX000';end if;
   return common||jsonb_build_object('status','applied','confirmation',jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',d.consumed_result,'replayed',true));
  end if;
  reason:='key_conflict';
 elsif exists(select 1 from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_original_key) then reason:='key_conflict';
 elsif d.revision>p_expected then reason:='advanced_revision';
 else
  if p_purpose='shift_type_edit' then select version into v from public.shift_types where id=p_target and care_recipient_id=p_patient;
  elsif p_purpose in ('schedule_series_end','schedule_series_approve','schedule_series_reject') then select version into v from public.shift_series where id=p_target and care_recipient_id=p_patient;
  elsif p_purpose='schedule_shift_edit' then select version into v from public.scheduled_shifts where id=p_target and care_recipient_id=p_patient;
  else
   select change_row.version,s.version into v,source_version from public.shift_change_requests change_row join public.scheduled_shifts s on s.id=change_row.shift_id and s.care_recipient_id=change_row.care_recipient_id where change_row.id=p_target and change_row.care_recipient_id=p_patient;
  end if;
  if v>(d.content->>'referenceVersion')::integer or p_purpose<>'schedule_change_approve' and source_version>(d.reference_snapshot->>'sourceVersion')::integer then reason:='source_advanced';end if;
 end if;
 return common||jsonb_build_object('status',case when reason is null then 'unknown' else 'not_applied' end,'reason',reason,'source',case when reason='source_advanced' then jsonb_build_object('savedTargetVersion',(d.content->>'referenceVersion')::integer,'currentTargetVersion',v,'savedSourceVersion',(d.reference_snapshot->>'sourceVersion')::integer,'currentSourceVersion',source_version) end,'receipt',d.consumed_result);
end;$$;

create function public.recover_schedule_resource_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if p_key is null then raise exception 'schedule recovery key required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-key:'||auth.uid()||':'||p_key,0));
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
 result:=private.schedule_resource_recovery(p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_key);
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);return result;
end;$$;

create function public.resolve_schedule_resource_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_original_key uuid,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;c private.schedule_resource_preparation_commands;h text;k uuid;d private.schedule_resource_preparations;
begin
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 if p_key is null or p_original_key is null or p_key=p_original_key then raise exception 'distinct resolution key required' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('resolve',p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_original_key)::text,'sha256'),'hex');
 for k in select distinct x from unnest(array[p_key,p_original_key]) x order by x loop perform pg_advisory_xact_lock(hashtextextended('schedule-resource-key:'||auth.uid()||':'||k,0));end loop;
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);
 select * into c from private.schedule_resource_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result;end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-resource-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
 result:=private.schedule_resource_recovery(p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_original_key);
 if result->>'status'='unknown' then
  select * into d from private.schedule_resource_preparations where id=p_id and owner_id=auth.uid();
  if p_body is distinct from jsonb_build_object('command',private.schedule_resource_intent(d),'expectedVersion',d.content->'referenceVersion','sourceVersion',d.reference_snapshot->'sourceVersion','referenceHash',d.content->'referenceHash') then raise exception 'private schedule resolution intent mismatch' using errcode='22023';end if;
  -- Under the original key, retiring this private revision makes every delayed
  -- original packet fail CAS. No operational command or replay is performed.
  update private.schedule_resource_preparations set revision=revision+1,saved_at=clock_timestamp() where id=p_id and owner_id=auth.uid() and revision=p_expected and state='active' returning * into d;
  if not found then raise exception 'stale private draft revision' using errcode='PT409';end if;
  result:=private.schedule_resource_recovery(p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_original_key);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.resolve_attempt','schedule_resource_preparation',p_id,jsonb_build_object('care_recipient_id',p_patient,'revision',d.revision));
 end if;
 insert into private.schedule_resource_preparation_commands values(auth.uid(),p_key,p_id,h,result);
 perform private.require_schedule_resource_scope(p_patient,p_purpose,p_target);return result;
end;$$;

create function public.schedule_resource_preparation_list(p_patient uuid,p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if private.auth_session() is null or not public.can_access_recipient(p_patient) then raise exception 'schedule preparation unavailable' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 100 or (p_before is null)<>(p_before_id is null) then raise exception 'invalid preparation cursor' using errcode='22023';end if;
 select coalesce(jsonb_agg(private.schedule_resource_preparation_view(d) order by d.saved_at desc,d.id desc),'[]') into result from (
  select * from private.schedule_resource_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and (p_before is null or (saved_at,id)<(p_before,p_before_id)) order by saved_at desc,id desc limit p_limit
 ) d;
 if private.auth_session() is null or not public.can_access_recipient(p_patient) then raise exception 'schedule preparation unavailable' using errcode='42501';end if;
 return result;
end;$$;

-- Scope metadata is additive for any retained local development preparations.
update private.schedule_resource_preparations set reference_snapshot=reference_snapshot||jsonb_build_object('patientId',care_recipient_id,'purpose',purpose,'targetResourceId',target_resource_id) where reference_snapshot is not null and not(reference_snapshot ?& array['patientId','purpose','targetResourceId']);

revoke all on function private.require_schedule_resource_scope(uuid,text,uuid,boolean),private.schedule_resource_source(uuid,text,uuid),private.validate_schedule_resource_fields(text,jsonb,jsonb),private.schedule_resource_instant(text,text,text),private.schedule_resource_intent(private.schedule_resource_preparations),private.schedule_resource_preparation_view(private.schedule_resource_preparations),private.schedule_resource_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated,service_role;
revoke all on function public.schedule_resource_preparation_reference(uuid,text,uuid),public.schedule_resource_preparation_context(uuid,text,uuid),public.schedule_resource_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),public.recover_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),public.resolve_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid,uuid),public.schedule_resource_preparation_list(uuid,timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.schedule_resource_preparation_reference(uuid,text,uuid),public.schedule_resource_preparation_context(uuid,text,uuid),public.schedule_resource_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) to authenticated;
grant execute on function public.recover_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),public.resolve_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid,uuid),public.schedule_resource_preparation_list(uuid,timestamptz,uuid,integer) to authenticated;
notify pgrst,'reload schema';
