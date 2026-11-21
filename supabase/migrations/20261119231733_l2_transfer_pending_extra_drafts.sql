-- A transfer can preserve an unidentified extra in its private preparation.
-- Physical dispatch still requires all materials to have a catalogue identity.
do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
  anchor := $old$  if (p_content-array['documentVersion','fields','divergentIds','materials','observations'])$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer draft validator changed'; end if;
  definition := replace(definition, anchor, $new$  if p_content ? 'pendingExtras' then
    if p_purpose not in ('transfer_declare_family','transfer_declare_team') then
      raise exception 'pending extras require a transfer declaration draft' using errcode='22023';
    end if;
    perform private.normalized_pending_purchase_extras(p_content->'pendingExtras');
  end if;
  if (p_content-array['documentVersion','fields','divergentIds','materials','observations','pendingExtras'])$new$);
  execute definition;

  definition := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$  perform private.require_transfer_declaration_draft_intent(d.purpose,d.content,p_body->'body');$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer draft confirmation changed'; end if;
  definition := replace(definition, anchor, $new$  if private.normalized_pending_purchase_extras(d.content->'pendingExtras') <> '[]'::jsonb then
    raise exception 'identify pending extras before dispatch' using errcode='PT409';
  end if;
  perform private.require_transfer_declaration_draft_intent(d.purpose,d.content,p_body->'body');$new$);

  anchor := $old$  if (d.kind<>'COM' and (d.content#>'{form,pendingExtras}' is not null or p_body#>'{payload,pendingExtras}' is not null))$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply draft confirmation changed'; end if;
  definition := replace(definition, anchor, $new$  if d.kind='ENT' and private.normalized_pending_purchase_extras(d.content#>'{form,pendingExtras}') <> '[]'::jsonb then
    raise exception 'identify pending extras before dispatch' using errcode='PT409';
  end if;
  if (d.kind<>'COM' and p_body#>'{payload,pendingExtras}' is not null)$new$);
  execute definition;
end
$migration$;
