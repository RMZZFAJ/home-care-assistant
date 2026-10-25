-- Consistent user lock order reduces contention from overlapping patient scopes.
create or replace function private.invalidate_workspace() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_data jsonb;pid uuid;u uuid;n bigint;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=(row_data->>'care_recipient_id')::uuid;
 for u in
  select affected.user_id from (
   select user_id from public.care_recipient_memberships where care_recipient_id=pid and status='active'
   union select (row_data->>'user_id')::uuid where row_data->>'user_id' is not null
  ) affected order by affected.user_id
 loop
  insert into private.workspace_revisions(user_id,revision) values(u,1)
  on conflict(user_id) do update set revision=private.workspace_revisions.revision+1 returning revision into n;
  perform realtime.send(jsonb_build_object('revision',n),'invalidate','hca:user:'||u::text,true);
 end loop;
 return null;
end;
$$;
revoke all on function private.invalidate_workspace() from public,anon,authenticated,service_role;

-- A claim can touch several patients. Recover only an aborted database batch;
-- no provider send occurs in this transaction. Each exception block rolls back
-- its leases, attempts and invalidations before another bounded attempt.
-- https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-DEADLOCKS
alter function public.claim_notification_jobs(integer,uuid,boolean) rename to fluent_pre_retry_claim_jobs;
revoke all on function public.fluent_pre_retry_claim_jobs(integer,uuid,boolean) from public,anon,authenticated,service_role;

create function public.claim_notification_jobs(p_limit integer,p_worker_id uuid,p_external_enabled boolean default false)
returns setof public.requisition_notifications language plpgsql security definer set search_path='' as $$
declare attempt integer;
begin
 if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role' then
  raise exception 'worker authorization required' using errcode='42501';
 end if;
 if p_worker_id is null then raise exception 'worker identity required';end if;
 for attempt in 1..3 loop
  begin
   return query select * from public.fluent_pre_retry_claim_jobs(p_limit,p_worker_id,p_external_enabled);
   return;
  exception when deadlock_detected then
   if attempt=3 then raise;end if;
   perform pg_catalog.pg_sleep(0.01*attempt+pg_catalog.random()*0.02);
  end;
 end loop;
end;
$$;
revoke all on function public.claim_notification_jobs(integer,uuid,boolean) from public,anon;
grant execute on function public.claim_notification_jobs(integer,uuid,boolean) to authenticated,service_role;
