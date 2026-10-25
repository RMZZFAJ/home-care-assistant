-- Reject ledger changes between beginning the physical count and submission.
do $$declare v_def text;v_old text;begin
 v_def:=pg_get_functiondef('public.balance_workspace(uuid)'::regprocedure);
 v_old:='''enabled'',coalesce(v_enabled,false),';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected balance read model';end if;
 execute replace(v_def,v_old,'''referenceRevision'',private.team_revision(p_patient)::text,''enabled'',coalesce(v_enabled,false),');
 v_def:=pg_get_functiondef('private.bal_count_context(uuid,uuid,jsonb)'::regprocedure);
 v_old:='perform pg_advisory_xact_lock(hashtextextended(''stock:''||p_patient,0));';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected balance stock lock';end if;
 execute replace(v_def,v_old,v_old||' if nullif(p_payload->''balanceAssignment''->>''referenceRevision'','''') is null or (p_payload->''balanceAssignment''->>''referenceRevision'')::bigint<>private.team_revision(p_patient) then raise exception ''inventory reference changed'' using errcode=''40001'';end if;');
 v_def:=pg_get_functiondef('public.revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
 v_old:='v_result:=public.fluent_pre_shift_revise(p_id,p_payload,p_key,p_version,p_recount);';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected balance revision wrapper';end if;
 execute replace(v_def,v_old,'update public.operational_documents set workflow_data=workflow_data||jsonb_build_object(''referenceRevision'',private.team_revision(v_d.care_recipient_id)) where id=p_id;'||v_old);
end;$$;

-- Schedule context is authored by the database, including for direct RPC callers.
do $$declare v_def text;begin
 v_def:=pg_get_functiondef('public.create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 execute replace(v_def,'return public.fluent_pre_shift_create(p_patient,p_type,p_payload,p_key,p_draft);','return public.fluent_pre_shift_create(p_patient,p_type,p_payload-''balanceContext''-''balanceAssignment'',p_key,p_draft);');
 v_def:=pg_get_functiondef('public.revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
 execute replace(v_def,'return public.fluent_pre_shift_revise(p_id,p_payload,p_key,p_version,p_recount);','return public.fluent_pre_shift_revise(p_id,p_payload-''balanceContext''-''balanceAssignment'',p_key,p_version,p_recount);');
end;$$;
