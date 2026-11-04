CREATE OR REPLACE FUNCTION public.requisition_fulfillments(p_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if cardinality(p_ids)>100 then raise exception 'invalid batch';end if;
 if exists(select 1 from public.requisitions where id=any(p_ids) and not private.can(care_recipient_id,'req.read')) then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_object_agg(id,public.requisition_fulfillment(id)) from public.requisitions where id=any(p_ids)),'{}');
end;$function$
