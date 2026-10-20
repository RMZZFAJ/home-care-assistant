revoke all on public.profiles, public.care_recipients, public.products,
  public.requisitions, public.requisition_items, public.requisition_observations,
  public.stock_movements, public.audit_events from anon;
revoke all on public.profiles, public.care_recipients, public.products,
  public.requisitions, public.requisition_items, public.requisition_observations,
  public.stock_movements, public.audit_events from public;

revoke all on function public.current_profile_role() from public;
revoke all on function public.find_product_by_alias(text) from public;
revoke all on function public.submit_requisition(uuid, uuid, jsonb, jsonb, jsonb) from public;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.find_product_by_alias(text) to authenticated;
grant execute on function public.submit_requisition(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;
