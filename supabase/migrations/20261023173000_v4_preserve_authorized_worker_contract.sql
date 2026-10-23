-- Preserve the existing global-administrator RPC contract after wrapping jobs.
-- Both wrappers delegate to guards requiring an active global context or service
-- identity, and still validate worker ownership and the unexpired lease.
begin;
grant execute on function public.complete_notification_job(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.validate_notification_job(uuid,uuid) to authenticated;
commit;
