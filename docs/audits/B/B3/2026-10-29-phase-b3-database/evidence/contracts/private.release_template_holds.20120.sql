CREATE OR REPLACE FUNCTION private.release_template_holds()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if new.approval='APPROVED' and old.approval is distinct from new.approval then
 update public.requisition_notifications set next_attempt_at=now(),attempts=0,last_error=null where state='pending' and next_attempt_at='infinity'::timestamptz and last_error in ('TEMPLATE_NOT_APPROVED','DOCUMENT_TEMPLATE_NOT_CONFIGURED') and template_name=new.name and template_version=new.version;
 end if;return null;
end;$function$
