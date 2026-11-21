-- Preparation is a private administrative draft, not a clinical document or
-- an operational release. Personal guide progress never records document SCI.
create table private.residence_preparations(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid references public.care_recipients(id), revision integer not null default 1 check(revision>0),
 step integer not null default 0 check(step between 0 and 6), state text not null default 'draft' check(state in ('draft','preparing','discarded')),
 content jsonb, saved_at timestamptz not null default clock_timestamp(),
 check((state='preparing')=(care_recipient_id is not null)),check(state='discarded' or jsonb_typeof(content)='object')
);
create index residence_preparations_owner on private.residence_preparations(owner_id,saved_at desc,id);
create index residence_preparations_patient on private.residence_preparations(care_recipient_id);
create table private.phase_d3_commands(
 owner_id uuid not null references public.profiles(id),idempotency_key uuid not null,intent_hash text not null,result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create table private.patient_guide_settings(
 care_recipient_id uuid primary key references public.care_recipients(id),show_on_first_access boolean not null,
 revision integer not null check(revision>0),updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default clock_timestamp()
);
create index patient_guide_settings_actor on private.patient_guide_settings(updated_by);
create table private.user_guide_progress(
 owner_id uuid not null references public.profiles(id),scope text not null,guide_version text not null,
 revision integer not null check(revision>0),step integer not null check(step between 0 and 5),
 status text not null check(status in ('started','skipped','completed')),updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,scope,guide_version)
);
alter table private.residence_preparations enable row level security;
alter table private.phase_d3_commands enable row level security;
alter table private.patient_guide_settings enable row level security;
alter table private.user_guide_progress enable row level security;
revoke all on private.residence_preparations,private.phase_d3_commands,private.patient_guide_settings,private.user_guide_progress from public,anon,authenticated,service_role;

