CREATE OR REPLACE FUNCTION public.supply_document_command(p_id uuid, p_action text, p_body jsonb, p_key uuid, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_d public.operational_documents;v_context jsonb;v_result jsonb;v_event public.document_events;begin
 select * into v_d from public.operational_documents where id=p_id;
 if v_d.type='BAL' and p_action='approve' and v_d.payload->'balanceContext'->>'professionalId'=auth.uid()::text then raise exception 'distinct balance reviewer required' using errcode='42501';end if;
 if v_d.type='BAL' and p_action='approve' and p_body->>'group'='family' and not private.bal_family_authority(v_d.care_recipient_id,'bal.approve.family') then raise exception 'family approval required' using errcode='42501';end if;
 if v_d.type='BAL' and p_action='cancel' and exists(select 1 from public.bal_cycles where document_id=p_id and state='counted') then raise exception 'scheduled balance requires formal recount';end if;
 if v_d.type='BAL' and p_action='submit' and (exists(select 1 from public.bal_cycles where document_id=p_id) or exists(select 1 from public.bal_regimes where care_recipient_id=v_d.care_recipient_id and activated_at is not null)) then
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stock:'||v_d.care_recipient_id::text,0));
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 select * into v_event from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then if v_event.document_id<>p_id or v_event.action<>'bal.submit' or v_event.body->'event'<>p_body then raise exception 'idempotency payload mismatch';end if;return public.operational_document(p_id);end if;
 v_context:=private.bal_count_context(v_d.care_recipient_id,p_id,v_d.payload);
 update public.operational_documents set payload=(payload-'balanceContext')||jsonb_build_object('balanceContext',v_context) where id=p_id;
 v_result:=public.fluent_pre_shift_command(p_id,p_action,p_body,p_key,p_version);
 perform private.finish_bal_count(p_id,v_context);return v_result;end if;
 return public.fluent_pre_shift_command(p_id,p_action,p_body,p_key,p_version);
end;$function$
