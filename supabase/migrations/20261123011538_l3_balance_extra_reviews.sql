begin;

alter table public.balance_reviews drop constraint balance_reviews_item_results_check;
alter table public.balance_reviews add constraint balance_reviews_item_results_check
  check (jsonb_typeof(item_results) = 'array' and jsonb_array_length(item_results) <= 1020);

-- Review the version locked by command_bal_review. Extra IDs live in the
-- count payload, independently of the lines eligible for stock reconciliation.
create or replace function private.validate_bal_review_items(p_id uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb; extras jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 1020 then
    raise exception 'invalid balance review items' using errcode = '22023';
  end if;
  if (select count(distinct value->>'lineId') from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then
    raise exception 'duplicate balance review item' using errcode = '22023';
  end if;
  select coalesce(payload->'balanceExtras', '[]'::jsonb) into strict extras
    from public.operational_documents where id = p_id and type = 'BAL';
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or (item - array['lineId', 'result', 'forwarding', 'comment']) <> '{}'::jsonb
      or jsonb_typeof(item->'lineId') is distinct from 'string'
      or jsonb_typeof(item->'result') is distinct from 'string'
      or item->>'result' not in ('confirmed', 'difference')
      or jsonb_typeof(item->'forwarding') is distinct from 'string'
      or item->>'forwarding' not in ('none', 'recount', 'adjustment')
      or (item->>'result' = 'confirmed') is distinct from (item->>'forwarding' = 'none')
      or jsonb_typeof(item->'comment') is distinct from 'string'
      or private.bal_comment_units(item->>'comment') > 500
      or (select count(*) from (
        select 1 from public.document_lines l where l.document_id = p_id and l.id::text = item->>'lineId'
        union all
        select 1 from jsonb_array_elements(extras) e where e->>'id' = item->>'lineId'
      ) matching_items) <> 1 then
      raise exception 'invalid or foreign balance review item' using errcode = '22023';
    end if;
  end loop;
end;$$;
revoke all on function private.validate_bal_review_items(uuid,jsonb) from public,anon,authenticated,service_role;

do $$
declare
  definition text := pg_get_functiondef('private.command_bal_review(uuid,jsonb,uuid,integer)'::regprocedure);
  anchor text := '''referenceRevision'',ctx->''referenceRevision'',''currentRevision'',ctx->''currentRevision''';
begin
  if length(definition) - length(replace(definition, anchor, '')) <> length(anchor) then
    raise exception 'BAL review snapshot contract drift';
  end if;
  execute replace(definition, anchor, '''extras'',coalesce(d.payload->''balanceExtras'',''[]''::jsonb),' || anchor);
end;$$;

commit;
