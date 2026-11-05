-- Implicit COM approval/validation must respect the same effective capabilities
-- as their explicit commands. A role never overrides an explicit denial.
do $migration$
declare definition text;anchor text;replacement text;
begin
 definition:=pg_get_functiondef('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 anchor:='v_recipient uuid;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit approval declaration anchor mismatch';end if;
 definition:=replace(definition,anchor,anchor||'v_auto_approve boolean:=false;');
 anchor:='select * into d from public.operational_documents where created_by=auth.uid() and idempotency_key=p_key;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit approval post-lock anchor mismatch';end if;
 definition:=replace(definition,anchor,'v_auto_approve:=p_type=''COM'' and not p_draft and public.recipient_role(p_patient)=''admin'' and coalesce(private.can(p_patient,''com.approve''),false);'||E'\n '||anchor);
 anchor:='case when p_type=''COM'' and public.recipient_role(p_patient)=''admin'' then q else 0 end';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit approval quantity anchor mismatch';end if;
 definition:=replace(definition,anchor,'case when v_auto_approve then q else 0 end');
 anchor:='case when public.recipient_role(p_patient)=''admin'' then ''approved'' else ''pending_approval'' end';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit approval state anchor mismatch';end if;
 definition:=replace(definition,anchor,'case when v_auto_approve then ''approved'' else ''pending_approval'' end');
 anchor:='perform private.record_document_event(d.id,lower(p_type)||case when p_draft then ''.draft'' else ''.issued'' end,p_payload,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit approval final authority anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if v_auto_approve then perform private.require_cap(p_patient,''com.approve'');end if;');

 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='v_consumed numeric;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit submit approval declaration anchor mismatch';end if;
 definition:=replace(definition,anchor,anchor||'v_auto_approve boolean:=false;');
 anchor:='perform private.emit_document(p_id);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit submit approval emission anchor mismatch';end if;
 replacement:='if d.type=''COM'' then
 v_auto_approve:=public.recipient_role(d.care_recipient_id)=''admin'' and coalesce(private.can(d.care_recipient_id,''com.approve''),false);
 update public.document_lines set approved_quantity=case when v_auto_approve then quantity else 0 end where document_id=p_id;
 end if;
 '||anchor;
 definition:=replace(definition,anchor,replacement);
 anchor:='case when public.recipient_role(d.care_recipient_id)=''admin'' then ''approved'' else ''pending_approval'' end';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit submit approval state anchor mismatch';end if;
 definition:=replace(definition,anchor,'case when v_auto_approve then ''approved'' else ''pending_approval'' end');
 anchor:='if public.recipient_role(d.care_recipient_id)=''admin'' then perform private.credit_purchase_receipt(r_id);else perform private.refresh_purchase_progress(p_id);end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit validation authority anchor mismatch';end if;
 definition:=replace(definition,anchor,'if public.recipient_role(d.care_recipient_id)=''admin'' and coalesce(private.can(d.care_recipient_id,''com.validate''),false) then perform private.credit_purchase_receipt(r_id);else perform private.refresh_purchase_progress(p_id);end if;');
 anchor:='perform private.record_document_event(p_id,lower(d.type)||''.''||p_action,p_body,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'implicit submit final authority anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if v_auto_approve then perform private.require_cap(d.care_recipient_id,''com.approve'');end if;');

 definition:=pg_get_functiondef('private.credit_purchase_receipt(uuid)'::regprocedure);
 anchor:='select * into strict d from public.operational_documents where id=r.document_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'receipt initial authority anchor mismatch';end if;
 definition:=replace(definition,anchor,anchor||E'\n perform private.require_cap(d.care_recipient_id,''com.validate'');');
 anchor:='perform private.refresh_purchase_progress(d.id);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'receipt final authority anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n perform private.require_cap(d.care_recipient_id,''com.validate'');');
end;$migration$;
