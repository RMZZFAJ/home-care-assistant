CREATE OR REPLACE FUNCTION public.bind_notification_template(p_id uuid, p_worker uuid, p_name text, p_version integer, p_language text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.meta_template_versions;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_id,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into t from public.meta_template_versions where name=p_name and version=p_version and language=p_language;
 if not found then return null;end if;
 update public.requisition_notifications set template_name=t.name,template_version=t.version,template_snapshot=t.definition where id=p_id;
 return t.definition||jsonb_build_object('name',t.name,'version',t.version,'language',t.language,'approval',t.approval);
end;$function$
