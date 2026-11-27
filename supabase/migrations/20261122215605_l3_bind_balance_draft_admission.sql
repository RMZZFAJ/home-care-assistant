-- An admitted count must remain attached to its first documentary draft.
do $migration$
declare
  definition text:=pg_get_functiondef('public.create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
  anchor text:='if not p_draft then perform private.finish_bal_count((v_result->>''id'')::uuid,v_context);end if;';
  replacement text:=$body$
 if not p_draft then
   perform private.finish_bal_count((v_result->>'id')::uuid,v_context);
 elsif v_context ? 'admissionId' then
   update private.balance_count_admissions
   set document_id=(v_result->>'id')::uuid,
       initial_document_version=(v_result->>'version')::integer,
       document_version=(v_result->>'version')::integer
   where id=(v_context->>'admissionId')::uuid and care_recipient_id=p_patient
     and professional_id=auth.uid() and document_id is null and discarded_at is null;
   if not found then
     raise exception 'stale balance count subject' using errcode='PT409';
   end if;
 end if;
$body$;
begin
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
    raise exception 'L3 balance draft admission contract drift';
  end if;
  execute replace(definition,anchor,replacement);
end
$migration$;
