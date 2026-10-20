-- The submission RPC owns the complete atomic write and must not depend on
-- direct UPDATE privileges for the authenticated client role.
alter function public.submit_requisition(
  uuid, uuid, text, jsonb, jsonb, jsonb
) security definer;

alter function public.submit_requisition(
  uuid, uuid, text, jsonb, jsonb, jsonb
) set search_path = public, extensions;

revoke all on function public.submit_requisition(
  uuid, uuid, text, jsonb, jsonb, jsonb
) from public, anon;

grant execute on function public.submit_requisition(
  uuid, uuid, text, jsonb, jsonb, jsonb
) to authenticated;
