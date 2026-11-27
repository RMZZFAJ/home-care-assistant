-- During the authorized window, keep the valid admission on the first count
-- even when the caller omits its identifier. After expiry the key stays required.
do $migration$
declare
  definition text := pg_get_functiondef('private.bal_count_context(uuid,uuid,jsonb)'::regprocedure);
  previous text := 'case when admission_id is not null then jsonb_build_object';
  revised text := 'case when admission_id is not null or (p_document is null and admission.id is not null) then jsonb_build_object';
begin
  if (length(definition) - length(replace(definition, previous, ''))) / length(previous) <> 1 then
    raise exception 'L3 first BAL admission contract drift';
  end if;
  execute replace(definition, previous, revised);
end
$migration$;
