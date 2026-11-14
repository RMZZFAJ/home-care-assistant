create table private.administrative_preparations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  patient_id uuid not null references public.care_recipients(id),
  mode text not null check(mode in ('patient','global')),
  purpose text not null check(purpose in ('alertRule','notificationRecipient','membership','membershipStatus')),
  subject_id uuid references public.profiles(id),
  revision integer not null check(revision>0),
  state text not null check(state in ('active','discarded','consumed','acknowledged')),
  fields jsonb, reference_hash text, outcome jsonb,
  saved_at timestamptz not null default clock_timestamp(),
  check((state='active')=(fields is not null and reference_hash is not null)),
  check((state in ('consumed','acknowledged'))=(outcome is not null)),
  check((purpose='membershipStatus' and subject_id is not null)
    or (purpose='membership') or (purpose in ('alertRule','notificationRecipient') and subject_id is null))
);
create unique index administrative_preparation_slot on private.administrative_preparations(
  owner_id,patient_id,mode,purpose,subject_id
) nulls not distinct where state in ('active','consumed');
create index administrative_preparation_patient_fk on private.administrative_preparations(patient_id);
create index administrative_preparation_subject_fk on private.administrative_preparations(subject_id);
create table private.administrative_preparation_commands (
  owner_id uuid not null references public.profiles(id),key uuid not null,
  preparation_id uuid not null references private.administrative_preparations(id),
  session_id uuid not null, self_transition boolean not null default false,
  intent_hash text not null,receipt jsonb not null,
  primary key(owner_id,key)
);
create index administrative_preparation_command_fk on private.administrative_preparation_commands(preparation_id);
alter table private.administrative_preparations enable row level security;
alter table private.administrative_preparation_commands enable row level security;
revoke all on private.administrative_preparations,private.administrative_preparation_commands from public,anon,authenticated,service_role;

