-- A declaration and a patient's family review are different facts. Neither
-- record changes a role/capability or claims external professional validation.
create table private.professional_declarations (
 user_id uuid primary key references public.profiles(id),
 revision bigint not null default 1 check(revision>0),
 changed_at timestamptz not null default clock_timestamp(),
 declaration jsonb not null check(jsonb_typeof(declaration)='object'),
 value_hash text not null check(value_hash~'^[0-9a-f]{64}$')
);
alter table private.professional_declarations enable row level security;
revoke all on private.professional_declarations from public,anon,authenticated,service_role;

create function private.capture_professional_declaration() returns trigger
language plpgsql security definer set search_path='' as $$
declare body jsonb;begin
 body:=jsonb_build_object('fullName',new.full_name,'category',new.professional_category,
  'registration',new.professional_registration,'state',new.professional_state);
 insert into private.professional_declarations(user_id,declaration,value_hash)
 values(new.id,body,encode(extensions.digest(body::text,'sha256'),'hex'))
 on conflict(user_id) do update set declaration=excluded.declaration,value_hash=excluded.value_hash,
  revision=private.professional_declarations.revision+1,changed_at=clock_timestamp()
 where private.professional_declarations.declaration is distinct from excluded.declaration;
 return new;
end;$$;
revoke all on function private.capture_professional_declaration() from public,anon,authenticated,service_role;
insert into private.professional_declarations(user_id,declaration,value_hash)
select p.id,v.body,encode(extensions.digest(v.body::text,'sha256'),'hex')
from public.profiles p cross join lateral(select jsonb_build_object('fullName',p.full_name,
 'category',p.professional_category,'registration',p.professional_registration,'state',p.professional_state) body) v;
create trigger capture_professional_declaration after insert or update of full_name,
 professional_category,professional_registration,professional_state on public.profiles
for each row execute function private.capture_professional_declaration();

create table private.professional_credential_reviews (
 id uuid primary key default gen_random_uuid(),
 care_recipient_id uuid not null references public.care_recipients(id),
 subject_id uuid not null references public.profiles(id),
 credential_revision bigint not null check(credential_revision>0),
 credential_hash text not null check(credential_hash~'^[0-9a-f]{64}$'),
 declaration jsonb not null check(jsonb_typeof(declaration)='object'),
 outcome text not null check(outcome in ('checked','not_confirmed')),
 note text not null check(length(note)<=600),
 reviewer_id uuid not null references public.profiles(id),
 reviewer_name text not null,
 reviewer_role text not null check(reviewer_role in ('admin','family')),
 recorded_at timestamptz not null default clock_timestamp(),
 idempotency_key uuid not null,
 request_hash text not null,
 check(reviewer_id<>subject_id),
 unique(reviewer_id,idempotency_key)
);
create index professional_credential_reviews_history on private.professional_credential_reviews
 (care_recipient_id,subject_id,recorded_at desc,id desc);
alter table private.professional_credential_reviews enable row level security;
revoke all on private.professional_credential_reviews from public,anon,authenticated,service_role;

create function private.require_credential_scope(p_patient uuid,p_subject uuid,p_write boolean)
returns void language plpgsql security definer set search_path='' as $$
declare c jsonb;begin
 if auth.uid() is null or not public.my_session_valid() then
  raise exception 'active session required' using errcode='42501';end if;
 c:=public.my_active_context();
 if c->>'mode' is distinct from 'patient' or c->>'care_recipient_id' is distinct from p_patient::text
  or not coalesce(private.can(p_patient,'access.manage'),false)
  or coalesce(public.recipient_role(p_patient),'') not in ('admin','family') then
  raise exception 'local family administration required' using errcode='42501';end if;
 if not exists(select 1 from public.care_recipient_memberships
  where care_recipient_id=p_patient and user_id=p_subject) then
  raise exception 'subject not available in this patient' using errcode='42501';end if;
 if p_write then
  perform private.require_cap(p_patient,'access.manage');
  if p_subject=auth.uid() or not exists(select 1 from public.care_recipient_memberships m
   join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient
   and m.user_id=p_subject and m.status='active' and p.status='active') then
   raise exception 'another active member required' using errcode='42501';end if;
 end if;
end;$$;
revoke all on function private.require_credential_scope(uuid,uuid,boolean) from public,anon,authenticated,service_role;

create function private.credential_review_json(r private.professional_credential_reviews)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',r.id,'credentialRevision',r.credential_revision::text,
  'credentialHash',r.credential_hash,'declaration',r.declaration,'outcome',r.outcome,'note',r.note,
  'author',jsonb_build_object('id',r.reviewer_id,'name',r.reviewer_name,'role',r.reviewer_role),
  'recordedAt',r.recorded_at);
$$;
revoke all on function private.credential_review_json(private.professional_credential_reviews) from public,anon,authenticated,service_role;

