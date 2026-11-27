-- Direct registration writes the patient, official preparation and receipt in one transaction.
-- Existing clients can still read and finish their previous preparations during rollout.
create or replace function private.reviewable_residence_account(p_email text)
returns table(user_id uuid, full_name text)
language sql stable set search_path='' as $$
 with candidates as (
  select p.id,p.full_name
  from public.profiles p join auth.users u on u.id=p.id
  where lower(u.email)=lower(btrim(p_email)) and u.email_confirmed_at is not null and p.status='active'
  limit 2
 )
 select id,full_name from candidates where (select count(*) from candidates)=1;
$$;
revoke all on function private.reviewable_residence_account(text) from public,anon,authenticated,service_role;

create or replace function public.review_residence_administrator(p_email text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare candidate jsonb;
begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_email is null or length(btrim(p_email)) not between 3 and 254 then
  raise exception 'invalid residence administrator email' using errcode='22023';
 end if;
 select jsonb_build_object('id',user_id,'name',full_name) into candidate
 from private.reviewable_residence_account(p_email);
 return candidate;
end;$$;

create or replace function private.phase_d3_initial_preparation_command(p_id uuid,p_expected integer,p_action text,p_content jsonb,p_step integer,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.residence_preparations;previous private.phase_d3_commands;h text;result jsonb;person uuid;patient public.care_recipients;v uuid;
 direct_create boolean := p_id is null and p_action='create';
 begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_key is null or p_step is null or p_step not between 0 and 6 or p_action is null or p_action not in ('save','create','discard')
  or p_expected is not null and p_expected<1 or p_content is null or jsonb_typeof(p_content)<>'object' or pg_column_size(p_content)>64000
  or exists(select 1 from jsonb_object_keys(p_content) k where k not in ('displayName','isActive','isDevelopment','timeZone','administratorEmail','ownerId','substituteId','responseMinutes','showGuide','teamIds','reviewedAdministratorId'))
  or p_content ? 'reviewedAdministratorId' and not direct_create
  or direct_create and (p_expected is not null or p_step<>0
    or not coalesce(private.creation_draft_uuid(p_content->'reviewedAdministratorId'),false))
 then raise exception 'invalid residence preparation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('residence',p_id,p_expected,p_action,p_content,p_step)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('residence-intent:'||auth.uid()::text||':'||p_key::text,0));
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.intent_hash is distinct from h then raise exception 'preparation idempotency conflict' using errcode='23505';end if;
  return previous.result||jsonb_build_object('replayed',true);
 end if;
 if direct_create then
  -- The first row for this intention is inserted after the patient is created.
  null;
 elsif p_id is null then
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
   or (p_content->>'ownerId')::uuid=(p_content->>'substituteId')::uuid then raise exception 'complete the required preparation fields' using errcode='22023';end if;
  select user_id into person from private.reviewable_residence_account(p_content->>'administratorEmail');
  if direct_create and person is distinct from (p_content->>'reviewedAdministratorId')::uuid then
   raise exception 'reviewed residence administrator changed' using errcode='PT409';
  end if;
  if person is null then raise exception 'confirmed active administrator identity required' using errcode='22023';end if;
  for v in select id from public.profiles where id in (person,(p_content->>'ownerId')::uuid,(p_content->>'substituteId')::uuid)
    order by id for update loop null;end loop;
  perform 1 from public.profiles p join auth.users u on u.id=p.id where p.id=person
    and p.status='active' and lower(u.email)=lower(btrim(p_content->>'administratorEmail'))
    and u.email_confirmed_at is not null for share of u;
  if not found then
   if direct_create then raise exception 'reviewed residence administrator changed' using errcode='PT409';end if;
   raise exception 'confirmed active administrator identity required' using errcode='22023';
  end if;
  if (select count(*) from public.profiles where id in ((p_content->>'ownerId')::uuid,(p_content->>'substituteId')::uuid) and status='active')<>2
   then raise exception 'active owner and substitute required' using errcode='22023';end if;
  if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
  patient:=public.admin_upsert_recipient(null,btrim(p_content->>'displayName'),(p_content->>'isActive')::boolean,(p_content->>'isDevelopment')::boolean);
  insert into private.membership_authority values(pg_backend_pid(),txid_current(),patient.id,person,'admin',true,true);
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock) values(patient.id,person,'admin',true,true);
  delete from private.membership_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and care_recipient_id=patient.id;
  insert into private.patient_guide_settings values(patient.id,(p_content->>'showGuide')::boolean,1,auth.uid(),clock_timestamp());
  if direct_create then
   insert into private.residence_preparations(owner_id,care_recipient_id,state,content,step)
     values(auth.uid(),patient.id,'preparing',p_content-'reviewedAdministratorId',p_step) returning * into d;
  else
   update private.residence_preparations set care_recipient_id=patient.id,state='preparing' where id=d.id returning * into d;
  end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'patient.preparation.created','patient',patient.id,
   jsonb_build_object('care_recipient_id',patient.id,'preparationId',d.id,'initialAdministrator',person,'isActive',patient.is_active,'productionApproved',false));
 end if;
 result:=private.residence_preparation_view(d)||jsonb_build_object('replayed',false);
 if direct_create then
  result:=result||jsonb_build_object(
   'creationKey',p_key,'administratorId',person,
   'people',(select jsonb_object_agg(p.id::text,p.full_name) from public.profiles p
    where p.id in (person,(p_content->>'ownerId')::uuid,(p_content->>'substituteId')::uuid)
      or p.id in (select value::uuid from jsonb_array_elements_text(p_content->'teamIds')))
  );
 end if;
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);return result;
end;$$;

create or replace function public.create_reviewed_residence(p_content jsonb,p_key uuid) returns jsonb
language sql security definer set search_path='' as $$
 select private.phase_d3_initial_preparation_command(null,null,'create',p_content,0,p_key);
$$;

-- With the form gone, an explicit resolution closes an unregistered key under
-- the same lock as creation. A delayed request cannot create after that point.
create or replace function public.residence_creation_result(p_key uuid,p_close_absent boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_key is null or p_close_absent is null then
  raise exception 'invalid residence creation reference' using errcode='22023';
 end if;
 if p_close_absent then
  perform pg_advisory_xact_lock(hashtextextended('residence-intent:'||auth.uid()::text||':'||p_key::text,0));
  if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 end if;
 select command.result into result from private.phase_d3_commands command
  where command.owner_id=auth.uid() and command.idempotency_key=p_key;
 if found then
  if result->>'creationKey' is distinct from p_key::text then
   raise exception 'residence creation reference unavailable' using errcode='42501';
  end if;
  return result;
 end if;
 if not p_close_absent then return null;end if;
 result:=jsonb_build_object('creationKey',p_key,'state','closed_without_creation');
 insert into private.phase_d3_commands values(auth.uid(),p_key,'residence-closed',result);
 return result;
end;$$;

revoke all on function public.review_residence_administrator(text),public.create_reviewed_residence(jsonb,uuid),
 public.residence_creation_result(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.review_residence_administrator(text),public.create_reviewed_residence(jsonb,uuid),
 public.residence_creation_result(uuid,boolean) to authenticated;
