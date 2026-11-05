CREATE OR REPLACE FUNCTION public.guard_stock_movement_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s numeric:=0;t numeric:=0;precision_limit integer;
begin
 if new.care_recipient_id is null then raise exception 'patient required';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||new.care_recipient_id,0));
 select quantity_decimals into precision_limit from public.care_recipient_products where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
 if new.quantity<>round(new.quantity,precision_limit) then raise exception 'incompatible product precision';end if;
 if new.source_location is null and new.destination_location is null or new.source_location=new.destination_location then raise exception 'invalid stock locations';end if;
 new.movement_revision:=nextval(pg_get_serial_sequence('public.stock_movements','movement_revision'));
 if new.source_location is not null then
 select coalesce(sum(case when destination_location=new.source_location then quantity else 0 end-case when source_location=new.source_location then quantity else 0 end),0)
 into s from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
 if s<new.quantity and not(new.extraordinary_confirmed and new.reference_type='extraordinary_adjustment' and public.is_global_administrator()) then raise exception 'insufficient stock' using errcode='23514';end if;
 new.source_balance_before:=s;new.source_balance_after:=s-new.quantity;
 end if;
 if new.destination_location is not null then
 select coalesce(sum(case when destination_location=new.destination_location then quantity else 0 end-case when source_location=new.destination_location then quantity else 0 end),0)
 into t from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
 new.destination_balance_before:=t;new.destination_balance_after:=t+new.quantity;
 end if;
 return new;
end;$function$
