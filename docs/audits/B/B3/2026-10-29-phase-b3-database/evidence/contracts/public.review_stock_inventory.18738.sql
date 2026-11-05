CREATE OR REPLACE FUNCTION public.review_stock_inventory(p_inventory_id uuid, p_action text, p_reason text DEFAULT NULL::text)
 RETURNS stock_inventories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or not public.recipient_can(i.care_recipient_id,'review') then raise exception 'inventory review authorization required' using errcode='42501'; end if;
  if p_action is null or p_action not in ('under_review','rejected','cancelled') or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'invalid inventory review'; end if;
  if i.status in ('approved','rejected','cancelled') or p_action='under_review' and i.status<>'submitted' or p_action='rejected' and i.status not in ('submitted','under_review') then raise exception 'invalid inventory transition'; end if;
  update public.stock_inventories set status=p_action,review_reason=trim(p_reason) where id=i.id returning * into i;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.'||p_action,'stock_inventory',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id,'reason',trim(p_reason)));
  return i;
end; $function$
