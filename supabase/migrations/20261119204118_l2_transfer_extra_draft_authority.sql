-- A caller may omit the classification. If supplied, it must match the saved
-- transfer draft. The matching draft remains the authority for every line.
create or replace function private.transfer_with_catalogue_extras(p_content jsonb, p_body jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  if exists (
    select 1 from jsonb_array_elements(p_body->'lines') line
    where line ? 'catalogueExtra' and (
      line->'catalogueExtra' is distinct from 'true'::jsonb
      or p_content->'fields'->>(line->>'productId' || ':transferExtra') is distinct from '1'
    )
  ) then
    raise exception 'transfer catalogue extras differ from the private draft' using errcode = '22023';
  end if;
  return jsonb_set(p_body, '{lines}', (
    select jsonb_agg(case when p_content->'fields'->>(line->>'productId' || ':transferExtra') = '1'
      then line || '{"catalogueExtra":true}'::jsonb else line end order by position)
    from jsonb_array_elements(p_body->'lines') with ordinality as entry(line, position)
  ));
end;
$$;

revoke all on function private.transfer_with_catalogue_extras(jsonb,jsonb) from public, anon, authenticated, service_role;
