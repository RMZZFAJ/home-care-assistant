-- NOT-05: the global technical view needs the stored attempt/result, not a
-- patient-scoped payload. This projection grants no retry or patient authority.
create function public.operations_notification_attempts(p_source text,p_page integer default 1,p_size integer default 20)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; total bigint; entries jsonb;
begin
 if not public.is_global_administrator() then
  raise exception 'global authorization required' using errcode='42501';
 end if;
 if p_source is null or p_source not in ('notices','web_push') or p_page is null
 or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 50 then
  raise exception 'invalid technical notification page' using errcode='22023';
 end if;
 if p_source='notices' then
  select count(*) into total from public.requisition_notifications;
  select coalesce(jsonb_agg(x.item order by x.created_at desc,x.id desc),'[]'::jsonb) into entries from (
   select n.id,n.created_at,jsonb_build_object(
    'id',n.id,'channel',n.channel,'state',n.state,'createdAt',n.created_at,
    'attemptedAt',n.attempted_at,'recordedAttemptCount',n.attempts,
    'providerReferenceRecorded',coalesce(n.provider_reference is not null and n.provider_reference<>'internal',false),
    'errorRecorded',n.last_error is not null,'historyCoverage','last_result_only','attempts','[]'::jsonb
   ) item from public.requisition_notifications n order by n.created_at desc,n.id desc
   offset ((p_page-1)*p_size) limit p_size
  ) x;
 else
  select count(*) into total from private.web_push_deliveries;
  select coalesce(jsonb_agg(x.item order by x.created_at desc,x.id desc),'[]'::jsonb) into entries from (
   select d.id,d.created_at,jsonb_build_object(
    'id',d.id,'channel','web_push','state',d.state,'createdAt',d.created_at,
    'attemptedAt',d.dispatch_started_at,'recordedAttemptCount',d.attempts,
    'providerReferenceRecorded',false,'errorRecorded',d.last_error is not null,
    'historyCoverage','recorded_attempts','attempts',coalesce((select jsonb_agg(jsonb_build_object(
     'id',a.id,'ordinal',a.ordinal,'startedAt',a.started_at,'completedAt',a.completed_at,
     'outcome',a.outcome,'errorRecorded',a.error_code is not null
    ) order by a.ordinal,a.id) from private.web_push_attempts a where a.delivery_id=d.id),'[]'::jsonb)
   ) item from private.web_push_deliveries d order by d.created_at desc,d.id desc
   offset ((p_page-1)*p_size) limit p_size
  ) x;
 end if;
 result:=jsonb_build_object('environment','shared_database','source',p_source,
  'consultedAt',clock_timestamp(),'page',p_page,'pageSize',p_size,'total',total,'data',entries);
 if not public.is_global_administrator() then
  raise exception 'global authorization required' using errcode='42501';
 end if;
 return result;
end;$$;
revoke all on function public.operations_notification_attempts(text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.operations_notification_attempts(text,integer,integer) to authenticated;