create function private.require_administrative_preparation_scope(
  p_patient uuid,p_mode text,p_purpose text,p_subject uuid,p_write boolean
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_patient is null or p_mode is null or p_mode not in ('patient','global')
    or p_purpose is null or p_purpose not in ('alertRule','notificationRecipient','membership','membershipStatus')
    or (p_purpose='membershipStatus' and p_subject is null)
    or (p_purpose in ('alertRule','notificationRecipient') and p_subject is not null) then
    raise exception 'invalid administrative preparation scope' using errcode='22023';
  end if;
  if private.auth_session() is null then
    raise exception 'administrative preparation unavailable' using errcode='42501';
  end if;
  if p_mode='global' then
    if not public.is_global_administrator() then
      raise exception 'administrative preparation unavailable' using errcode='42501';
    end if;
  elsif not public.can_access_recipient(p_patient) then
    raise exception 'administrative preparation unavailable' using errcode='42501';
  end if;
  if not p_write then return;end if;
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
    raise exception 'administrative preparation unavailable' using errcode='42501';
  end if;
  if p_mode='patient' then
    perform private.require_cap(p_patient,'access.manage');
    if p_purpose<>'alertRule' and not public.can_manage_recipient(p_patient) then
      raise exception 'local administrator required' using errcode='42501';
    end if;
  end if;
  if p_subject is not null and not exists(select 1 from public.care_recipient_memberships
    where care_recipient_id=p_patient and user_id=p_subject) then
    raise exception 'administrative subject unavailable' using errcode='42501';
  end if;
end;
$$;

create function private.validate_administrative_preparation_fields(p_purpose text,p_subject uuid,p_fields jsonb)
returns void language plpgsql set search_path='' as $$
declare limits jsonb;flags text[];
begin
  if p_purpose='alertRule' then
    limits:='{"productId":120,"location":16,"lowThreshold":64,"criticalThreshold":64}';flags:=array['isEnabled'];
  elsif p_purpose='notificationRecipient' then
    limits:='{"recipientUserId":36,"recipientGroup":16,"channel":16,"destination":254}';flags:=array['isEnabled','includeTeamAlerts'];
  elsif p_purpose='membership' then
    limits:='{"userId":36,"role":16}';flags:=array['canManageStock','canCountStock'];
  else limits:='{"status":16}';flags:=array[]::text[];end if;
  if jsonb_typeof(p_fields) is distinct from 'object' or octet_length(p_fields::text)>4000 then
    raise exception 'invalid administrative fields' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_each_text(limits) field where
      jsonb_typeof(p_fields->field.key) is distinct from 'string' or private.bal_comment_units(p_fields->>field.key)>field.value::integer)
    or exists(select 1 from unnest(flags) flag where jsonb_typeof(p_fields->flag) is distinct from 'boolean')
    or exists(select 1 from jsonb_object_keys(p_fields) field where not limits?field and not field=any(flags))
    or (p_purpose='alertRule' and p_fields->>'location' not in ('FAMILY','CARE_TEAM'))
    or (p_purpose='notificationRecipient' and (p_fields->>'recipientGroup' not in ('family','supervision','care_team','other')
      or p_fields->>'channel' not in ('internal','whatsapp','email')))
    or (p_purpose='membership' and (p_fields->>'role' not in ('admin','family','professional','supervisor','reader')
      or (p_subject is not null and p_subject::text<>p_fields->>'userId')))
    or (p_purpose='membershipStatus' and p_fields->>'status' not in ('active','revoked'))
    or (p_purpose in ('membership','notificationRecipient') and
      coalesce(nullif(p_fields->>(case when p_purpose='membership' then 'userId' else 'recipientUserId' end),''),'00000000-0000-0000-0000-000000000000')
      !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') then
    raise exception 'invalid administrative fields' using errcode='22023';
  end if;
end;
$$;

create function private.administrative_preparation_reference(
  p_patient uuid,p_mode text,p_purpose text,p_subject uuid,p_selection text,p_option text
) returns jsonb language plpgsql set search_path='' as $$
declare current_value jsonb;subject jsonb;member_status text;v integer;eligible boolean:=false;subject_user uuid;
begin
  if length(p_selection)>120 or length(p_option)>16 then raise exception 'invalid administrative selection' using errcode='22023';end if;
  if p_subject is not null then p_selection:=p_subject::text;end if;
  if p_mode='global' then select coalesce((select version from public.patient_settings where care_recipient_id=p_patient),1) into v;end if;
  if p_purpose='alertRule' then
    if p_option is not null and p_option not in ('FAMILY','CARE_TEAM') then raise exception 'invalid administrative selection' using errcode='22023';end if;
    select jsonb_build_object('id',product_id,'name',name,'unit',unit,'decimals',quantity_decimals,'active',is_active) into subject
      from public.care_recipient_products where care_recipient_id=p_patient and product_id=p_selection;
    select jsonb_build_object('lowThreshold',low_threshold::text,'criticalThreshold',critical_threshold::text,'isEnabled',is_enabled) into current_value
      from public.stock_alert_rules where care_recipient_id=p_patient and product_id=p_selection and location::text=p_option;
    eligible:=subject->'active'='true'::jsonb;
  else
    if p_selection is not null and p_selection !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' then
      raise exception 'invalid administrative selection' using errcode='22023';
    end if;
    subject_user:=coalesce(p_subject,p_selection::uuid);
    select jsonb_build_object('id',p.id,'name',p.full_name,'active',p.status='active'),m.status into subject,member_status
      from public.profiles p left join public.care_recipient_memberships m on m.user_id=p.id and m.care_recipient_id=p_patient
      where p.id=subject_user and (m.user_id is not null or p_mode='global');
    eligible:=subject->'active'='true'::jsonb and (member_status is not null or p_mode='global');
    if p_purpose='notificationRecipient' then
      if p_option is not null and p_option not in ('internal','whatsapp','email') then raise exception 'invalid administrative selection' using errcode='22023';end if;
      eligible:=eligible and member_status='active';
      select jsonb_build_object('recipientGroup',recipient_group,'channel',channel,'destination',coalesce(destination,''),
        'includeTeamAlerts',include_team_alerts,'isEnabled',is_enabled) into current_value
        from public.recipient_notification_settings where care_recipient_id=p_patient and recipient_user_id=subject_user and channel=p_option;
    else
      select jsonb_build_object('userId',user_id,'role',role,'status',status,'canManageStock',can_manage_stock,'canCountStock',can_count_stock) into current_value
        from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=subject_user;
    end if;
  end if;
  return jsonb_build_object('hash',encode(extensions.digest(jsonb_build_array(p_patient,p_mode,p_purpose,p_subject,p_selection,p_option,v,subject,member_status,current_value)::text,'sha256'),'hex'),
    'version',v,'subject',subject,'current',current_value,'eligible',coalesce(eligible,false));
end;
$$;

create function private.commit_administrative_preparation(
  p_patient uuid,p_mode text,p_purpose text,p_subject uuid,p_fields jsonb,p_hash text,p_key uuid
) returns jsonb language plpgsql set search_path='' as $$
declare reference jsonb;args jsonb;result jsonb;low numeric;critical numeric;factor text;key text;value text;
begin
  reference:=private.administrative_preparation_reference(p_patient,p_mode,p_purpose,p_subject,
    nullif(coalesce(p_fields->>'productId',p_fields->>'recipientUserId',p_fields->>'userId'),''),
    coalesce(p_fields->>'location',p_fields->>'channel'));
  if reference->>'hash' is distinct from p_hash then raise exception 'stale administrative preparation reference' using errcode='PT409';end if;
  if reference->'eligible'<>'true'::jsonb then raise exception 'administrative subject unavailable' using errcode='22023';end if;
  args:=p_fields||jsonb_build_object('action',p_purpose,'careRecipientId',p_patient);
  if p_purpose='alertRule' then
    foreach key in array array['lowThreshold','criticalThreshold'] loop
      value:=replace(p_fields->>key,',','.');
      if value !~ '^[0-9]+([.][0-9]+)?$' or length(value)>64 then raise exception 'invalid product threshold precision' using errcode='22023';end if;
      factor:=(value::numeric)::text;
      args:=jsonb_set(args,array[key],to_jsonb(factor));
    end loop;
    low:=(args->>'lowThreshold')::numeric;critical:=(args->>'criticalThreshold')::numeric;
    if low<0 or low>1000000000 or critical<0 or critical>low
      or low<>round(low,(reference->'subject'->>'decimals')::integer)
      or critical<>round(critical,(reference->'subject'->>'decimals')::integer) then
      raise exception 'invalid product threshold precision' using errcode='22023';
    end if;
  elsif p_purpose='notificationRecipient' then
    args:=jsonb_set(args,'{destination}',to_jsonb(btrim(args->>'destination')));
  elsif p_purpose='membershipStatus' then
    args:=args||jsonb_build_object('userId',p_subject);
  end if;
  if p_mode='global' then
    result:=public.configure_patient_access(p_patient,case when p_purpose='membership' then 'membership' else 'administration' end,
      case when p_purpose='membership' then jsonb_build_object('userId',args->>'userId','role',args->>'role')
        else jsonb_build_object('operation',p_purpose,'args',args) end,p_key,(reference->>'version')::integer);
    if result->>'status'<>'pending' or result->>'id' is null then raise exception 'administrative proposal unavailable' using errcode='42501';end if;
    return jsonb_build_object('kind','proposal','proposalId',result->'id');
  end if;
  case p_purpose
  when 'alertRule' then result:=to_jsonb(public.configure_stock_alert(p_patient,args->>'productId',args->>'location',low,critical,(args->>'isEnabled')::boolean));
  when 'notificationRecipient' then result:=to_jsonb(public.configure_recipient_notification(p_patient,(args->>'recipientUserId')::uuid,args->>'recipientGroup',
    args->>'channel',args->>'destination',(args->>'isEnabled')::boolean,(args->>'includeTeamAlerts')::boolean));
  when 'membership' then result:=to_jsonb(public.admin_upsert_membership(p_patient,(args->>'userId')::uuid,(args->>'role')::public.profile_role,
    (args->>'canManageStock')::boolean,(args->>'canCountStock')::boolean));
  when 'membershipStatus' then result:=to_jsonb(public.admin_set_membership_status(p_patient,p_subject,args->>'status'));
  else raise exception 'invalid administrative purpose' using errcode='22023';end case;
  return jsonb_build_object('kind','local','action',p_purpose,'resourceId',result->'id',
    'userId',coalesce(result->'user_id',result->'recipient_user_id'),'productId',result->'product_id',
    'role',result->'role','status',result->'status');
end;
$$;

create function public.administrative_preparation_command(
  p_patient uuid,p_mode text,p_purpose text,p_subject uuid,p_action text,p_key uuid,
  p_id uuid,p_revision integer,p_fields jsonb,p_reference_hash text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare draft private.administrative_preparations;command private.administrative_preparation_commands;
  intent text;outcome jsonb;receipt jsonb;state text;self_transition boolean:=false;target_user uuid;
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
    and purpose=p_purpose and subject_id is not distinct from p_subject and state in ('active','consumed') for update;
  if draft.id is distinct from p_id or coalesce(draft.revision,0)<>p_revision
    or (draft.state='consumed' and p_action<>'acknowledge')
    or (p_action='acknowledge' and draft.state is distinct from 'consumed') then
    raise exception 'stale administrative preparation revision' using errcode='PT409';end if;
  if p_action in ('save','commit') then perform private.validate_administrative_preparation_fields(p_purpose,p_subject,p_fields);end if;
  if p_action='commit' then
    perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
    perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);
    outcome:=private.commit_administrative_preparation(p_patient,p_mode,p_purpose,p_subject,p_fields,p_reference_hash,p_key);
    target_user:=coalesce(p_subject,nullif(p_fields->>'userId','')::uuid);
    if p_mode='patient' and p_purpose in ('membership','membershipStatus') and target_user=auth.uid()
      and not public.can_manage_recipient(p_patient) then
      self_transition:=private.admin_assurance() and exists(select 1 from private.authority_sessions
        where session_id=private.auth_session() and user_id=auth.uid() and mode='patient' and care_recipient_id=p_patient)
        and outcome->>'kind'='local' and outcome->>'userId'=auth.uid()::text and exists(
          select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=auth.uid()
            and ((p_purpose='membership' and m.status='active' and m.role::text=p_fields->>'role')
              or (p_purpose='membershipStatus' and m.status=p_fields->>'status')));
    end if;
  end if;
  if not self_transition then perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);end if;
  state:=case p_action when 'save' then 'active' when 'commit' then 'consumed' when 'discard' then 'discarded' else 'acknowledged' end;
  if p_id is null then
    insert into private.administrative_preparations(owner_id,patient_id,mode,purpose,subject_id,revision,state,fields,reference_hash,outcome)
      values(auth.uid(),p_patient,p_mode,p_purpose,p_subject,1,state,case when p_action='save' then p_fields end,
        case when p_action='save' then p_reference_hash end,outcome) returning * into draft;
  else
    update private.administrative_preparations d set revision=d.revision+1,state=administrative_preparation_command.state,
      fields=case when p_action='save' then p_fields end,reference_hash=case when p_action='save' then p_reference_hash end,
      outcome=case when p_action='acknowledge' then d.outcome else administrative_preparation_command.outcome end,saved_at=clock_timestamp()
      where d.id=p_id returning * into draft;
  end if;
  receipt:=jsonb_build_object('ownerId',auth.uid(),'patientId',p_patient,'mode',p_mode,'purpose',p_purpose,'targetId',p_subject,
    'key',p_key,'action',p_action,'id',draft.id,'revision',draft.revision,'state',state,'outcome',draft.outcome);
  insert into private.administrative_preparation_commands(owner_id,key,preparation_id,session_id,self_transition,intent_hash,receipt)
    values(auth.uid(),p_key,draft.id,private.auth_session(),self_transition,intent,receipt);
  return receipt;