create function private.residence_preparation_view(d private.residence_preparations) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',d.id,'patientId',d.care_recipient_id,'revision',d.revision,'step',d.step,'state',d.state,'content',d.content,'savedAt',d.saved_at,'productionApproved',false);
$$;
create function public.residence_preparations(p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_id is null then
  select jsonb_build_object('data',coalesce(jsonb_agg(private.residence_preparation_view(d) order by d.saved_at desc,d.id),'[]'::jsonb)) into result
  from (select * from private.residence_preparations where owner_id=auth.uid() and state<>'discarded' order by saved_at desc,id limit 100) d;
 else
  select private.residence_preparation_view(d) into result from private.residence_preparations d where id=p_id and owner_id=auth.uid();
  if result is null then raise exception 'preparation unavailable' using errcode='42501';end if;
 end if;return result;
end;$$;

create function public.residence_preparation_command(p_id uuid,p_expected integer,p_action text,p_content jsonb,p_step integer,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.residence_preparations;previous private.phase_d3_commands;h text;result jsonb;person uuid;patient public.care_recipients;v uuid;begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_key is null or p_step is null or p_step not between 0 and 6 or p_action is null or p_action not in ('save','create','discard')
  or p_expected is not null and p_expected<1 or p_content is null or jsonb_typeof(p_content)<>'object' or pg_column_size(p_content)>64000
  or exists(select 1 from jsonb_object_keys(p_content) k where k not in ('displayName','isActive','isDevelopment','timeZone','administratorEmail','ownerId','substituteId','responseMinutes','showGuide','teamIds'))
 then raise exception 'invalid residence preparation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('residence',p_id,p_expected,p_action,p_content,p_step)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('residence-intent:'||auth.uid()::text||':'||p_key::text,0));
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.intent_hash is distinct from h then raise exception 'preparation idempotency conflict' using errcode='23505';end if;
  return previous.result||jsonb_build_object('replayed',true);
 end if;
 if p_id is null then
  if p_expected is not null or p_action<>'save' then raise exception 'save the preparation before creating a residence' using errcode='22023';end if;
  insert into private.residence_preparations(owner_id,content,step) values(auth.uid(),p_content,p_step) returning * into d;
 else
  select * into d from private.residence_preparations where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'preparation unavailable' using errcode='42501';end if;
  if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
  if d.revision is distinct from p_expected or d.state='discarded' then raise exception 'stale preparation revision' using errcode='PT409';end if;
  if d.care_recipient_id is not null and (p_action<>'save' or
   (p_content-array['teamIds','ownerId','substituteId','responseMinutes']) is distinct from (d.content-array['teamIds','ownerId','substituteId','responseMinutes'])) then
   raise exception 'created residence fields use their own authorized configuration flows' using errcode='PT409';end if;
  update private.residence_preparations set content=p_content,step=p_step,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 end if;
 -- A draft may be incomplete; every supplied field must have its declared type.
 if exists(select 1 from jsonb_each(p_content) e where
  e.key in ('displayName','timeZone','administratorEmail') and (jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>300)
  or e.key in ('isActive','isDevelopment','showGuide') and jsonb_typeof(e.value)<>'boolean'
  or e.key in ('ownerId','substituteId') and not private.creation_draft_uuid(e.value)
  or e.key='responseMinutes' and (jsonb_typeof(e.value)<>'number' or (e.value#>>'{}')!~'^[0-9]{1,5}$')
  or e.key='teamIds' and jsonb_typeof(e.value)<>'array') then raise exception 'invalid preparation field' using errcode='22023';end if;
 if p_content ? 'teamIds' then
  if jsonb_array_length(p_content->'teamIds')>100 or exists(select 1 from jsonb_array_elements(p_content->'teamIds') e where not private.creation_draft_uuid(e)) then raise exception 'invalid preparation team' using errcode='22023';end if;
 end if;
 if p_action='discard' then
  update private.residence_preparations set state='discarded',content=null where id=d.id returning * into d;
 elsif p_action='create' then
  if length(btrim(coalesce(p_content->>'displayName',''))) not between 2 and 160
   or not (p_content ?& array['isActive','isDevelopment','showGuide','timeZone','administratorEmail','ownerId','substituteId','responseMinutes'])
   or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_content->>'timeZone' and (name like '%/%' or name='UTC'))
   or (p_content->>'responseMinutes')::integer not between 15 and 10080
   or p_content->>'ownerId'=p_content->>'substituteId' then raise exception 'complete the required preparation fields' using errcode='22023';end if;
  select p.id into person from public.profiles p join auth.users u on u.id=p.id
   where lower(u.email)=lower(btrim(p_content->>'administratorEmail')) and u.email_confirmed_at is not null and p.status='active' for update of p;
  if person is null then raise exception 'confirmed active administrator identity required' using errcode='22023';end if;
  for v in select id from public.profiles where id in ((p_content->>'ownerId')::uuid,(p_content->>'substituteId')::uuid) order by id for update loop null;end loop;
  if (select count(*) from public.profiles where id in ((p_content->>'ownerId')::uuid,(p_content->>'substituteId')::uuid) and status='active')<>2
   then raise exception 'active owner and substitute required' using errcode='22023';end if;
  if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
  patient:=public.admin_upsert_recipient(null,btrim(p_content->>'displayName'),(p_content->>'isActive')::boolean,(p_content->>'isDevelopment')::boolean);
  insert into private.membership_authority values(pg_backend_pid(),txid_current(),patient.id,person,'admin',true,true);
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock) values(patient.id,person,'admin',true,true);
  delete from private.membership_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and care_recipient_id=patient.id;
  insert into private.patient_guide_settings values(patient.id,(p_content->>'showGuide')::boolean,1,auth.uid(),clock_timestamp());
  update private.residence_preparations set care_recipient_id=patient.id,state='preparing' where id=d.id returning * into d;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'patient.preparation.created','patient',patient.id,
   jsonb_build_object('care_recipient_id',patient.id,'preparationId',d.id,'initialAdministrator',person,'isActive',patient.is_active,'productionApproved',false));
 end if;
 result:=private.residence_preparation_view(d)||jsonb_build_object('replayed',false);
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);return result;
end;$$;

