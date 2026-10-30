CREATE OR REPLACE FUNCTION public.after_stock_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
  perform public.evaluate_stock_alert(new.care_recipient_id,new.product_id,new.source_location);
  perform public.evaluate_stock_alert(new.care_recipient_id,new.product_id,new.destination_location);return new;
end; $function$