create function public.patient_professional_credential(p_patient uuid,p_subject uuid,
 p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.professional_declarations;latest private.professional_credential_reviews;
 items jsonb;has_more boolean;can_review boolean;begin
 perform private.require_credential_scope(p_patient,p_subject,false);
 if (p_before is null)<>(p_before_id is null) then raise exception 'invalid history cursor' using errcode='22023';end if;
 select * into strict d from private.professional_declarations where user_id=p_subject;
 select * into latest from private.professional_credential_reviews
 where care_recipient_id=p_patient and subject_id=p_subject order by recorded_at desc,id desc limit 1;
 with page as(select * from private.professional_credential_reviews
  where care_recipient_id=p_patient and subject_id=p_subject
  and (p_before is null or (recorded_at,id)<(p_before,p_before_id))
  order by recorded_at desc,id desc limit 21),
 numbered as(select page.*,row_number() over(order by recorded_at desc,id desc) ordinal from page)
 select coalesce(jsonb_agg(private.credential_review_json(r) order by r.recorded_at desc,r.id desc)
  filter(where numbered.ordinal<=20),'[]'),count(*)>20 into items,has_more
 from numbered join private.professional_credential_reviews r on r.id=numbered.id;
 can_review:=p_subject<>auth.uid() and exists(select 1 from public.care_recipient_memberships m
  join public.profiles p on p.id=m.user_id join public.care_recipients c on c.id=m.care_recipient_id
  where m.care_recipient_id=p_patient and m.user_id=p_subject and m.status='active'
  and p.status='active' and c.is_active);
 return jsonb_build_object('subjectId',p_subject,'patientId',p_patient,
  'declaration',jsonb_build_object('revision',d.revision::text,'changedAt',d.changed_at,
   'valueHash',d.value_hash,'values',d.declaration),
  'state',case when latest.id is null then 'informed' when latest.credential_revision<>d.revision
   then 'needs_review' when latest.outcome='checked' then 'family_checked' else 'not_confirmed' end,
  'latestReview',case when latest.id is null then null else private.credential_review_json(latest) end,
  'externalValidation',null,'canReview',can_review,'history',items,
  'nextCursor',case when has_more then jsonb_build_object('beforeAt',items->19->>'recordedAt','beforeId',items->19->>'id') else null end);
end;$$;
revoke all on function public.patient_professional_credential(uuid,uuid,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.patient_professional_credential(uuid,uuid,timestamptz,uuid) to authenticated;

create function public.review_professional_credential(p_patient uuid,p_subject uuid,p_expected bigint,
 p_outcome text,p_note text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.professional_declarations;r private.professional_credential_reviews;
 h text;actor_name text;actor_role text;begin
 perform private.require_credential_scope(p_patient,p_subject,true);
 if p_key is null or p_expected is null or p_expected<1 or p_outcome is null
  or p_outcome not in ('checked','not_confirmed') or p_note is null or length(btrim(p_note))>600
  or p_outcome='not_confirmed' and length(btrim(p_note))<6 then
  raise exception 'invalid credential review' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_object('patient',p_patient,'subject',p_subject,
  'expected',p_expected,'outcome',p_outcome,'note',btrim(p_note))::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('professional-credential-review:'||auth.uid()||':'||p_key,0));
 perform 1 from public.profiles where id in (auth.uid(),p_subject) order by id for share;
 perform private.require_credential_scope(p_patient,p_subject,true);
 select * into r from private.professional_credential_reviews where reviewer_id=auth.uid() and idempotency_key=p_key;
 if found then
  if r.request_hash<>h then raise exception 'credential intention changed' using errcode='PT409';end if;
  return jsonb_build_object('id',r.id,'credentialRevision',r.credential_revision::text,
   'recordedAt',r.recorded_at,'replayed',true);
 end if;
 select * into strict d from private.professional_declarations where user_id=p_subject for share;
 if d.revision<>p_expected then raise exception 'credential declaration changed; read and review again' using errcode='PT409';end if;
 select coalesce(nullif(btrim(full_name),''),'Nome não informado') into strict actor_name from public.profiles where id=auth.uid();
 actor_role:=public.recipient_role(p_patient);
 insert into private.professional_credential_reviews(care_recipient_id,subject_id,credential_revision,
  credential_hash,declaration,outcome,note,reviewer_id,reviewer_name,reviewer_role,idempotency_key,request_hash)
 values(p_patient,p_subject,d.revision,d.value_hash,d.declaration,p_outcome,btrim(p_note),
  auth.uid(),actor_name,actor_role,p_key,h) returning * into r;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'credential.reviewed','credential_review',r.id,
  jsonb_build_object('care_recipient_id',p_patient,'subject_id',p_subject,'revision',d.revision::text,'outcome',p_outcome));
 perform private.require_credential_scope(p_patient,p_subject,true);
 return jsonb_build_object('id',r.id,'credentialRevision',r.credential_revision::text,
  'recordedAt',r.recorded_at,'replayed',false);
end;$$;
revoke all on function public.review_professional_credential(uuid,uuid,bigint,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.review_professional_credential(uuid,uuid,bigint,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
