CREATE OR REPLACE FUNCTION private.invoke_notification_worker()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare endpoint text;bearer text;begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='hca_worker_url';
 select decrypted_secret into bearer from vault.decrypted_secrets where name='hca_worker_bearer';
 if endpoint is distinct from 'https://home-care-assistant.vercel.app/api/notifications/worker' or length(coalesce(bearer,''))<32 then return;end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('content-type','application/json','authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=120000);
end;$function$
