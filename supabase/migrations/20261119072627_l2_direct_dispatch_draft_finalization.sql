-- Direct dispatch changes its own preparation reference when moving stock.
-- Keep live recipient/actor checks after journaling and preserve legacy intent checks.
do $migration$
declare
  body text := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  party_check text := $old$if not private.transfer_party_eligible(d.care_recipient_id,(d.content#>>'{fields,counterpartyId}')::uuid,d.content#>>'{fields,source}')$old$;
  reference_check text := $old$if d.content#>>'{fields,referenceHash}' is distinct from private.transfer_preparation(d.care_recipient_id,d.content#>>'{fields,source}')->>'referenceHash' then raise exception 'stale private transfer preparation after journal'$old$;
begin
  if strpos(body, party_check) = 0 or strpos(body, reference_check) = 0 then
    raise exception 'Unexpected post-journal transfer draft checks';
  end if;
  body := replace(body, party_check, $new$if (p_body#>>'{body,mode}' is distinct from 'direct'
    and not private.transfer_party_eligible(d.care_recipient_id,nullif(d.content#>>'{fields,counterpartyId}','')::uuid,d.content#>>'{fields,source}'))$new$);
  execute replace(body, reference_check, $new$if p_body#>>'{body,mode}' is distinct from 'direct'
    and d.content#>>'{fields,referenceHash}' is distinct from private.transfer_preparation(d.care_recipient_id,d.content#>>'{fields,source}')->>'referenceHash' then raise exception 'stale private transfer preparation after journal'$new$);
end;
$migration$;
