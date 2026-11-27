begin;

do $$
declare
  definition text;
  anchor text;
  selective text := $condition$p_recount and (d.status <> 'draft' or p_payload#>>'{balanceContext,kind}' is not distinct from 'recount')$condition$;
begin
  definition := pg_get_functiondef('private.creation_draft_navigation_valid(jsonb,text,text,jsonb)'::regprocedure);
  anchor := $old$when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])$old$;
  if length(definition) - length(replace(definition, anchor, '')) <> length(anchor) then
    raise exception 'unexpected off-shift BAL draft navigation';
  end if;
  execute replace(definition, anchor, $new$when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','bal_confirmation','count','bal_extras','bal_notes'])$new$);

  definition := pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
  anchor := $old$p_recount and p_payload#>>'{balanceContext,kind}'='recount'$old$;
  if length(definition) - length(replace(definition, anchor, '')) <> length(anchor) then
    raise exception 'unexpected BAL previous identity check';
  end if;
  definition := replace(definition, anchor, selective);
  anchor := $old$p_recount and p_payload#>>'{balanceContext,kind}' is not distinct from 'recount'$old$;
  if length(definition) - length(replace(definition, anchor, '')) <> length(anchor) then
    raise exception 'unexpected BAL catalogue coverage check';
  end if;
  execute replace(definition, anchor, selective);
end;$$;

commit;
