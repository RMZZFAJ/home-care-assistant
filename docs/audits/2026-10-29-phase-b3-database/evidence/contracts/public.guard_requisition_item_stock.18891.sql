CREATE OR REPLACE FUNCTION public.guard_requisition_item_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.current_stock is null and not coalesce((select is_historical from public.requisitions where id=new.requisition_id),false) then
    raise exception 'current stock required for operational requisition' using errcode='23514';
  end if;
  return new;
end; $function$
