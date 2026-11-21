-- L1 changes publication audiences and conscious family fulfillment payloads.
-- Older clients must reload before operating against the consolidated contract.
create or replace function public.client_schema_contract() returns jsonb
language sql stable set search_path = ''
as $$ select jsonb_build_object('protocol',1,'schema',2) $$;
revoke all on function public.client_schema_contract() from public,anon,authenticated,service_role;
grant execute on function public.client_schema_contract() to anon,authenticated;
