-- New planning documents defer the physical acquisition to its own act.
-- Historical purchase and donation payloads still pass the previous contract.
create or replace function private.require_purchase_origin(p_payload jsonb) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_payload ? 'acquisitionMode' then
    if p_payload->'acquisitionMode' = '"planned"'::jsonb and not (p_payload ? 'origin') then
      return;
    end if;
  elsif p_payload->>'origin' in ('purchase', 'donation') then
    return;
  end if;
  raise exception 'purchase origin required' using errcode = '22023';
end;
$$;
revoke all on function private.require_purchase_origin(jsonb) from public, anon, authenticated, service_role;
