-- Public, non-personal compatibility marker introduced only after D3/D4 schema.
-- No table access, SECURITY DEFINER, mutation, session or patient information.
create function public.client_schema_contract() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('protocol',1,'schema',1);
$$;
revoke all on function public.client_schema_contract() from public,anon,authenticated,service_role;
grant execute on function public.client_schema_contract() to anon,authenticated,service_role;
