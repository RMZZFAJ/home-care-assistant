-- Controlled fault injection stays inside this rollback-only regression.
-- Other suites exercise the original helper with real Auth and HTTP workers.
begin;
select pg_temp.assume_context('global');
create temporary sequence claim_retry_attempts;
create temporary table claim_retry_effects(attempt integer);

create or replace function public.fluent_pre_retry_claim_jobs(p_limit integer,p_worker_id uuid,p_external_enabled boolean default false)
returns setof public.requisition_notifications language plpgsql security definer set search_path='' as $$
declare attempt integer;result public.requisition_notifications;
begin
 attempt:=nextval('pg_temp.claim_retry_attempts');
 insert into pg_temp.claim_retry_effects values(attempt);
 result.id:=p_worker_id;
 return next result;
 if attempt<3 then raise exception 'injected aborted claim' using errcode='40P01';end if;
end;
$$;

do $$declare worker uuid:=gen_random_uuid();rows integer;begin
 select count(*) into rows from public.claim_notification_jobs(1,worker,false);
 if rows<>1 or (select count(*) from pg_temp.claim_retry_effects)<>1
  or (select max(attempt) from pg_temp.claim_retry_effects)<>3 then
  raise exception 'Claim recovery leaked aborted results or effects';
 end if;
end;$$;

create or replace function public.fluent_pre_retry_claim_jobs(p_limit integer,p_worker_id uuid,p_external_enabled boolean default false)
returns setof public.requisition_notifications language plpgsql security definer set search_path='' as $$
begin
 perform nextval('pg_temp.claim_retry_attempts');
 insert into pg_temp.claim_retry_effects values(999);
 raise exception 'persistent injected conflict' using errcode='40P01';
end;
$$;
do $$begin
 begin
  perform public.claim_notification_jobs(1,gen_random_uuid(),false);
  raise exception 'Persistent claim conflict must remain visible';
 exception when deadlock_detected then
  if currval('pg_temp.claim_retry_attempts')<>6 then raise exception 'Claim recovery must be bounded';end if;
 end;
 if (select count(*) from pg_temp.claim_retry_effects)<>1 then raise exception 'Failed claim effects survived';end if;
end;$$;
select 'passed: aborted claims roll back fully, return once and stop after three attempts';
rollback;
