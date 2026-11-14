-- P06: a schedule suggests an eligible person; it never performs their receipt.
create function private.delivery_recipient_context(p_patient uuid,p_source text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare people jsonb;shifts jsonb;suggested uuid;result jsonb;at_time timestamptz:=clock_timestamp();begin
 if p_source is null or p_source not in ('FAMILY','CARE_TEAM') then raise exception 'invalid delivery source' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role) order by p.full_name,m.user_id),'[]') into people
 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.status='active' and p.status='active' and m.user_id<>auth.uid()
 and private.member_can(p_patient,m.user_id,'ent.receive') and
 (m.role::text in ('admin',case when p_source='FAMILY' then 'professional' else 'family' end)
 or p_source='FAMILY' and m.role::text='supervisor');
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'professionalId',s.professional_id,'professionalName',p.full_name,'version',s.version,'startsAt',s.starts_at,'endsAt',s.ends_at) order by s.starts_at,s.id),'[]') into shifts
 from public.scheduled_shifts s join public.profiles p on p.id=s.professional_id
 where p_source='FAMILY' and s.care_recipient_id=p_patient and s.status='published' and s.starts_at<=at_time and s.ends_at>at_time
 and exists(select 1 from jsonb_array_elements(people) person where person->>'id'=s.professional_id::text);
 if (select count(distinct x->>'professionalId') from jsonb_array_elements(shifts) x)=1 then suggested:=(shifts->0->>'professionalId')::uuid;end if;
 result:=jsonb_build_object('source',p_source,'destination',case when p_source='FAMILY' then 'CARE_TEAM' else 'FAMILY' end,'people',people,'shifts',shifts,'suggestedId',suggested,
  'state',case when jsonb_array_length(people)=0 then 'no_eligible_recipient' when suggested is not null then 'suggested' when jsonb_array_length(shifts)>0 then 'ambiguous' else 'no_schedule' end);
 return result||jsonb_build_object('referenceHash',encode(extensions.digest(result::text,'sha256'),'hex'),'checkedAt',at_time);
end;$$;

create function public.delivery_preparation(p_patient uuid,p_source text) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 perform private.require_cap(p_patient,'ent.create');
 return private.delivery_recipient_context(p_patient,p_source);
