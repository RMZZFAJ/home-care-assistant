grant select on public.profiles to authenticated;
grant select on public.care_recipients to authenticated;
grant select on public.products to authenticated;
grant select, insert on public.requisitions to authenticated;
grant select, insert on public.requisition_items to authenticated;
grant select, insert on public.requisition_observations to authenticated;
grant select on public.stock_movements to authenticated;
grant select, insert on public.audit_events to authenticated;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.find_product_by_alias(text) to authenticated;
grant execute on function public.submit_requisition(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;