end;
$$;



create function public.administrative_preparation_read(
  p_patient uuid,p_mode text,p_purpose text,p_subject uuid,p_key uuid default null,p_selection text default null,p_option text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare draft private.administrative_preparations;command private.administrative_preparation_commands;reference jsonb;
begin
  if p_key is not null then
    if private.auth_session() is null then raise exception 'administrative preparation unavailable' using errcode='42501';end if;
    select c.* into command from private.administrative_preparation_commands c join private.administrative_preparations d on d.id=c.preparation_id
      where c.owner_id=auth.uid() and c.key=p_key and d.patient_id=p_patient and d.mode=p_mode and d.purpose=p_purpose and d.subject_id is not distinct from p_subject;
    if not(coalesce(command.self_transition,false) and command.session_id=private.auth_session()) then
      perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,false);
    end if;
    return jsonb_build_object('receipt',command.receipt);
  end if;
  perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);
  select * into draft from private.administrative_preparations where owner_id=auth.uid() and patient_id=p_patient and mode=p_mode
    and purpose=p_purpose and subject_id is not distinct from p_subject and state in ('active','consumed');
  if p_selection is null then
    p_selection:=nullif(coalesce(draft.fields->>'productId',draft.fields->>'recipientUserId',draft.fields->>'userId'),'');
    p_option:=coalesce(draft.fields->>'location',draft.fields->>'channel');
  end if;
  reference:=private.administrative_preparation_reference(p_patient,p_mode,p_purpose,p_subject,nullif(p_selection,''),nullif(p_option,''));
  perform private.require_administrative_preparation_scope(p_patient,p_mode,p_purpose,p_subject,true);
  return jsonb_build_object('draft',case when draft.id is not null then jsonb_build_object(
    'id',draft.id,'revision',draft.revision,'state',draft.state,'fields',draft.fields,'referenceHash',draft.reference_hash,
    'outcome',draft.outcome,'savedAt',draft.saved_at) end,'reference',reference);
end;
$$;

revoke all on function private.require_administrative_preparation_scope(uuid,text,text,uuid,boolean),
  private.validate_administrative_preparation_fields(text,uuid,jsonb),
  private.administrative_preparation_reference(uuid,text,text,uuid,text,text),
  private.commit_administrative_preparation(uuid,text,text,uuid,jsonb,text,uuid),
  public.administrative_preparation_read(uuid,text,text,uuid,uuid,text,text),
  public.administrative_preparation_command(uuid,text,text,uuid,text,uuid,uuid,integer,jsonb,text)
  from public,anon,authenticated,service_role;
grant execute on function public.administrative_preparation_read(uuid,text,text,uuid,uuid,text,text),
  public.administrative_preparation_command(uuid,text,text,uuid,text,uuid,uuid,integer,jsonb,text) to authenticated;