end;$$;
revoke all on function public.delivery_preparation(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.delivery_preparation(uuid,text) to authenticated;

create function private.capture_delivery_selection(p_id uuid,p_payload jsonb,p_previous uuid,p_official boolean) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;context jsonb;selected jsonb;reason text;selection jsonb;history jsonb;begin
 select * into strict d from public.operational_documents where id=p_id;
 perform private.require_cap(d.care_recipient_id,'ent.create');
 context:=private.delivery_recipient_context(d.care_recipient_id,p_payload->>'source');
 select value into selected from jsonb_array_elements(context->'people') where value->>'id'=p_payload->>'recipientId';
 if selected is null then raise exception 'invalid designated recipient' using errcode='42501';end if;
 if p_payload ? 'recipientReason' and jsonb_typeof(p_payload->'recipientReason') is distinct from 'string' then raise exception 'invalid recipient selection reason' using errcode='22023';end if;
 reason:=btrim(coalesce(p_payload->>'recipientReason',''));
 if length(reason)>1000 or (reason<>'' and length(reason)<3) then raise exception 'invalid recipient selection reason' using errcode='22023';end if;
 if p_payload ? 'recipientReference' and (jsonb_typeof(p_payload->'recipientReference') is distinct from 'string' or coalesce(p_payload->>'recipientReference','')!~'^[0-9a-f]{64}$') then raise exception 'invalid recipient reference' using errcode='22023';end if;
 if p_payload ? 'recipientReference' and p_payload->>'recipientReference' is distinct from context->>'referenceHash' then raise exception 'stale delivery recipient reference' using errcode='P0001';end if;
 if ((p_official and (context->>'suggestedId' is distinct from selected->>'id')) or (p_previous is not null and p_previous::text is distinct from selected->>'id')) and length(reason)<3 then
  raise exception 'recipient selection reason required' using errcode='22023';end if;
 selection:=jsonb_build_object('recipientId',selected->>'id','recipientName',selected->>'name','recipientRole',selected->>'role',
  'suggestedId',context->'suggestedId','suggestionState',context->'state','shifts',context->'shifts','referenceHash',context->>'referenceHash',
  'manual',context->>'suggestedId' is distinct from selected->>'id','reason',nullif(reason,''),'previousRecipientId',p_previous,
  'selectedBy',auth.uid(),'selectedName',(select full_name from public.profiles where id=auth.uid()),'recordedAt',clock_timestamp(),'official',p_official);
 history:=coalesce(d.workflow_data->'recipientSelectionHistory','[]');
 if d.workflow_data ? 'recipientSelection' then history:=history||jsonb_build_array(d.workflow_data->'recipientSelection');end if;
 update public.operational_documents set workflow_data=workflow_data||jsonb_build_object('recipientSelection',selection,'recipientSelectionHistory',history) where id=p_id;
end;$$;

create function private.check_delivery_selection(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;context jsonb;begin
 select * into strict d from public.operational_documents where id=p_id;
 perform private.require_cap(d.care_recipient_id,'ent.create');
 context:=private.delivery_recipient_context(d.care_recipient_id,d.payload->>'source');
 if context->>'referenceHash' is distinct from d.workflow_data->'recipientSelection'->>'referenceHash' then raise exception 'stale delivery recipient reference' using errcode='P0001';end if;
end;$$;
revoke all on function private.delivery_recipient_context(uuid,text),private.capture_delivery_selection(uuid,jsonb,uuid,boolean),private.check_delivery_selection(uuid) from public,anon,authenticated,service_role;

-- Add guarded hooks to the retained engine, preserving previous migrations.
do $migration$
declare definition text;anchor text;replacement text;begin
 definition:=pg_get_functiondef('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 anchor:='then raise exception ''invalid designated recipient'';end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery recipient denial anchor mismatch';end if;
 definition:=replace(definition,anchor,'then raise exception ''invalid designated recipient'' using errcode=''42501'';end if;');
 anchor:=E' if not p_draft then\n perform private.emit_document(d.id);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery create selection anchor mismatch';end if;
 replacement:=E' if p_type=''ENT'' then perform private.capture_delivery_selection(d.id,p_payload,null,not p_draft);end if;\n'||anchor;
 definition:=replace(definition,anchor,replacement);
 anchor:='if v_auto_approve then perform private.require_cap(p_patient,''com.approve'');end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery create final anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if p_type=''ENT'' then perform private.check_delivery_selection(d.id);end if;');

 definition:=pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
 anchor:='perform private.record_document_event(p_id,lower(d.type)||case when p_recount then ''.recount'' else ''.draft_updated'' end,p_payload,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery revise selection anchor mismatch';end if;
 execute replace(definition,anchor,E'if d.type=''ENT'' then perform private.capture_delivery_selection(p_id,p_payload,d.recipient_id,false);end if;\n '||anchor||E'\n if d.type=''ENT'' then perform private.check_delivery_selection(p_id);end if;');

 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='perform private.emit_document(p_id);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery submit selection anchor mismatch';end if;
 definition:=replace(definition,anchor,E'if d.type=''ENT'' then perform private.capture_delivery_selection(p_id,d.payload,d.recipient_id,true);end if;\n '||anchor);
 anchor:='update public.operational_documents set recipient_id=v_actor where id=p_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery reassign selection anchor mismatch';end if;
 definition:=replace(definition,anchor,anchor||E'\n perform private.capture_delivery_selection(p_id,(d.payload-''recipientReference'')||jsonb_build_object(''recipientId'',v_actor,''recipientReason'',p_body->>''reason''),d.recipient_id,true);');
 anchor:='perform private.record_document_event(p_id,lower(d.type)||''.''||p_action,p_body,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery command final selection anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if d.type=''ENT'' and p_action in (''submit'',''reassign'') then perform private.check_delivery_selection(p_id);end if;');
end;$migration$;
