-- Browser/server compatibility reads use anon or the initiating Auth session.
-- The worker role has no consumer for this public marker and remains closed.
revoke execute on function public.client_schema_contract() from service_role;
