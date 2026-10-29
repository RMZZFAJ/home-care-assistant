CREATE OR REPLACE FUNCTION public.revise_supply_document(p_id uuid, p_payload jsonb, p_key uuid, p_version integer, p_recount boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_d public.operational_documents;v_context jsonb;v_result jsonb;v_event public.document_events;begin
 select * into v_d from public.operational_documents where id=p_id;
 if v_d.type='BAL' and (exists(select 1 from public.bal_cycles where document_id=p_id) or exists(select 1 from public.bal_regimes where care_recipient_id=v_d.care_recipient_id and activated_at is not null)) then
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stock:'||v_d.care_recipient_id::text,0));
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 select * into v_event from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then if v_event.document_id<>p_id or (v_event.body->'event')-'balanceContext'<>p_payload-'balanceContext' or v_event.action<>(case when p_recount then 'bal.recount' else 'bal.draft_updated' end) then raise exception 'idempotency payload mismatch';end if;return public.operational_document(p_id);end if;
 v_context:=private.bal_count_context(v_d.care_recipient_id,p_id,p_payload);
 if p_recount and v_context->>'kind'<>'recount' then raise exception 'formal recount assignment required';end if;
 p_payload:=(p_payload-'balanceContext')||jsonb_build_object('balanceContext',v_context);
 update public.operational_documents set workflow_data=workflow_data||jsonb_build_object('referenceRevision',private.team_revision(v_d.care_recipient_id)) where id=p_id;v_result:=public.fluent_pre_shift_revise(p_id,p_payload,p_key,p_version,p_recount);
 if p_recount then perform private.finish_bal_count(p_id,v_context);end if;return v_result;end if;
 return public.fluent_pre_shift_revise(p_id,p_payload-'balanceContext'-'balanceAssignment',p_key,p_version,p_recount);
end;$function$
