-- Project the consolidated fulfillment decision through every live consumer.
do $l1$
declare signature text;definition text;anchor text;alias text;line_alias text;
begin
 foreach signature in array array[
  'public.phase_d3_pre_bounded_document_list(uuid,text,text,text,timestamp with time zone,timestamp with time zone,integer,integer)',
  'public.requisition_item_context(uuid,text[])','public.v3_operational_tasks(uuid)',
  'private.science_snapshot()',
  'private.submit_requisition_core(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,integer,text)'
 ] loop
  definition:=replace(pg_get_functiondef(signature::regprocedure),chr(13),'');
  foreach alias in array array['d','od','x'] loop
   foreach line_alias in array array['l','dl'] loop
    anchor:='exists(select 1 from public.document_request_links k join public.document_lines '||line_alias||' on '||line_alias||'.id=k.document_line_id join public.operational_documents '||alias||' on '||alias||'.id='||line_alias||'.document_id where k.requisition_item_id=i.id and '||alias||'.type=''ENT'' and '||alias||'.status<>''cancelled'' and '||line_alias||'.accepted_quantity>0)';
    definition:=replace(definition,anchor,'(private.requisition_item_service(i.id)=''fulfilled'')');
   end loop;
  end loop;
  if definition ~ 'k.requisition_item_id=i.id and (d|od|x).type=''ENT'' and (d|od|x).status<>''cancelled'' and (l|dl).accepted_quantity>0' then
   raise exception 'L1 fulfillment projection drift: %',signature;end if;
  if signature like 'public.phase_d3_pre_bounded%' then
   definition:=replace(definition,'p_type not in (''REQ'',''COM'',''ENT'',''BAL'')','p_type not in (''REQ'',''COM'',''ENT'',''DEV'',''BAL'')');
   definition:=replace(definition,'select d.id,d.type,d.code','select d.id,d.type,d.kind,d.code');
   definition:=replace(definition,'p_type is null or d.type=p_type','p_type is null or d.kind=p_type');
   definition:=replace(definition,'count(*) total,count(*) filter','count(*) total,count(*) filter(where private.requisition_item_service(i.id) in (''partial'',''reserved'')) partial,count(*) filter');
   definition:=replace(definition,'when coalesce(c.fulfilled,0)>0 then','when coalesce(c.fulfilled,0)>0 or coalesce(c.partial,0)>0 then');
   definition:=replace(definition,'''fulfilled'',coalesce(c.fulfilled,0),''total''','''fulfilled'',coalesce(c.fulfilled,0),''partial'',coalesce(c.partial,0),''total''');
  end if;
  execute definition;
 end loop;
end;$l1$;

-- A public audit event must not disclose that a private note was published.
do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.document_progress_publish(uuid,uuid,jsonb)'::regprocedure);
 anchor:=$find$insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'document.progress.created','document_progress',n.id,
  jsonb_build_object('care_recipient_id',d.care_recipient_id,'document_id',d.id,'category',n.category,'stage',n.stage));$find$;
 if position(anchor in definition)=0 then raise exception 'L1 private audit projection drift';end if;
 execute replace(definition,anchor,'if coalesce(v_options->>''visibility'',''public'')=''public'' then '||anchor||' end if;');
 definition:=pg_get_functiondef('public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)'::regprocedure);
 anchor:='insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),''private_draft.consume'',''progress_preparation'',d.id,jsonb_build_object(''care_recipient_id'',p_patient,''resource_id'',d.consumed_resource_id));';
 if position(anchor in definition)=0 then raise exception 'L1 private draft audit drift';end if;
 execute replace(definition,anchor,'if coalesce(native#>>''{note,visibility}'',''public'')=''public'' then '||anchor||' end if;');
end;$l1$;

