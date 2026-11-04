CREATE OR REPLACE FUNCTION public.create_supply_document(p_patient uuid, p_type text, p_payload jsonb, p_key uuid, p_draft boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_context jsonb;v_result jsonb;v_existing public.operational_documents;begin
 if p_type='BAL' and exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and activated_at is not null) then
 perform private.require_cap(p_patient,'bal.read');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stock:'||p_patient::text,0));
 perform private.require_cap(p_patient,'bal.read');
 select * into v_existing from public.operational_documents where care_recipient_id=p_patient and created_by=auth.uid() and idempotency_key=p_key and type='BAL';
 if found then if v_existing.payload-'balanceContext'<>p_payload-'balanceContext' then raise exception 'idempotency payload mismatch';end if;return public.operational_document(v_existing.id);end if;
 v_context:=private.bal_count_context(p_patient,null,p_payload);
 p_payload:=(p_payload-'balanceContext')||jsonb_build_object('balanceContext',v_context);
 v_result:=public.fluent_pre_shift_create(p_patient,p_type,p_payload,p_key,p_draft);
 update public.bal_cycles set document_id=(v_result->>'id')::uuid where id=(v_context->>'cycleId')::uuid;
 if not p_draft then perform private.finish_bal_count((v_result->>'id')::uuid,v_context);end if;
 return v_result;end if;
 return public.fluent_pre_shift_create(p_patient,p_type,p_payload-'balanceContext'-'balanceAssignment',p_key,p_draft);
end;$function$
