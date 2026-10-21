-- The worker writes through authorized transactional RPCs, never direct DML.
-- Normalize platform defaults so local development matches the hosted contract.
revoke all privileges on all tables in schema public from service_role;
revoke all privileges on all sequences in schema public from service_role;
alter default privileges for role postgres in schema public revoke all on tables from service_role;
alter default privileges for role postgres in schema public revoke all on sequences from service_role;
alter default privileges for role postgres in schema public revoke all on functions from service_role;

-- Extension-owned functions are platform objects, outside this application ACL.
do $$declare f record;begin
  for f in select p.oid::regprocedure signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  loop execute format('revoke all privileges on function %s from service_role',f.signature);end loop;
end;$$;

-- A signed webhook or access revocation may finish a job before its sender.
-- Reconciliation exposes only the persisted state, not destinations or payloads.
create or replace function public.notification_job_state(p_id uuid) returns text
language plpgsql stable security definer set search_path=public as $$
begin
  if coalesce(auth.role(),'')<>'service_role' and not coalesce(public.is_global_administrator(),false) then
    raise exception 'worker authorization required' using errcode='42501';
  end if;
  return (select state from public.requisition_notifications where id=p_id);
end;$$;

revoke all on function public.notification_job_state(uuid) from public,anon,authenticated,service_role;
grant usage on schema public to service_role;
grant execute on function public.notification_job_state(uuid) to authenticated,service_role;
grant execute on function public.claim_notification_jobs(integer,uuid,boolean),
  public.validate_notification_job(uuid,uuid),
  public.complete_notification_job(uuid,uuid,text,text,text),
  public.notification_webhook(text,text,uuid) to service_role;