alter table public.requisition_notifications add column origin_notification_id uuid references public.requisition_notifications(id);
create index notification_origin on public.requisition_notifications(origin_notification_id) where origin_notification_id is not null;
create table private.document_communication_commands (
 actor_id uuid not null references public.profiles(id),
 idempotency_key uuid not null,
 document_id uuid not null references public.operational_documents(id),
 original_id uuid not null references public.requisition_notifications(id),
 channel text not null check(channel in ('internal','push','whatsapp','email')),
 notification_id uuid not null references public.requisition_notifications(id),
 requested_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,idempotency_key)
);
alter table private.document_communication_commands enable row level security;
revoke all on private.document_communication_commands from public,anon,authenticated,service_role;

create function private.communication_reminder_allowed(d public.operational_documents,n public.requisition_notifications) returns boolean
language sql stable set search_path='' as $$
 select private.auth_session() is not null and private.can(d.care_recipient_id,lower(d.type)||'.read')
 and private.requisition_family_representative(d.care_recipient_id,auth.uid())
 and coalesce(n.document_id,n.requisition_id)=d.id and n.recipient_user_id is not null
 and private.user_can(d.care_recipient_id,n.recipient_user_id,lower(d.type)||'.read')
 and (d.type='ENT' and d.status in ('pending_receipt','disputed') and d.recipient_id=n.recipient_user_id
  and private.can(d.care_recipient_id,'ent.create')
  or d.type='REQ' and d.status not in ('draft','cancelled') and not coalesce(private.science_satisfied(d.id),false)
   and private.can(d.care_recipient_id,'req.science')
   and private.requisition_family_representative(d.care_recipient_id,n.recipient_user_id));
$$;
revoke all on function private.communication_reminder_allowed(public.operational_documents,public.requisition_notifications) from public,anon,authenticated,service_role;

create function public.document_communication_resend(p_document uuid,p_original uuid,p_channel text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;n public.requisition_notifications;created public.requisition_notifications;
 c private.document_communication_commands;target text;result jsonb;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 if p_key is null or p_channel not in ('internal','push','whatsapp','email') then raise exception 'invalid reminder intention' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('communication:'||auth.uid()||':'||p_key,0));
 select * into c from private.document_communication_commands where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.document_id<>p_document or c.original_id<>p_original or c.channel<>p_channel then raise exception 'reminder intention differs' using errcode='23505';end if;
  if private.auth_session() is null or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
  return jsonb_build_object('key',p_key,'documentId',p_document,'originalId',p_original,'notificationId',c.notification_id,'channel',p_channel,'state','queued','recovered',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('document:'||p_document,0));
 select * into d from public.operational_documents where id=p_document for update;
 select * into n from public.requisition_notifications where id=p_original;
 if not found or not private.communication_reminder_allowed(d,n) then raise exception 'reminder not authorized or no longer applicable' using errcode='42501';end if;
 if exists(select 1 from private.document_communication_commands old join public.requisition_notifications pending on pending.id=old.notification_id
  where old.document_id=p_document and old.original_id=p_original and old.channel=p_channel and pending.state in ('pending','processing','uncertain')) then
  raise exception 'a reminder is already pending for this communication and channel' using errcode='PT409';end if;
 if p_channel in ('email','whatsapp') then
  select destination into target from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id
   and recipient_user_id=n.recipient_user_id and channel=p_channel and is_enabled order by created_at desc limit 1;
  if target is null then raise exception 'recipient channel not enabled' using errcode='22023';end if;
 end if;
 insert into public.requisition_notifications(care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,
  destination,event_key,include_pdf,template_name,template_version,template_snapshot,silent,origin_notification_id)
 values(d.care_recipient_id,d.id,n.recipient_user_id,n.recipient_group,n.recipient_label,
  case when p_channel='push' then 'internal' else p_channel end,'pending',target,n.event_key,n.include_pdf,n.template_name,n.template_version,n.template_snapshot,
  p_channel='internal',coalesce(n.origin_notification_id,n.id)) returning * into created;
 if p_channel='push' and not exists(select 1 from private.web_push_deliveries where notice_id=created.id) then
  raise exception 'push unavailable for this recipient' using errcode='22023';end if;
 insert into private.document_communication_commands(actor_id,idempotency_key,document_id,original_id,channel,notification_id)
 values(auth.uid(),p_key,p_document,p_original,p_channel,created.id);
 if not private.communication_reminder_allowed(d,n) then raise exception 'reminder authority changed' using errcode='42501';end if;
 return jsonb_build_object('key',p_key,'documentId',p_document,'originalId',p_original,'notificationId',created.id,'channel',p_channel,'state','queued','recovered',false);
