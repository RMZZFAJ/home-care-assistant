begin;

-- Compare the reviewed digital version while the selected row and dossier are locked.
create or replace function public.contingency_command(p_patient uuid,p_process text,p_id uuid,p_expected integer,p_action text,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.contingency_cases;e private.contingency_events;previous private.phase_d3_commands;h text;result jsonb;body jsonb;seq integer;person public.profiles;target public.operational_documents;report public.consumption_reports;cap text;
begin
 cap:=case when p_action in ('record','supplement') then 'contingency.report' else 'contingency.review' end;
 perform private.require_contingency(p_patient,p_process,cap,true);
 if p_key is null or p_action is null or p_action not in ('record','supplement','needs_clarification','link_existing') or p_body is null or pg_column_size(p_body)>64000 then raise exception 'invalid contingency command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('contingency-v1',p_patient,p_process,p_id,p_expected,p_action,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('contingency-intent:'||auth.uid()::text||':'||p_key::text,0));
 perform private.require_contingency(p_patient,p_process,cap,true);
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.intent_hash is distinct from h then raise exception 'contingency intention conflict' using errcode='23505';end if;
  return previous.result||jsonb_build_object('replayed',true);
 end if;
 select * into strict person from public.profiles where id=auth.uid() and status='active';
 if p_action='record' then
  if p_id is not null or p_expected is not null then raise exception 'new contingency required' using errcode='22023';end if;
  body:=private.contingency_content(p_patient,p_body);
  insert into private.contingency_cases(care_recipient_id,process,content,created_by,actor_name,actor_role)
  values(p_patient,p_process,body,auth.uid(),person.full_name,public.recipient_role(p_patient)) returning * into c;
 else
  select * into c from private.contingency_cases where id=p_id and care_recipient_id=p_patient and process=p_process for update;
  if not found then raise exception 'contingency unavailable' using errcode='42501';end if;
  perform private.require_contingency(p_patient,p_process,cap,true);
  select coalesce(max(sequence),0)+1 into seq from private.contingency_events where case_id=c.id;
  if p_expected is distinct from seq then raise exception 'contingency revision changed' using errcode='PT409';end if;
  if exists(select 1 from private.contingency_events where case_id=c.id and action='link_existing') then raise exception 'contingency already linked' using errcode='PT409';end if;
  if p_action='supplement' then body:=private.contingency_content(p_patient,p_body);
  else
   if c.created_by=auth.uid() or exists(select 1 from private.contingency_events where case_id=c.id and action='supplement' and actor_id=auth.uid()) then raise exception 'independent contingency reviewer required' using errcode='42501';end if;
   if jsonb_typeof(p_body) is distinct from 'object' or (p_body ?& array['reason','targetId']) is not true
    or exists(select 1 from jsonb_object_keys(p_body) x where x not in ('reason','targetId','targetVersion'))
    or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(btrim(p_body->>'reason')) not between 3 and 2000
    or jsonb_typeof(p_body->'targetId') not in ('null','string') then raise exception 'invalid reconciliation decision' using errcode='22023';end if;
   body:=p_body;
   if p_action='link_existing' then
    if p_body->>'targetId' is null or not private.creation_draft_uuid(p_body->'targetId')
     or jsonb_typeof(p_body->'targetVersion') is distinct from 'number' then
     raise exception 'existing reviewed reference required' using errcode='22023';
    end if;
    if p_process like 'CONSUMPTION_%' then
     select * into report from public.consumption_reports where id=(p_body->>'targetId')::uuid and care_recipient_id=p_patient and location=case p_process when 'CONSUMPTION_FAMILY' then 'FAMILY' else 'CARE_TEAM' end for share;
     if not found then raise exception 'consumption reference unavailable' using errcode='42501';end if;
     if p_body->'targetVersion' is distinct from to_jsonb(report.version) then
      raise exception 'contingency target revision changed' using errcode='PT409';
     end if;
     body:=body||jsonb_build_object('targetKind','consumption','targetRecordedAt',report.created_at,'targetVersion',report.version);
    else
     select * into target from public.operational_documents where id=(p_body->>'targetId')::uuid and care_recipient_id=p_patient and type=case p_process when 'RETURN' then 'ENT' else p_process end and status<>'draft' for share;
     if not found then raise exception 'document reference unavailable' using errcode='42501';end if;
     if p_process='RETURN' and (target.payload->>'source' is distinct from 'CARE_TEAM' or target.payload->>'destination' is distinct from 'FAMILY')
      or p_process='ENT' and (target.payload->>'source' is distinct from 'FAMILY' or target.payload->>'destination' is distinct from 'CARE_TEAM') then
      raise exception 'transfer direction does not match contingency' using errcode='22023';end if;
     if p_body->'targetVersion' is distinct from to_jsonb(target.version) then
      raise exception 'contingency target revision changed' using errcode='PT409';
     end if;
     body:=body||jsonb_build_object('targetKind','document','targetCode',target.code,'targetVersion',target.version,'targetRecordedAt',target.created_at);
    end if;
    if exists(select 1 from public.attachments where contingency_id=c.id and state='quarantine') then raise exception 'contingency evidence pending' using errcode='PT409';end if;
    body:=body||jsonb_build_object('evidence',coalesce((select jsonb_agg(jsonb_build_object('id',id,'sha256',sha256) order by id) from public.attachments where contingency_id=c.id and state='ready'),'[]'));
   elsif p_body->>'targetId' is not null or p_body ? 'targetVersion' then raise exception 'clarification cannot claim a linked reference' using errcode='22023';end if;
  end if;
  insert into private.contingency_events(case_id,sequence,action,body,actor_id,actor_name,actor_role)
  values(c.id,seq,p_action,body,auth.uid(),person.full_name,public.recipient_role(p_patient)) returning * into e;
 end if;
 result:=jsonb_build_object('caseId',c.id,'patientId',p_patient,'process',p_process,'action',p_action,'key',p_key,'actorId',auth.uid(),'revision',coalesce(e.sequence,0)+1,'recordedAt',coalesce(e.recorded_at,c.created_at),'persistence','confirmed');
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'contingency.'||p_action,'contingency',c.id,jsonb_build_object('care_recipient_id',p_patient,'revision',coalesce(e.sequence,0)+1));
 return result;
