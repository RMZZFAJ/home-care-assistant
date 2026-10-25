-- Serialize recovery before reading idempotency state. A concurrent successful
-- count can close the assignment or change the inventory reference while this
-- transaction waits. Its committed document/event must win over new eligibility.
-- Keep the existing stock -> BAL lock order and all original RPC grants/guards.
do $migration$
declare
  v_signature text;
  v_patient text;
  v_definition text;
  v_guard text;
begin
  for v_signature, v_patient in
    select * from (values
      ('public.create_supply_document(uuid,text,jsonb,uuid,boolean)', 'p_patient'),
      ('public.revise_supply_document(uuid,jsonb,uuid,integer,boolean)', 'v_d.care_recipient_id'),
      ('public.supply_document_command(uuid,text,jsonb,uuid,integer)', 'v_d.care_recipient_id')
    ) as entrypoint(signature, patient_expression)
  loop
    v_definition := pg_catalog.pg_get_functiondef(v_signature::regprocedure);
    v_guard := 'perform private.require_cap(' || v_patient || ',''bal.read'');';
    if (length(v_definition) - length(replace(v_definition, v_guard, ''))) <> length(v_guard) then
      raise exception 'Unexpected BAL idempotency guard in %', v_signature;
    end if;
    execute replace(v_definition, v_guard,
      v_guard || E'\n perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''stock:''||'
      || v_patient || E'::text,0));\n ' || v_guard);
    -- The second guard checks current authority after waiting for the lock.
    -- Subsequent SPI queries see the committed result at READ COMMITTED.
  end loop;
end;
$migration$;
