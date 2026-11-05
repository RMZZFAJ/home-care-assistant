CREATE OR REPLACE FUNCTION public.stock_history(p_patient uuid, p_product text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_location text DEFAULT NULL::text, p_page integer DEFAULT 1, p_size integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_size is null or p_size not between 1 and 100 or p_location is not null and p_location not in ('FAMILY','CARE_TEAM','TRANSIT') then raise exception 'invalid history filter';end if;
 return (with scoped as(select * from public.stock_movements where care_recipient_id=p_patient
 and (family or team and (source_location in ('CARE_TEAM','TRANSIT') or destination_location in ('CARE_TEAM','TRANSIT')))
 and (p_product is null or product_id=p_product) and (p_from is null or created_at>=p_from) and (p_to is null or created_at<p_to)
 and (p_location is null or source_location=p_location or destination_location=p_location)),
 paged as(select * from scoped order by created_at desc,id desc limit p_size offset (p_page-1)*p_size)
 select jsonb_build_object('total',(select count(*) from scoped),'data',coalesce((select jsonb_agg(to_jsonb(x)-'payload_hash'-'idempotency_key' order by x.created_at desc,x.id desc) from (
 select s.id,s.product_id,s.quantity::text,s.movement_type,s.source_location,s.destination_location,s.justification,s.created_at,s.performed_by,s.reference_type,s.reference_id,
 case when family or s.source_location<>'FAMILY' then s.source_balance_before end source_balance_before,
 case when family or s.source_location<>'FAMILY' then s.source_balance_after end source_balance_after,
 case when family or s.destination_location<>'FAMILY' then s.destination_balance_before end destination_balance_before,
 case when family or s.destination_location<>'FAMILY' then s.destination_balance_after end destination_balance_after
 from paged s) x),'[]')));
end;$function$
