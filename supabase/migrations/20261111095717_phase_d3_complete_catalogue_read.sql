-- A JSON collection is one PostgREST value, not a truncated table result.
-- Keep the caller's grants/RLS and one stable snapshot for items/successors.
create function public.catalogue_workspace(p_patient uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare items jsonb;guidance jsonb;
begin
  if auth.uid() is null or not public.can_access_recipient(p_patient) then
    raise exception 'catalogue read authorization required' using errcode='42501';
  end if;
  select
    coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.name,c.product_id)
      from public.care_recipient_products c where c.care_recipient_id=p_patient),'[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('product_id',s.product_id,'successor_product_id',s.successor_product_id) order by s.product_id)
      from public.catalogue_successors s where s.care_recipient_id=p_patient),'[]'::jsonb)
    into items,guidance;
  return jsonb_build_object('careRecipientId',p_patient,'items',items,
    'total',jsonb_array_length(items),'successors',guidance);
end;$$;

revoke all on function public.catalogue_workspace(uuid) from public,anon,authenticated,service_role;
grant execute on function public.catalogue_workspace(uuid) to authenticated;
notify pgrst,'reload schema';
