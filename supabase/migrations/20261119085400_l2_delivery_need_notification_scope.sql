-- Bind the pending line independently of the command's active row.
do $migration$
declare
  definition text := replace(pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure),chr(13)||chr(10),chr(10));
  anchor text := replace($old$select 1 from public.document_lines l where l.document_id=d.id
     and (p_action='receive' or l.id=(p_body->>'lineId')::uuid)
     and (p_action<>'resolve' or l.accepted_quantity+l.reconciled_quantity=l.quantity)
     and private.delivery_need_context(d,l) and private.delivery_need_reassessment(l) and private.current_delivery_need(l) is null$old$,chr(13)||chr(10),chr(10));
begin
  if strpos(definition,anchor)=0 then raise exception 'delivery notice line scope anchor missing'; end if;
  execute replace(definition,anchor,$new$select 1 from public.document_lines need_line where need_line.document_id=d.id
     and (p_action='receive' or need_line.id=(p_body->>'lineId')::uuid)
     and (p_action<>'resolve' or need_line.accepted_quantity+need_line.reconciled_quantity=need_line.quantity)
     and private.delivery_need_context(d,need_line) and private.delivery_need_reassessment(need_line)
     and private.current_delivery_need(need_line) is null$new$);
end;
$migration$;

-- The same committed event may already have generated a generic receipt alert.
-- One internal alert to each eligible family member carries the pending action.
create or replace function private.notify_delivery_need(d public.operational_documents, p_event uuid)
returns void language sql set search_path='' as $$
  insert into public.requisition_notifications (
    care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel,event_key,include_pdf
  )
  select d.care_recipient_id,d.id,p_event,m.user_id,
    case m.role::text when 'family' then 'family' else 'other' end,
    p.full_name,'internal','ent.fulfillment_review_requested',false
  from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
  where m.care_recipient_id=d.care_recipient_id
    and m.user_id is distinct from auth.uid()
    and private.family_fulfillment_authorized(m.care_recipient_id,m.user_id)
    and private.member_can(m.care_recipient_id,m.user_id,'ent.read')
  on conflict(document_event_id,recipient_user_id,channel) where document_event_id is not null
  do update set event_key=excluded.event_key, include_pdf=false;
$$;
