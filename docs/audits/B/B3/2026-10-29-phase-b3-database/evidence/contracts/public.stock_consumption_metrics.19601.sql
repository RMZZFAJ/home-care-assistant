CREATE OR REPLACE FUNCTION public.stock_consumption_metrics(p_patient uuid, p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then raise exception 'invalid metrics period';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',x.product_id,'location',x.source_location,
 'quantity',x.total::text,'movements',x.movements,'days',ceil(extract(epoch from(p_to-p_from))/86400),
 'averagePerDay',(x.total/(extract(epoch from(p_to-p_from))/86400))::text))
 from(select product_id,source_location,sum(quantity) total,count(*) movements
 from public.stock_movements where care_recipient_id=p_patient and created_at>=p_from and created_at<p_to
 and destination_location is null and reference_type='consumption'
 and (family and source_location='FAMILY' or team and source_location='CARE_TEAM')
 group by product_id,source_location)x),'[]');
end;$function$
