-- Match the existing SCI lock order: patient/workspace before document.
do $$declare v_definition text;v_anchor text;begin
 v_definition:=pg_get_functiondef('public.acknowledge_document_cancellation(uuid,uuid,uuid)'::regprocedure);
 v_anchor:='perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id for update;';
 if position(v_anchor in v_definition)=0 then raise exception 'cancellation lock contract drift';end if;
 execute replace(v_definition,v_anchor,'perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id;
 perform pg_advisory_xact_lock(hashtextextended(''stock:''||d.care_recipient_id,0));
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id for update;');

 -- A mandatory cancellation request stays in the internal queue even when
 -- optional channels/preferences are off. External delivery rules are intact.
 v_definition:=pg_get_functiondef('private.enqueue_notice(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid,boolean)'::regprocedure);
 v_anchor:='required boolean;begin';
 if position(v_anchor in v_definition)=0 then raise exception 'notice declaration contract drift';end if;
 v_definition:=replace(v_definition,v_anchor,'required boolean;v_cancellation_required boolean;begin');
 v_anchor:='required:=r.mode=''required'';';
 if position(v_anchor in v_definition)=0 then raise exception 'notice requirement contract drift';end if;
 v_definition:=replace(v_definition,v_anchor,'v_cancellation_required:=exists(select 1 from public.document_events e join public.operational_documents d on d.id=e.document_id
  where e.id=p_document_event and e.document_id=p_document and e.care_recipient_id=p_patient and d.protocol is not null
  and e.action=p_event and e.action in (''req.status'',''com.cancel'',''ent.cancel'',''ent.consent_cancel'',''bal.cancel'') and e.body->>''status''=''cancelled''
  and private.member_can(p_patient,p_user,lower(d.type)||''.read'') and private.requisition_family_representative(p_patient,p_user));
 required:=r.mode=''required'' or v_cancellation_required;');
 v_anchor:='if coalesce(r.cooldown_minutes,0)>0 and exists(';
 if position(v_anchor in v_definition)=0 then raise exception 'notice cooldown contract drift';end if;
 execute replace(v_definition,v_anchor,'if not(v_cancellation_required and v_channel=''internal'') and coalesce(r.cooldown_minutes,0)>0 and exists(');
end;$$;
notify pgrst,'reload schema';