create function public.guide_context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb;s text:='personal';r text:='general';patient uuid;g private.patient_guide_settings;p private.user_guide_progress;begin
 if private.auth_session() is null then raise exception 'session required' using errcode='42501';end if;
 c:=public.my_active_context();
 if c->>'mode'='patient' and public.can_access_recipient((c->>'care_recipient_id')::uuid) then
  patient:=(c->>'care_recipient_id')::uuid;s:=patient::text;r:=public.recipient_role(patient)::text;
  select * into g from private.patient_guide_settings where care_recipient_id=patient;
 elsif c->>'mode'='global' and public.is_global_administrator() then s:='global';r:='global';end if;
 select * into p from private.user_guide_progress where owner_id=auth.uid() and scope=s and guide_version='2026-11-D3';
 return jsonb_build_object('scope',s,'role',r,'patientId',patient,'guideVersion','2026-11-D3','showOnFirstAccess',coalesce(g.show_on_first_access,true),
  'configurationRevision',coalesce(g.revision,0),'progress',jsonb_build_object('revision',coalesce(p.revision,0),'step',coalesce(p.step,0),'status',p.status));
end;$$;
create function public.guide_progress_command(p_expected integer,p_step integer,p_status text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb;after_context jsonb;g private.user_guide_progress;previous private.phase_d3_commands;h text;result jsonb;begin
 c:=public.guide_context();
 if p_expected is null or p_expected<0 or p_step is null or p_step not between 0 and 5 or p_status is null or p_status not in ('started','skipped','completed') or p_key is null then raise exception 'invalid guide progress' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('guide',c->>'scope',p_expected,p_step,p_status)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('guide:'||auth.uid()::text,0));
 after_context:=public.guide_context();
 if c->>'scope' is distinct from after_context->>'scope' then raise exception 'guide context changed' using errcode='PT409';end if;
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if previous.intent_hash is distinct from h then raise exception 'guide idempotency conflict' using errcode='23505';end if;return previous.result;end if;
 select * into g from private.user_guide_progress where owner_id=auth.uid() and scope=c->>'scope' and guide_version='2026-11-D3' for update;
 if coalesce(g.revision,0)<>p_expected then raise exception 'stale guide revision' using errcode='PT409';end if;
 insert into private.user_guide_progress values(auth.uid(),c->>'scope','2026-11-D3',p_expected+1,p_step,p_status,clock_timestamp())
 on conflict(owner_id,scope,guide_version) do update set revision=excluded.revision,step=excluded.step,status=excluded.status,updated_at=excluded.updated_at;
 result:=public.guide_context();insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);return result;
end;$$;
create function public.configure_patient_guide(p_patient uuid,p_expected integer,p_show boolean,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g private.patient_guide_settings;previous private.phase_d3_commands;h text;result jsonb;begin
 if not private.can(p_patient,'access.manage') then raise exception 'local administration required' using errcode='42501';end if;
 if p_expected is null or p_expected<0 or p_show is null or p_key is null then raise exception 'invalid guide configuration' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('guide-settings',p_patient,p_expected,p_show)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 if not private.can(p_patient,'access.manage') then raise exception 'local administration required' using errcode='42501';end if;
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if previous.intent_hash is distinct from h then raise exception 'guide configuration idempotency conflict' using errcode='23505';end if;return previous.result;end if;
 select * into g from private.patient_guide_settings where care_recipient_id=p_patient for update;
 if coalesce(g.revision,0)<>p_expected then raise exception 'stale guide configuration revision' using errcode='PT409';end if;
 insert into private.patient_guide_settings values(p_patient,p_show,p_expected+1,auth.uid(),clock_timestamp())
 on conflict(care_recipient_id) do update set show_on_first_access=excluded.show_on_first_access,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 result:=jsonb_build_object('patientId',p_patient,'revision',p_expected+1,'showOnFirstAccess',p_show);
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'guide.configuration.updated','patient',p_patient,jsonb_build_object('care_recipient_id',p_patient,'showOnFirstAccess',p_show,'revision',p_expected+1));
 return result;
end;$$;
revoke all on function private.residence_preparation_view(private.residence_preparations),public.residence_preparations(uuid),public.residence_preparation_command(uuid,integer,text,jsonb,integer,uuid),public.guide_context(),public.guide_progress_command(integer,integer,text,uuid),public.configure_patient_guide(uuid,integer,boolean,uuid) from public,anon,authenticated,service_role;
grant execute on function public.residence_preparations(uuid),public.residence_preparation_command(uuid,integer,text,jsonb,integer,uuid),public.guide_context(),public.guide_progress_command(integer,integer,text,uuid),public.configure_patient_guide(uuid,integer,boolean,uuid) to authenticated;
