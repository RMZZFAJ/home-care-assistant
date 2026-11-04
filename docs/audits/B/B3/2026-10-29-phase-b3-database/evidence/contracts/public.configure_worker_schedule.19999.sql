CREATE OR REPLACE FUNCTION public.configure_worker_schedule(p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or length(p_token) not between 32 and 512 then raise exception 'scoped worker secret required' using errcode='42501';end if;
 select id into sid from vault.secrets where name='hca_worker_url';
 if sid is null then perform vault.create_secret('https://home-care-assistant.vercel.app/api/notifications/worker','hca_worker_url');
 else perform vault.update_secret(sid,'https://home-care-assistant.vercel.app/api/notifications/worker');end if;
 select id into sid from vault.secrets where name='hca_worker_bearer';
 if sid is null then perform vault.create_secret(p_token,'hca_worker_bearer');else perform vault.update_secret(sid,p_token);end if;
end;$function$