end;$$;
revoke all on function public.document_communication_resend(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_communication_resend(uuid,uuid,text,uuid) to authenticated;

create function public.document_communications(p_document uuid,p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;rows jsonb;total bigint;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 1000000 then raise exception 'invalid communication page' using errcode='22023';end if;
 with notices as materialized(select * from public.requisition_notifications where coalesce(document_id,requisition_id)=p_document),
 channels as (
  select n.id,n.created_at,jsonb_build_object('id',n.id,'originId',n.origin_notification_id,'purpose',coalesce(n.event_key,'document.notice'),
   'recipient',n.recipient_label,'channel',n.channel,'state',n.state,'createdAt',n.created_at,'attemptedAt',n.attempted_at,
   'deliveredAt',n.delivered_at,'readAt',n.read_at,'seenAt',n.seen_at,'attemptCount',n.attempts,
   'historyCoverage','last_result_only','attempts','[]'::jsonb,'canResend',private.communication_reminder_allowed(d,n),'sourceId',n.id) body
  from notices n
  union all select w.id,w.created_at,jsonb_build_object('id',w.id,'originId',n.origin_notification_id,'purpose',coalesce(n.event_key,'document.notice'),
   'recipient',n.recipient_label,'channel','push','state',w.state,'createdAt',w.created_at,'attemptedAt',w.dispatch_started_at,
   'deliveredAt',null,'readAt',null,'seenAt',null,'attemptCount',w.attempts,'historyCoverage','recorded_attempts',
   'attempts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'ordinal',a.ordinal,'at',a.started_at,'outcome',a.outcome,'completedAt',a.completed_at) order by a.ordinal) from private.web_push_attempts a where a.delivery_id=w.id),'[]'::jsonb),
   'canResend',private.communication_reminder_allowed(d,n),'sourceId',n.id)
  from private.web_push_deliveries w join notices n on n.id=w.notice_id
 ), selected as (select * from channels order by created_at desc,id limit 20 offset ((p_page::bigint-1)*20))
 select (select count(*) from channels),coalesce(jsonb_agg(s.body order by s.created_at desc,s.id),'[]'::jsonb) into total,rows from selected s;
 return jsonb_build_object('documentId',p_document,'page',p_page,'size',20,'total',total,'data',rows);
end;$$;
revoke all on function public.document_communications(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.document_communications(uuid,integer) to authenticated;

create function public.pdf_verification_details(p_code text,p_select_context boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.pdf_issuances;d public.operational_documents;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 if p_code is null or p_code!~'^[A-F0-9]{32}$' then raise exception 'invalid verification code' using errcode='22023';end if;
 select * into r from private.pdf_issuances where verification_code=p_code and state='ready';
 if not found then raise exception 'issuance unavailable' using errcode='42501';end if;
 select * into d from public.operational_documents where id=r.document_id;
 if p_select_context then
  if not private.user_can(d.care_recipient_id,auth.uid(),lower(d.type)||'.read') then raise exception 'issuance unavailable' using errcode='42501';end if;
  perform public.select_active_context(d.care_recipient_id);
 end if;
 perform private.require_pdf_issuance_access(r);
 return jsonb_build_object('verificationCode',r.verification_code,'issuanceId',r.id,'documentId',d.id,'code',d.code,'kind',d.kind,
  'patientName',r.snapshot#>>'{actors,patient,name}','recordedBy',r.snapshot#>>'{actors,issuer,name}',
  'generatedBy',r.requested_name,'generatedAt',r.requested_at,'documentVersion',r.version,
  'technicalKey',r.key_version,'certificateFingerprint',r.validation->>'certificateFingerprint');
end;$$;
revoke all on function public.pdf_verification_details(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.pdf_verification_details(text,boolean) to authenticated;
