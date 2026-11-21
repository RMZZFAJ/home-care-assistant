-- Later row/FK waits can follow the patient lock. Validate the actual command
-- again after its nested writes/events; a refusal rolls the whole fact back.
do $migration$
declare definition text;anchor text;replacement text;
begin
 definition:=pg_get_functiondef('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 anchor:='perform private.record_document_event(d.id,lower(p_type)||case when p_draft then ''.draft'' else ''.issued'' end,p_payload,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'supply creation final capability anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n perform private.require_cap(p_patient,v_cap);');

 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='perform private.record_document_event(p_id,lower(d.type)||''.''||p_action,p_body,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase final command capability anchor mismatch';end if;
 replacement:=anchor||E'\n if d.type=''COM'' then
 perform private.require_cap(d.care_recipient_id,case p_action
 when ''submit'' then ''com.create'' when ''approve'' then ''com.approve'' when ''purchase'' then ''com.purchase''
 when ''receive'' then ''com.receive'' when ''validate_receipt'' then ''com.validate'' when ''reject_receipt'' then ''com.validate'' when ''cancel'' then ''com.approve'' end);
 if p_action=''receive'' and exists(select 1 from public.purchase_receipts where document_id=p_id and submitted_by=auth.uid() and submission_key=p_key and state=''approved'') then perform private.require_cap(d.care_recipient_id,''com.validate'');end if;
 end if;';
 execute replace(definition,anchor,replacement);
end;$migration$;
