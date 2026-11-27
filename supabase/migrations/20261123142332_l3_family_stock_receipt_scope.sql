-- Confirmed receipts remain available to the author with current family stock access.
create or replace function public.family_stock_operation_result(p_patient uuid, p_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare operation private.family_stock_operations;
begin
  if not (coalesce(private.can(p_patient, 'stock.family.read'), false)
    or coalesce(private.can(p_patient, 'stock.family.manage'), false)) then
    raise exception 'family stock receipt access required' using errcode='42501';
  end if;
  select o.* into operation from private.family_stock_operations o
    where o.care_recipient_id=p_patient and o.actor_id=auth.uid() and o.command_key=p_key;
  if not found then return null; end if;
  return private.family_stock_operation_receipt(operation);
end;
$$;

revoke all on function public.family_stock_operation_result(uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.family_stock_operation_result(uuid,uuid) to authenticated;
