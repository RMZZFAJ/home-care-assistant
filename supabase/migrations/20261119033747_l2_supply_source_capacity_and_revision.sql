-- A pending arrival does not enlarge the approved quantity attributable
-- to the selected COMs, even when other credits are present in FAMILY.
create function private.require_supply_purchase_capacity(
  p_patient uuid,p_payload jsonb,p_sources jsonb
) returns void language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from (
      select material.value as product_id, sum(line.accepted_quantity) as credited
      from jsonb_array_elements(p_sources) source
      join public.operational_documents d on d.id=(source->>'documentId')::uuid
        and d.care_recipient_id=p_patient and d.type='COM'
      cross join lateral jsonb_array_elements_text(source->'productIds') material
      join public.document_lines line on line.document_id=d.id and line.product_id=material.value
      group by material.value
    ) approved
    where (
      select sum((line->>'quantity')::numeric)
      from jsonb_array_elements(p_payload->'lines') line
      where line->>'productId'=approved.product_id
    ) > approved.credited
  ) then
    raise exception 'delivery exceeds approved source quantity' using errcode='PT409';
  end if;
end;
$$;

create function private.require_visible_existing_supply_sources(
  p_patient uuid,p_digest text
) returns void language plpgsql stable set search_path = '' as $$
begin
  if p_digest is not null and exists (
    select 1 from private.supply_source_sets s
    where s.care_recipient_id=p_patient and s.digest=p_digest
      and jsonb_array_length(s.sources) <>
        jsonb_array_length(private.visible_supply_sources(p_patient,p_digest))
  ) then
    raise exception 'existing supply sources require read permission' using errcode='42501';
  end if;
end;
$$;

revoke all on function private.require_supply_purchase_capacity(uuid,jsonb,jsonb),
  private.require_visible_existing_supply_sources(uuid,text) from public,anon,authenticated,service_role;

do $migration$
declare
  validate text := pg_get_functiondef('private.require_supply_sources(uuid,text,jsonb,jsonb)'::regprocedure);
  revision text := pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
  record_set constant text := '  insert into private.supply_source_sets(care_recipient_id,digest,sources)';
  revise_source constant text := ' perform private.require_supply_sources(p_patient,p_type,p_payload,v_sources);';
begin
  if strpos(validate,record_set)=0 or strpos(revision,revise_source)=0 then
    raise exception 'Unexpected source capacity validations';
  end if;
  execute replace(validate,record_set,$new$  if p_type='ENT' then
    perform private.require_supply_purchase_capacity(p_patient,p_payload,p_sources);
  end if;
$new$||record_set);
  execute replace(revision,revise_source,$new$ perform private.require_visible_existing_supply_sources(p_patient,d.payload->>'sourceSet');
$new$||revise_source);
end;
$migration$;
