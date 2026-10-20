create or replace function public.transition_requisition_status(
  p_requisition_id uuid,
  p_to_status public.requisition_status,
  p_reason text default null
) returns public.requisitions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requisition public.requisitions;
  v_allowed boolean := false;
  v_role public.profile_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.status = 'active';
  if v_role not in ('admin', 'supervisor') then
    raise exception 'status transition not authorized';
  end if;

  select r.* into v_requisition
  from public.requisitions r
  where r.id = p_requisition_id
  for update;
  if not found or not public.can_access_recipient(v_requisition.care_recipient_id) then
    raise exception 'requisition not found';
  end if;

  v_allowed := (v_requisition.status, p_to_status) in (
    ('submitted', 'under_review'),
    ('submitted', 'cancelled'),
    ('under_review', 'approved'),
    ('under_review', 'cancelled'),
    ('approved', 'separated'),
    ('separated', 'delivered')
  );
  if not v_allowed then
    raise exception 'invalid status transition';
  end if;
  if p_to_status = 'cancelled' and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'cancellation reason required';
  end if;

  update public.requisitions
  set status = p_to_status, updated_at = now()
  where id = p_requisition_id
  returning * into v_requisition;

  update public.requisition_status_history
  set reason = nullif(trim(p_reason), '')
  where requisition_id = p_requisition_id
    and to_status = p_to_status
    and changed_at = (
      select max(changed_at)
      from public.requisition_status_history
      where requisition_id = p_requisition_id
    );

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'requisition.status.changed', 'requisition', p_requisition_id,
    jsonb_build_object('to_status', p_to_status, 'reason', nullif(trim(p_reason), ''))
  );
  return v_requisition;
end;
$$;

revoke all on function public.transition_requisition_status(uuid, public.requisition_status, text) from public;
grant execute on function public.transition_requisition_status(uuid, public.requisition_status, text) to authenticated;
