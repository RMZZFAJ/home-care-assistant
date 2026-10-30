CREATE OR REPLACE FUNCTION public.legacy_transition_requisition_status(p_requisition_id uuid, p_to_status requisition_status, p_reason text DEFAULT NULL::text)
 RETURNS requisitions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.requisitions; v_from public.requisition_status;
begin
  select * into r from public.requisitions where id=p_requisition_id for update;
  if not found or not public.recipient_can(r.care_recipient_id,'review') then raise exception 'status transition not authorized' using errcode='42501'; end if;
  if not coalesce((r.status,p_to_status) in (('submitted','under_review'),('submitted','cancelled'),('under_review','approved'),('under_review','cancelled'),('approved','separated'),('separated','delivered')),false)
    then raise exception 'invalid status transition'; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'transition reason required'; end if;
  v_from:=r.status;
  update public.requisitions set status=p_to_status,updated_at=now() where id=r.id returning * into r;
  update public.requisition_status_history set reason=trim(p_reason) where id=(select id from public.requisition_status_history where requisition_id=r.id order by changed_at desc,id desc limit 1);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'requisition.status.changed','requisition',r.id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'from',v_from,'to',p_to_status));
  return r;
end; $function$
