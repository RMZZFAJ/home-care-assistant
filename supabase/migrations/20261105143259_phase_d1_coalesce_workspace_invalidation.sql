-- Deduplicate per transaction and emit its final revision at commit. This is
-- invalidation, not delivery of private operational data or a monitoring panel.
create table private.workspace_invalidation_queue (
 transaction_id bigint not null,
 user_id uuid not null,
 primary key(transaction_id,user_id)
);
alter table private.workspace_invalidation_queue enable row level security;
revoke all on table private.workspace_invalidation_queue from public,anon,authenticated,service_role;

create function private.flush_workspace_invalidation()
returns trigger language plpgsql security definer set search_path='' as $$
declare revision bigint;target uuid;
begin
 delete from private.workspace_invalidation_queue where transaction_id=new.transaction_id and user_id=new.user_id returning user_id into target;
 if not found then return null;end if;
 select r.revision into strict revision from private.workspace_revisions r where user_id=target;
 perform realtime.send(jsonb_build_object('revision',revision),'invalidate','hca:user:'||target::text,true);
 return null;
end;$$;
revoke all on function private.flush_workspace_invalidation() from public,anon,authenticated,service_role;
create constraint trigger workspace_invalidation_at_commit after insert on private.workspace_invalidation_queue
 deferrable initially deferred for each row execute function private.flush_workspace_invalidation();

CREATE OR REPLACE FUNCTION private.invalidate_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare row_data jsonb;pid uuid;profile_id uuid;u uuid;n bigint;
begin
 if tg_op='UPDATE' and old is not distinct from new then return null;end if;
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=(row_data->>'care_recipient_id')::uuid;
 if tg_table_schema='public' and tg_table_name='profiles' then profile_id:=(row_data->>'id')::uuid;end if;
 for u in select distinct affected.user_id from (
  select user_id from public.care_recipient_memberships where care_recipient_id=pid and status='active'
  union select (row_data->>'user_id')::uuid
  union select (row_data->>'proposed_by')::uuid
  union select (row_data->>'approved_by')::uuid
  union select profile_id
  union select peer.user_id from public.care_recipient_memberships owner join public.care_recipient_memberships peer on peer.care_recipient_id=owner.care_recipient_id and peer.status='active' where owner.user_id=profile_id and owner.status='active'
  union select id from public.profiles where profile_id is not null and role='admin' and global_scope and status='active'
 ) affected where affected.user_id is not null order by affected.user_id
 loop
  insert into private.workspace_invalidation_queue(transaction_id,user_id) values(txid_current(),u) on conflict do nothing;
  if found then
   insert into private.workspace_revisions(user_id,revision) values(u,1)
   on conflict(user_id) do update set revision=private.workspace_revisions.revision+1;
  end if;
 end loop;
 return null;
end;$function$;
