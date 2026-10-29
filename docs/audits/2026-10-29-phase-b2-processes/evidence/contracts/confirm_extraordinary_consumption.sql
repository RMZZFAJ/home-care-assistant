CREATE OR REPLACE FUNCTION public.confirm_extraordinary_consumption(p_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.consumption_reports;x jsonb;q numeric;begin
 select * into r from public.consumption_reports where id=p_id;
 if not found then raise exception 'report not found';end if;
 perform private.require_cap(r.care_recipient_id,case r.location when 'FAMILY' then 'stock.family.manage' else 'consumption.confirm' end);
 perform pg_advisory_xact_lock(hashtextextended('stock:'||r.care_recipient_id,0));
 select * into r from public.consumption_reports where id=p_id for update;
 if r.status<>'reported' then return;end if;
 if p_accept and r.kind='consumption' then
 if jsonb_array_length(r.lines)=0 then raise exception 'structured confirmation required';end if;
 for x in select value from jsonb_array_elements(r.lines) loop
 q:=(x->>'quantity')::numeric;
 if q is null or q<=0 or q>1000000000 or not exists(select 1 from public.care_recipient_products where care_recipient_id=r.care_recipient_id and product_id=x->>'productId' and unit=x->>'unit') then raise exception 'ambiguous consumption';end if;
 perform private.move_stock(r.care_recipient_id,x->>'productId',q,r.location,null,'Consumo extraordinário confirmado','consumption',r.id);
 end loop;end if;
 update public.consumption_reports set status=case when p_accept then 'confirmed' else 'rejected' end,confirmed_by=auth.uid(),confirmed_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'consumption.reviewed','consumption',p_id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'accepted',p_accept,'kind',r.kind));
end;$function$
