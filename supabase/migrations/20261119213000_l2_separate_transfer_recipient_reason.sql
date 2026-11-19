-- Direct declarations with numbered observations preserve the recipient
-- selection justification separately. Legacy declarations keep their notes.
do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('public.create_transfer_declaration(uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$'recipientReason',v_reason,'notes',v_reason,'lines',p_body->'lines'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer recipient selection anchor missing'; end if;
  execute replace(definition, anchor, $new$'recipientReason',v_reason,
    'notes',case when p_body ? 'observations' then '' else v_reason end,'lines',p_body->'lines'$new$);
end;
$migration$;
