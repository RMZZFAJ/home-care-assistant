-- Preview and the released application share one database. Keep the released
-- query's lifecycle and reference types stable until that application updates.
alter policy consumption_read on public.consumption_reports to authenticated using (
  workflow_mode = 'legacy'
  and case location when 'FAMILY' then private.can(care_recipient_id,'stock.family.read')
    else private.can(care_recipient_id,'stock.team.read') end
);

alter function public.consumption_report(uuid) rename to consumption_record_detail;

create function public.consumption_report(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.consumption_reports where id=p_id and workflow_mode='legacy') then
    raise exception 'report not found' using errcode='42501';
  end if;
  return public.consumption_record_detail(p_id);
end
$$;

create function public.consumption_record_list(
  p_patient uuid, p_kind text, p_status text, p_search text, p_reminder uuid,
  p_from timestamptz, p_until timestamptz, p_before_at timestamptz, p_before_id uuid
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  family boolean := coalesce(private.can(p_patient,'stock.family.read'),false);
  team boolean := coalesce(private.can(p_patient,'stock.team.read'),false);
begin
  if private.auth_session() is null or not public.can_access_recipient(p_patient) then
    raise exception 'report scope required' using errcode='42501';
  end if;
  if p_search is null or private.bal_comment_units(p_search)>120
    or (p_before_at is null)<>(p_before_id is null)
    or p_from>=p_until
    or p_kind not in ('consumption','shortage')
    or p_status not in ('reported','confirmed','rejected','recorded','cancelled','communicated')
  then raise exception 'invalid report filters' using errcode='22023'; end if;

  return (select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id desc),'[]'::jsonb)
    from (
      select r.id,r.care_recipient_id,r.kind,r.location,r.status,r.body,r.created_at,
        r.version,r.reported_by,r.reported_name,r.workflow_mode
      from public.consumption_reports r
      where r.care_recipient_id=p_patient
        and ((family and r.location='FAMILY') or (team and r.location='CARE_TEAM'))
        and (p_kind is null or r.kind=p_kind) and (p_status is null or r.status=p_status)
        and (p_reminder is null or r.source_reminder_id=p_reminder)
        and (p_search='' or strpos(lower(r.body),lower(p_search))>0)
        and (p_from is null or r.created_at>=p_from) and (p_until is null or r.created_at<p_until)
        and (p_before_at is null or (r.created_at,r.id)<(p_before_at,p_before_id))
      order by r.created_at desc,r.id desc limit 21
    ) page);
end
$$;

revoke all on function public.consumption_report(uuid),
  public.consumption_record_detail(uuid),
  public.consumption_record_list(uuid,text,text,text,uuid,timestamptz,timestamptz,timestamptz,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.consumption_report(uuid),
  public.consumption_record_detail(uuid),
  public.consumption_record_list(uuid,text,text,text,uuid,timestamptz,timestamptz,timestamptz,uuid)
  to authenticated;

-- This local setting widens the set of reference types only. The ordinary
-- patient, custody, audience and per-person capabilities still gate the content.
create or replace function private.progress_reference_view(p_id uuid,p_patient uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare
  d private.progress_subjects;
  n private.document_progress_notes;
  extended_types boolean := coalesce(current_setting('hca.progress_reference_types',true)='extended',false);
begin
  select * into d from private.progress_subjects where id=p_id and care_recipient_id=p_patient;
  if found then
    if (d.is_report and not extended_types) or not coalesce(private.can(p_patient,d.read_capability),false) then return null; end if;
    return jsonb_build_object('id',d.id,'code',d.code,'type',d.type,'kind','document');
  end if;
  select * into n from private.document_progress_notes where id=p_id and care_recipient_id=p_patient;
  if not found or not private.progress_note_readable(n) then return null; end if;
  select * into d from private.progress_subjects where id=n.target_id and care_recipient_id=n.care_recipient_id;
  if not found or (d.is_report and not extended_types) then return null; end if;
  return jsonb_build_object('id',n.id,'documentId',d.id,'code',d.code,'type',d.type,'kind','progress',
    'excerpt',left(n.body,140),'recordedAt',n.recorded_at);
end
$$;

create function public.record_progress(p_document uuid,p_filter text,p_page integer,p_size integer,p_from date,p_through date)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := case when p_from is null and p_through is null
    then public.document_progress(p_document,p_filter,p_page,p_size)
    else public.document_progress_period(p_document,p_filter,p_page,p_size,p_from,p_through) end;
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

create function public.record_progress_references(p_document uuid,p_search text,p_page integer)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := public.document_progress_references(p_document,p_search,p_page);
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

create function public.publish_record_progress(p_document uuid,p_key uuid,p_body jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := public.document_progress_publish(p_document,p_key,p_body);
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

create function public.record_progress_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := public.progress_preparation_context(p_patient,p_purpose,p_target);
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

create function public.record_progress_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := public.progress_preparation_command(p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_key);
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

create function public.commit_record_progress_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := public.commit_progress_preparation(p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_key);
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

create function public.recover_record_progress_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  prior_types text := current_setting('hca.progress_reference_types',true);
  outcome jsonb;
begin
  perform set_config('hca.progress_reference_types','extended',true);
  outcome := public.progress_preparation_recovery(p_patient,p_purpose,p_target,p_id,p_expected,p_body,p_key);
  perform set_config('hca.progress_reference_types',coalesce(prior_types,''),true);
  return outcome;
end
$$;

revoke all on function public.record_progress(uuid,text,integer,integer,date,date),
  public.record_progress_references(uuid,text,integer), public.publish_record_progress(uuid,uuid,jsonb),
  public.record_progress_preparation_context(uuid,text,uuid),
  public.record_progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),
  public.commit_record_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),
  public.recover_record_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.record_progress(uuid,text,integer,integer,date,date),
  public.record_progress_references(uuid,text,integer), public.publish_record_progress(uuid,uuid,jsonb),
  public.record_progress_preparation_context(uuid,text,uuid),
  public.record_progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),
  public.commit_record_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid),
  public.recover_record_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)
  to authenticated;
