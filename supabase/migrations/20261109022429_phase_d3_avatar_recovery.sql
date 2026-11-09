-- Account-scoped avatar intentions. Storage bytes are attested by the server,
-- while association always revalidates the requesting user's live session.
alter table public.profiles add column avatar_revision integer not null default 1 check (avatar_revision > 0);
create function private.advance_avatar_revision() returns trigger language plpgsql set search_path='' as $$
begin
  new.avatar_revision := case when new.avatar_path is distinct from old.avatar_path then old.avatar_revision+1 else old.avatar_revision end;
  return new;
end;$$;
revoke all on function private.advance_avatar_revision() from public,anon,authenticated,service_role;
create trigger avatar_revision before update on public.profiles for each row execute function private.advance_avatar_revision();

create table private.avatar_changes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key uuid not null,
  source_hash text not null check(source_hash ~ '^[0-9a-f]{64}$'),
  source_size integer not null check(source_size between 1 and 5242880),
  filename text not null check(length(filename) between 1 and 160),
  reference_revision integer not null check(reference_revision > 0),
  object_path text not null unique,
  expected_hash text check(expected_hash ~ '^[0-9a-f]{64}$'),
  expected_size integer check(expected_size between 1 and 5242880),
  verified_object uuid,
  verified_at timestamptz,
  state text not null default 'pending' check(state in ('pending','applied','abandoned')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  applied_at timestamptz,
  cleaned_at timestamptz,
  unique(owner_id,idempotency_key),
  check(state <> 'applied' or (verified_at is not null and expected_hash is not null))
);
create unique index avatar_changes_one_pending on private.avatar_changes(owner_id) where state='pending';
create index avatar_changes_owner_history on private.avatar_changes(owner_id,created_at desc,id desc);
alter table private.avatar_changes enable row level security;
revoke all on private.avatar_changes from public,anon,authenticated,service_role;

create function private.avatar_change_view(p private.avatar_changes) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'key',p.idempotency_key,'sourceHash',p.source_hash,'sourceSize',p.source_size,'filename',p.filename,
  'referenceRevision',p.reference_revision,'objectPath',p.object_path,'expectedHash',p.expected_hash,'expectedSize',p.expected_size,
  'prepared',p.expected_hash is not null,'verified',p.verified_at is not null,'state',p.state,'createdAt',p.created_at,'appliedAt',p.applied_at,
  'current',p.state='applied' and exists(select 1 from public.profiles where id=p.owner_id and avatar_path=p.object_path));
$$;
revoke all on function private.avatar_change_view(private.avatar_changes) from public,anon,authenticated,service_role;

