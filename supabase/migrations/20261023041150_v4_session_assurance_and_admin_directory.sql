-- MFA is optional to enroll, mandatory for administration once enrolled and verified.
create function private.admin_assurance() returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and factor_type='totp' and status='verified')
 or auth.jwt()->>'aal'='aal2'
 or exists(select 1 from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and user_id=auth.uid());
$$;
create or replace function public.is_global_administrator() returns boolean language sql stable security definer set search_path='' as $$
 select private.global_identity() and private.admin_assurance() and exists(select 1 from private.authority_sessions where session_id=private.auth_session() and user_id=auth.uid() and mode='global');
$$;
create or replace function public.can_manage_recipient(p_recipient_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.recipient_role(p_recipient_id)='admin' and private.admin_assurance(),false);
$$;
create or replace function private.can(p_patient uuid,p_capability text) returns boolean language sql stable security definer set search_path='' as $$
 select public.can_access_recipient(p_patient) and private.member_can(p_patient,auth.uid(),p_capability)
 and (public.recipient_role(p_patient)<>'admin' or p_capability like '%.read' or private.admin_assurance());
$$;
revoke all on function private.admin_assurance() from public,anon,authenticated,service_role;

create function public.global_patient_administration(p_patient uuid,p_section text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_global_administrator() or not exists(select 1 from public.care_recipients where id=p_patient) then raise exception 'global administration required' using errcode='42501';end if;
 case p_section
 when 'catalog' then return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('id',c.product_id) order by c.sort_order,c.name) from public.care_recipient_products c where care_recipient_id=p_patient),'[]');
 when 'products' then return coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from public.products p where p.owner_care_recipient_id is null and p.is_active),'[]');
 when 'memberships' then return coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('full_name',p.full_name) order by p.full_name) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient),'[]');
 when 'alerts' then return coalesce((select jsonb_agg(to_jsonb(r)) from public.stock_alert_rules r where care_recipient_id=p_patient),'[]');
 when 'notificationRecipients' then return coalesce((select jsonb_agg(to_jsonb(r)) from public.recipient_notification_settings r where care_recipient_id=p_patient),'[]');
 else raise exception 'patient operating context required' using errcode='42501';end case;
end;$$;
grant execute on function public.global_patient_administration(uuid,text) to authenticated;

-- Manual state labels cannot manufacture operational progress.
alter function public.transition_requisition_status(uuid,public.requisition_status,text) rename to v3_transition_requisition_status;
revoke all on function public.v3_transition_requisition_status(uuid,public.requisition_status,text) from public,anon,authenticated,service_role;
create function public.transition_requisition_status(p_requisition_id uuid,p_to_status public.requisition_status,p_reason text default null) returns public.requisitions
language plpgsql security definer set search_path='' as $$declare patient_id uuid;begin
 if p_to_status<>'cancelled' then raise exception 'requisition progress is derived from confirmed events';end if;
 select care_recipient_id into patient_id from public.requisitions where id=p_requisition_id;
 perform private.require_cap(patient_id,'req.review');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));
 if exists(select 1 from public.requisition_lifecycle where requisition_id=p_requisition_id and (completed_at is not null or archived_at is not null)) then raise exception 'completed requisition requires compensating operations';end if;
 if exists(select 1 from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where i.requisition_id=p_requisition_id and d.status<>'cancelled' and d.type='ENT') then raise exception 'resolve linked deliveries before cancellation';end if;
 return public.v3_transition_requisition_status(p_requisition_id,p_to_status,p_reason);
end;$$;
grant execute on function public.transition_requisition_status(uuid,public.requisition_status,text) to authenticated;