end;$$;

revoke all on function public.contingency_command(uuid, text, uuid, integer, text, jsonb, uuid) from public, anon, authenticated, service_role;
grant execute on function public.contingency_command(uuid, text, uuid, integer, text, jsonb, uuid) to authenticated;

create or replace function public.contingency_case_dossier(p_patient uuid, p_process text, p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  dossier jsonb;
  evidence jsonb;
begin
  if p_id is null then raise exception 'contingency dossier required' using errcode = '22023'; end if;
  dossier := public.contingency_cases(p_patient, p_process, p_id);
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'filename', a.filename, 'confirmedAt', a.confirmed_at)
    order by a.confirmed_at, a.id), '[]'::jsonb) into evidence
  from public.attachments a
  where a.contingency_id = p_id and a.care_recipient_id = p_patient and a.state = 'ready'
    and private.attachment_read(a.id);
  return dossier || jsonb_build_object(
    'evidence', evidence,
    'pendingEvidence', exists (
      select 1 from public.attachments a
      where a.contingency_id = p_id and a.care_recipient_id = p_patient and a.state = 'quarantine'
    ),
    'canReview', coalesce((dossier->>'canReview')::boolean, false) and not exists (
      select 1 from private.contingency_events e
      where e.case_id = p_id and e.action = 'supplement' and e.actor_id = auth.uid()
    )
  );
end;
$$;

revoke all on function public.contingency_case_dossier(uuid, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.contingency_case_dossier(uuid, text, uuid) to authenticated;

commit;
