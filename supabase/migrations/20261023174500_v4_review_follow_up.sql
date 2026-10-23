-- Additional findings from the consolidated PR review; prior migrations immutable.
begin;

create or replace function public.archive_requisition(p_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;begin
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id;
 perform private.require_cap(s.care_recipient_id,'req.archive');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||s.care_recipient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'archive reason required';end if;
 perform private.refresh_requisition_lifecycle(p_id);
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 if s.archived_at is not null then return public.requisition_progress(p_id);end if;
 if s.completed_at is null then raise exception 'operational completion required';end if;
 update public.requisition_lifecycle set archived_at=now(),archived_by=auth.uid(),archive_reason=trim(p_reason) where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.archived.manual',jsonb_build_object('reason',trim(p_reason),'scienceSatisfied',private.science_satisfied(p_id)),gen_random_uuid());
 return public.requisition_progress(p_id);
end;$$;

create or replace function private.requisition_archive_task(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.requisition_lifecycle s join public.operational_documents d on d.id=s.requisition_id join public.requisitions r on r.id=d.id where d.id=p_id and not r.is_historical and d.status not in ('draft','cancelled') and s.archived_at is null and s.completed_at is not null and private.can(d.care_recipient_id,'req.archive'));
$$;

create or replace function public.complete_notification_job(p_id uuid,p_worker_id uuid,p_state text,p_provider_reference text default null,p_error text default null) returns public.requisition_notifications language plpgsql security definer set search_path='' as $$
declare result public.requisition_notifications;begin
 result:=public.v4_complete_notification_job(p_id,p_worker_id,p_state,p_provider_reference,p_error);
 if p_state='pending' and p_error in ('TEMPLATE_NOT_APPROVED','EVENT_TEMPLATE_NOT_CONFIGURED','DOCUMENT_TEMPLATE_NOT_CONFIGURED','CHANNEL_NOT_CONFIGURED','PDF_TEMPLATE_VARIANT_REQUIRED') then
 update public.requisition_notifications set state='pending',next_attempt_at='infinity'::timestamptz where id=p_id returning * into result;
 end if;return result;
end;$$;

-- Changing the policy explicitly authorizes the missing PDF for held jobs only.
-- Revalidate contact, membership, channels and lease again before any actual send.
create function private.release_pdf_configuration_holds() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.include_pdf and (tg_op='INSERT' or not old.include_pdf) then
 update public.requisition_notifications n set include_pdf=true,next_attempt_at=now(),attempts=0,last_error=null
 where n.care_recipient_id=new.care_recipient_id and n.channel='whatsapp' and n.state='pending' and n.next_attempt_at='infinity'::timestamptz and n.last_error='PDF_TEMPLATE_VARIANT_REQUIRED'
 and case n.event_key when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else n.event_key end=new.event
 and exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=n.care_recipient_id and m.user_id=n.recipient_user_id and m.role::text=new.subject_role and m.status='active');
 end if;return null;
end;$$;
create trigger release_pdf_configuration_holds after insert or update of include_pdf on public.notification_event_rules for each row execute function private.release_pdf_configuration_holds();
revoke all on function private.release_pdf_configuration_holds() from public,anon,authenticated,service_role;

create or replace function public.document_delivery_status(p_document uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'requisition_id',requisition_id,'recipient_group',recipient_group,'recipient_label',recipient_label,'channel',channel,'state',state,'attempts',attempts,'attempted_at',attempted_at,'error_code',case when last_error is null then null when last_error in ('PDF_TEMPLATE_VARIANT_REQUIRED','TEMPLATE_NOT_APPROVED','EVENT_TEMPLATE_NOT_CONFIGURED','EVENT_APP_ONLY','EVENT_DISABLED','INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED','META_COUNTRY_RESTRICTED_130497','DOCUMENT_TEMPLATE_NOT_CONFIGURED','MEDIA_UPLOAD_FAILED','DOCUMENT_PREPARATION_FAILED') then last_error else 'PROCESSING_FAILED' end,'seen_at',seen_at)) from public.requisition_notifications where coalesce(document_id,requisition_id)=p_document),'[]');
end;$$;
commit;
