CREATE OR REPLACE FUNCTION public.document_navigation_context(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('patientId',d.care_recipient_id,'displayName',c.display_name,'type',d.type)
 from public.operational_documents d join public.care_recipients c on c.id=d.care_recipient_id
 where d.id=p_id and private.auth_session() is not null and private.member_can(d.care_recipient_id,auth.uid(),lower(d.type)||'.read');
$function$
