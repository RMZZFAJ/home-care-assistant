-- D3 governance reads remain scoped, bounded and independent from decisions.
create index access_change_status_page on public.access_change_requests(care_recipient_id,status,created_at desc,id desc);

create function private.access_change_current(p_patient uuid,p_kind text,p_change jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;args jsonb:=p_change->'args';begin
 case p_kind
 when 'settings' then select settings into result from public.patient_settings where care_recipient_id=p_patient;
 when 'membership' then
  select jsonb_build_object('userId',m.user_id,'role',m.role,'status',m.status) into result from public.care_recipient_memberships m
   where m.care_recipient_id=p_patient and m.user_id=(p_change->>'userId')::uuid;
 when 'capability' then
  select jsonb_build_object('enabled',c.enabled) into result from public.capability_overrides c where c.care_recipient_id=p_patient
   and c.capability=p_change->>'capability' and (c.subject_user::text=p_change->>'subjectUser' or c.subject_role=p_change->>'subjectRole');
  result:=coalesce(result,jsonb_build_object('enabled',null));
 when 'notification_rule' then
  select jsonb_build_object('event',r.event,'role',r.subject_role,'channels',r.channels,'includePdf',r.include_pdf,'cooldownMinutes',r.cooldown_minutes,'quietStart',r.quiet_start,'quietEnd',r.quiet_end,'mode',r.mode) into result from public.notification_event_rules r where r.care_recipient_id=p_patient
   and r.event=p_change->>'event' and r.subject_role=p_change->>'role';
 when 'administration' then
  case p_change->>'operation'
  when 'recipient' then select jsonb_build_object('displayName',display_name,'isActive',is_active,'isDevelopment',is_development) into result from public.care_recipients where id=p_patient;
  when 'product' then select jsonb_build_object('name',name,'category',category,'unit',unit,'aliases',aliases,'isActive',is_active,'description',description,'sortOrder',sort_order) into result from public.care_recipient_products where care_recipient_id=p_patient and product_id=args->>'id';
  when 'adoptProduct' then select jsonb_build_object('productId',product_id,'isActive',is_active) into result from public.care_recipient_products where care_recipient_id=p_patient and product_id=args->>'productId';
  when 'membershipStatus' then select jsonb_build_object('status',status) into result from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(args->>'userId')::uuid;
  when 'alertRule' then select jsonb_build_object('lowThreshold',low_threshold,'criticalThreshold',critical_threshold,'isEnabled',is_enabled) into result from public.stock_alert_rules where care_recipient_id=p_patient and product_id=args->>'productId' and location::text=args->>'location';
  when 'notificationRecipient' then select jsonb_build_object('recipientGroup',recipient_group,'channel',channel,'destination',destination,'includeTeamAlerts',include_team_alerts,'isEnabled',is_enabled) into result from public.recipient_notification_settings where care_recipient_id=p_patient and recipient_user_id=(args->>'recipientUserId')::uuid and channel=args->>'channel';
  else result:=null;end case;
 else result:=null;end case;
 return result;
end;$$;

create function public.patient_governance_changes(p_patient uuid,p_status text default 'pending',p_kind text default null,p_query text default '',p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient) then raise exception 'patient unavailable' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 1000000 or p_size is null or p_size not between 1 and 50
  or p_status is null or p_status not in ('all','pending','awaiting_acceptance','applied','rejected')
  or p_kind is not null and p_kind not in ('capability','settings','membership','notification_rule','administration')
  or p_query is null or length(p_query)>160 then raise exception 'invalid governance query' using errcode='22023';end if;
 with matching as materialized (
  select c.* from public.access_change_requests c where c.care_recipient_id=p_patient
   and (p_status='all' or c.status=p_status) and (p_kind is null or c.kind=p_kind)
   and (btrim(p_query)='' or strpos(lower(c.id::text||' '||c.kind||' '||c.proposed::text),lower(btrim(p_query)))>0)
 ), page_rows as (
  select * from matching order by created_at desc,id desc limit p_size offset ((p_page::bigint-1)*p_size)
 ) select jsonb_build_object('total',(select count(*) from matching),'page',p_page,'pageSize',p_size,'changes',coalesce((
  select jsonb_agg((to_jsonb(c)-'idempotency_key')||jsonb_build_object('resolution',c.resolution-'invitationHash',
   'proposerName',coalesce(p.full_name,'Identidade histórica'),'current',private.access_change_current(p_patient,c.kind,c.proposed),
   'subjectName',(select s.full_name from public.profiles s where s.id::text=coalesce(c.proposed->>'userId',c.proposed->>'subjectUser',c.proposed->'args'->>'userId',c.proposed->'args'->>'recipientUserId')))
   order by c.created_at desc,c.id desc) from page_rows c left join public.profiles p on p.id=c.proposed_by),'[]'::jsonb)) into result;
 return result;
end;$$;

create or replace function public.patient_governance(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;page_data jsonb;begin
 -- The legacy read retains its authorization and other existing contracts.
 result:=public.fluent_pre_matrix_governance(p_patient);
 page_data:=public.patient_governance_changes(p_patient);
 return result||jsonb_build_object('definitions',private.capability_definition_rows(p_patient),'changes',page_data->'changes','changePage',page_data-'changes');
end;$$;

-- The base version belongs to the command fingerprint. A replay can recover an
-- already committed proposal, but cannot silently rebase it to another version.
alter function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) rename to phase_d2_configure_patient_access;
revoke all on function public.phase_d2_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
create function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.access_change_requests;result jsonb;begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if p_key is null or p_version is null or p_version<1 then raise exception 'governance intent and version required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if p_request_id is null then
  select * into existing from public.access_change_requests where care_recipient_id=p_patient and idempotency_key=p_key;
  if found and (existing.base_version is distinct from p_version or existing.kind is distinct from p_kind
   or existing.proposed is distinct from p_change or existing.proposed_by is distinct from auth.uid()) then
   raise exception 'governance idempotency conflict' using errcode='23505';end if;
 end if;
 result:=public.phase_d2_configure_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
 -- Recheck actual authority after all nested waits, including profile FK waits.
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 return result;
end;$$;

revoke all on function private.access_change_current(uuid,text,jsonb),public.patient_governance_changes(uuid,text,text,text,integer,integer),public.patient_governance(uuid),public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.patient_governance_changes(uuid,text,text,text,integer,integer),public.patient_governance(uuid),public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;
