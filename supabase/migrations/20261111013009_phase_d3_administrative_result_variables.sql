-- Keep result variables distinct from columns in the applied private schema.
create or replace function public.administrative_preparation_command(
  p_patient uuid,p_mode text,p_purpose text,p_subject uuid,p_action text,p_key uuid,
  p_id uuid,p_revision integer,p_fields jsonb,p_reference_hash text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare draft private.administrative_preparations;command private.administrative_preparation_commands;
  intent text;v_outcome jsonb;receipt jsonb;v_state text;self_transition boolean:=false;target_user uuid;
begin
  if private.auth_session() is null then raise exception 'administrative preparation unavailable' using errcode='42501';end if;
  if p_key is null or p_revision is null or p_revision not between 0 and 2147483646 or (p_id is null)<>(p_revision=0)
    or p_action is null or p_action not in ('save','commit','discard','acknowledge')
    or (p_action in ('save','commit') and (p_fields is null or coalesce(p_reference_hash,'')!~'^[a-f0-9]{64}$'))
    or (p_action in ('discard','acknowledge') and (p_id is null or p_fields is not null or p_reference_hash is not null))
    or octet_length(p_fields::text)>4000 then raise exception 'invalid administrative command' using errcode='22023';end if;
  intent:=encode(extensions.digest(jsonb_build_array(p_patient,p_mode,p_purpose,p_subject,p_action,p_id,p_revision,p_fields,p_reference_hash)::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('administrative-preparation-key:'||auth.uid()||':'||p_key,0));
  select c.* into command from private.administrative_preparation_commands c join private.administrative_preparations d on d.id=c.preparation_id
    where c.owner_id=auth.uid() and c.key=p_key;
  if found then
    if command.intent_hash<>intent then raise exception 'administrative preparation intent differs' using errcode='23505';end if;
    if not(command.self_transition and command.session_id=private.auth_session()) then
      perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,false);
    end if;
    return command.receipt;
  end if;
  perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);
  perform pg_advisory_xact_lock(hashtextextended(jsonb_build_array('administrative-preparation-slot',auth.uid(),p_patient,p_mode,p_purpose,p_subject)::text,0));
  perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);
  select * into draft from private.administrative_preparations where owner_id=auth.uid() and patient_id=p_patient and mode=p_mode
    and purpose=p_purpose and subject_id is not distinct from p_subject and administrative_preparations.state in ('active','consumed') for update;
  if draft.id is distinct from p_id or coalesce(draft.revision,0)<>p_revision
    or (draft.state='consumed' and p_action<>'acknowledge')
    or (p_action='acknowledge' and draft.state is distinct from 'consumed') then
    raise exception 'stale administrative preparation revision' using errcode='PT409';end if;
  if p_action in ('save','commit') then perform private.validate_administrative_preparation_fields(p_purpose,p_subject,p_fields);end if;
  if p_action='commit' then
    perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
    perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);
    v_outcome:=private.commit_administrative_preparation(p_patient,p_mode,p_purpose,p_subject,p_fields,p_reference_hash,p_key);
    target_user:=coalesce(p_subject,nullif(p_fields->>'userId','')::uuid);
    if p_mode='patient' and p_purpose in ('membership','membershipStatus') and target_user=auth.uid()
      and not public.can_manage_recipient(p_patient) then
      self_transition:=private.admin_assurance() and exists(select 1 from private.authority_sessions
        where session_id=private.auth_session() and user_id=auth.uid() and mode='patient' and care_recipient_id=p_patient)
        and v_outcome->>'kind'='local' and v_outcome->>'userId'=auth.uid()::text and exists(
          select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=auth.uid()
            and ((p_purpose='membership' and m.status='active' and m.role::text=p_fields->>'role')
              or (p_purpose='membershipStatus' and m.status=p_fields->>'status')));
    end if;
  end if;
  if not self_transition then perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);end if;
  v_state:=case p_action when 'save' then 'active' when 'commit' then 'consumed' when 'discard' then 'discarded' else 'acknowledged' end;
  if p_id is null then
    insert into private.administrative_preparations(owner_id,patient_id,mode,purpose,subject_id,revision,state,fields,reference_hash,outcome)
      values(auth.uid(),p_patient,p_mode,p_purpose,p_subject,1,v_state,case when p_action='save' then p_fields end,
        case when p_action='save' then p_reference_hash end,v_outcome) returning * into draft;
  else
    update private.administrative_preparations d set revision=d.revision+1,state=v_state,
      fields=case when p_action='save' then p_fields end,reference_hash=case when p_action='save' then p_reference_hash end,
      outcome=case when p_action='acknowledge' then d.outcome else v_outcome end,saved_at=clock_timestamp()
      where d.id=p_id returning * into draft;
  end if;
  receipt:=jsonb_build_object('ownerId',auth.uid(),'patientId',p_patient,'mode',p_mode,'purpose',p_purpose,'targetId',p_subject,
    'key',p_key,'action',p_action,'id',draft.id,'revision',draft.revision,'state',v_state,'outcome',draft.outcome);
  insert into private.administrative_preparation_commands(owner_id,key,preparation_id,session_id,self_transition,intent_hash,receipt)
    values(auth.uid(),p_key,draft.id,private.auth_session(),self_transition,intent,receipt);
  return receipt;
end;
$$;
