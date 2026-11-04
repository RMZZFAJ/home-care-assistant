CREATE OR REPLACE FUNCTION private.finish_bal_count(p_id uuid, p_context jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_cycle uuid:=(p_context->>'cycleId')::uuid;v_assignment uuid:=(p_context->>'assignmentId')::uuid;v_current_week date:=date_trunc('week',now() at time zone (p_context->>'timezone'))::date;begin
 update public.bal_cycles set document_id=p_id,state='counted',counted_at=now() where id=v_cycle;
 update public.bal_assignments set status='counted',version=version+1 where id=v_assignment;
 update public.bal_obligations set state=case when week_start=v_current_week then 'counted' else 'regularized' end,
 count_document_id=case when week_start=v_current_week then p_id end,regularized_by=case when week_start<>v_current_week then p_id end,
 actual_count_at=now() where cycle_id=v_cycle and state='pending';
 update public.bal_deferrals set status='stale',decided_at=now() where cycle_id=v_cycle and status='pending';
 perform private.bal_event((select care_recipient_id from public.bal_cycles where id=v_cycle),v_cycle,v_assignment,'bal.cycle.counted','Contagem física atual registrada; atrasos anteriores preservados',p_context,'count:'||p_id||':'||(select version from public.operational_documents where id=p_id));
end;$function$