create function public.my_avatar_change(p_key uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r private.avatar_changes; rev integer;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select avatar_revision into rev from public.profiles where id=auth.uid() and status='active';
 if rev is null then raise exception 'profile unavailable' using errcode='42501';end if;
 select * into r from private.avatar_changes where owner_id=auth.uid() and (p_key is null or idempotency_key=p_key)
 order by (state='pending') desc,created_at desc,id desc limit 1;
 return jsonb_build_object('referenceRevision',rev,'attempt',case when r.id is null then null else private.avatar_change_view(r) end);
end;$$;

create function public.begin_my_avatar_change(p_key uuid,p_hash text,p_size integer,p_name text,p_reference integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.avatar_changes; rev integer; new_id uuid:=gen_random_uuid();
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select avatar_revision into rev from public.profiles where id=auth.uid() and status='active';
 if rev is null then raise exception 'profile unavailable' using errcode='42501';end if;
 if p_key is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_size is null or p_size not between 1 and 5242880
 or p_name is null or length(p_name) not between 1 and 160 or p_reference is null then raise exception 'invalid avatar intention' using errcode='22023';end if;
 select * into r from private.avatar_changes where owner_id=auth.uid() and idempotency_key=p_key for update;
 if found then
  if r.source_hash<>p_hash or r.source_size<>p_size or r.reference_revision<>p_reference then raise exception 'avatar intention differs' using errcode='40001';end if;
  return private.avatar_change_view(r);
 end if;
 if rev<>p_reference then raise exception 'avatar reference changed' using errcode='40001';end if;
 if exists(select 1 from private.avatar_changes where owner_id=auth.uid() and state='pending') then raise exception 'avatar intention pending' using errcode='40001';end if;
 insert into private.avatar_changes(id,owner_id,idempotency_key,source_hash,source_size,filename,reference_revision,object_path)
 values(new_id,auth.uid(),p_key,p_hash,p_size,p_name,p_reference,auth.uid()::text||'/managed/'||new_id::text||'.jpg') returning * into r;
 return private.avatar_change_view(r);
end;$$;

create function public.prepare_avatar_change(p_id uuid,p_hash text,p_size integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.avatar_changes;
begin
 select * into r from private.avatar_changes where id=p_id for update;
 if not found or r.state<>'pending' then raise exception 'avatar not pending' using errcode='40001';end if;
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_size is null or p_size not between 1 and 5242880 then raise exception 'invalid prepared avatar' using errcode='22023';end if;
 if r.expected_hash is not null and (r.expected_hash<>p_hash or r.expected_size<>p_size) then raise exception 'avatar bytes differ' using errcode='40001';end if;
 update private.avatar_changes set expected_hash=p_hash,expected_size=p_size,updated_at=clock_timestamp() where id=r.id returning * into r;
 return private.avatar_change_view(r);
end;$$;

create function public.verify_avatar_change(p_id uuid,p_hash text,p_size integer,p_object uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.avatar_changes;
begin
 select * into r from private.avatar_changes where id=p_id for update;
 if not found or r.state<>'pending' or r.expected_hash is null or r.expected_hash is distinct from p_hash or r.expected_size is distinct from p_size
 or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=r.object_path and id=p_object) then
  raise exception 'avatar verification differs' using errcode='40001';
 end if;
 update private.avatar_changes set verified_object=p_object,verified_at=clock_timestamp(),updated_at=clock_timestamp() where id=r.id;
end;$$;

create function public.finish_my_avatar_change(p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.avatar_changes; rev integer;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select avatar_revision into rev from public.profiles where id=auth.uid() and status='active';
 if rev is null then raise exception 'profile unavailable' using errcode='42501';end if;
 select * into r from private.avatar_changes where owner_id=auth.uid() and idempotency_key=p_key for update;
 if not found then raise exception 'avatar unavailable' using errcode='42501';end if;
 if r.state='applied' then return private.avatar_change_view(r);end if;
 if r.state<>'pending' or r.reference_revision<>rev then raise exception 'avatar reference changed' using errcode='40001';end if;
 if r.verified_at is null or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=r.object_path and id=r.verified_object) then raise exception 'avatar not verified' using errcode='40001';end if;
 update public.profiles set avatar_path=r.object_path where id=auth.uid() and status='active';
 update private.avatar_changes set state='applied',applied_at=clock_timestamp(),updated_at=clock_timestamp() where id=r.id returning * into r;
 return private.avatar_change_view(r);
end;$$;

create function public.abandon_my_avatar_change(p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.avatar_changes;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into r from private.avatar_changes where owner_id=auth.uid() and idempotency_key=p_key for update;
 if not found then raise exception 'avatar unavailable' using errcode='42501';end if;
 if r.state='applied' then raise exception 'avatar already applied' using errcode='40001';end if;
 update private.avatar_changes set state='abandoned',updated_at=clock_timestamp() where id=r.id returning * into r;
 return private.avatar_change_view(r);
end;$$;

create function public.avatar_cleanup_candidates(p_owner uuid,p_limit integer default 20) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid avatar cleanup limit' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'objectPath',object_path)) from (
  select c.id,c.object_path from private.avatar_changes c where c.owner_id=p_owner and c.state in ('abandoned','applied')
   and not exists(select 1 from public.profiles p where p.avatar_path=c.object_path)
  order by c.cleaned_at nulls first,c.updated_at,c.id limit p_limit
 ) eligible),'[]');
end;$$;
create function public.ack_avatar_cleanup(p_id uuid) returns void language sql security definer set search_path='' as $$
 update private.avatar_changes c set cleaned_at=clock_timestamp() where c.id=p_id and c.state in ('abandoned','applied')
 and not exists(select 1 from public.profiles p where p.avatar_path=c.object_path);
$$;

revoke all on function public.my_avatar_change(uuid),public.begin_my_avatar_change(uuid,text,integer,text,integer),public.finish_my_avatar_change(uuid),public.abandon_my_avatar_change(uuid),
 public.prepare_avatar_change(uuid,text,integer),public.verify_avatar_change(uuid,text,integer,uuid),public.avatar_cleanup_candidates(uuid,integer),public.ack_avatar_cleanup(uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.my_avatar_change(uuid),public.begin_my_avatar_change(uuid,text,integer,text,integer),public.finish_my_avatar_change(uuid),public.abandon_my_avatar_change(uuid) to authenticated;
grant execute on function public.prepare_avatar_change(uuid,text,integer),public.verify_avatar_change(uuid,text,integer,uuid),public.avatar_cleanup_candidates(uuid,integer),public.ack_avatar_cleanup(uuid) to service_role;

-- Managed objects cannot be injected by a browser or rebound by the legacy setter.
alter policy avatar_owner_insert on storage.objects with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text and (storage.foldername(name))[2] is distinct from 'managed' and public.my_session_valid());
do $migration$
declare src text; old text:=$old$p_path not like auth.uid()||'/%'$old$;
begin
 src:=pg_get_functiondef('public.set_my_avatar(text)'::regprocedure);
 if length(src)-length(replace(src,old,''))<>length(old) then raise exception 'Legacy avatar guard drift';end if;
 execute replace(src,old,$new$(p_path not like auth.uid()||'/%' or p_path like auth.uid()||'/managed/%')$new$);
end;
$migration$;
notify pgrst,'reload schema';
