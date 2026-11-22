create function private.consumption_notice_allowed(n public.requisition_notifications)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.consumption_reports report
    where report.id=n.consumption_report_id and report.care_recipient_id=n.care_recipient_id
    and case when n.event_key='shortage.communicated' then
      report.workflow_mode='shortage' and report.status='communicated'
      and private.member_can(n.care_recipient_id,n.recipient_user_id,'stock.team.read')
      and exists(select 1 from public.care_recipient_memberships membership
        where membership.care_recipient_id=n.care_recipient_id and membership.user_id=n.recipient_user_id
          and membership.status='active' and membership.role='family')
    else report.workflow_mode='legacy'
      and private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.report')
      and (report.reported_by=n.recipient_user_id or private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.confirm'))
    end);
$$;
revoke all on function private.consumption_notice_allowed(public.requisition_notifications) from public,anon,authenticated,service_role;

create or replace function private.report_notice()
returns trigger language plpgsql security definer set search_path='' as $$
declare recipient record;
begin
  if new.workflow_mode='legacy' then
    for recipient in select user_id from public.care_recipient_memberships where care_recipient_id=new.care_recipient_id
      and status='active' and (user_id=new.reported_by or private.member_can(new.care_recipient_id,user_id,'consumption.confirm'))
    loop
      perform private.enqueue_notice(new.care_recipient_id,recipient.user_id,'occurrence.received',null,null,null,new.id);
    end loop;
  elsif new.workflow_mode='shortage' then
    insert into public.requisition_notifications(care_recipient_id,consumption_report_id,recipient_user_id,
      recipient_group,recipient_label,channel,event_key,include_pdf,next_attempt_at)
    select new.care_recipient_id,new.id,membership.user_id,'family',profile.full_name,
      'internal','shortage.communicated',false,clock_timestamp()
    from public.care_recipient_memberships membership join public.profiles profile on profile.id=membership.user_id
    where membership.care_recipient_id=new.care_recipient_id and membership.role='family'
      and membership.status='active' and profile.status='active'
      and private.member_can(new.care_recipient_id,membership.user_id,'stock.team.read')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

do $migration$
declare
  target record;
  definition text;
  left_at integer;
  right_at integer;
begin
  for target in select * from (values
    ('private.operations_notice_allowed(public.requisition_notifications)','elsif n.consumption_report_id is not null then','elsif n.reminder_id is not null then',
      'elsif n.consumption_report_id is not null then return private.consumption_notice_allowed(n); '),
    ('private.web_push_notice_allowed(public.requisition_notifications)','elsif n.consumption_report_id is not null then','elsif n.reminder_id is not null then',
      'elsif n.consumption_report_id is not null then return private.consumption_notice_allowed(n); '),
    ('private.deliver_internal_notifications()','when n.consumption_report_id is not null then','when n.reminder_id is not null then',
      'when n.consumption_report_id is not null then private.consumption_notice_allowed(n) '),
    ('public.v4_validate_notification_job(uuid,uuid)','elsif n.consumption_report_id is not null then','elsif n.reminder_id is not null then',
      'elsif n.consumption_report_id is not null then allowed:=private.consumption_notice_allowed(n); ')
  ) as candidate(signature,first_marker,next_marker,replacement)
  loop
    definition:=pg_get_functiondef(target.signature::regprocedure);
    left_at:=strpos(definition,target.first_marker);
    right_at:=strpos(definition,target.next_marker);
    if left_at=0 or right_at<=left_at then raise exception 'consumption notice routing anchor changed in %',target.signature; end if;
    execute substr(definition,1,left_at-1)||target.replacement||substr(definition,right_at);
  end loop;
end;
$migration$;

create or replace function public.stock_consumption_metrics(p_patient uuid,p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  family boolean := coalesce(private.can(p_patient,'stock.family.read'),false);
  team boolean := coalesce(private.can(p_patient,'stock.team.read'),false);
  days numeric;
begin
  if not (family or team) then raise exception 'stock permission required' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then
    raise exception 'invalid metrics period' using errcode='22023';
  end if;
  days:=extract(epoch from(p_to-p_from))/86400;
  return (
    with consumption as (
      select product_id,source_location location,quantity
      from public.stock_movements where care_recipient_id=p_patient and created_at>=p_from and created_at<p_to
        and destination_location is null and reference_type='consumption'
        and ((family and source_location='FAMILY') or (team and source_location='CARE_TEAM'))
      union all
      select item->>'productId','CARE_TEAM',(item->>'quantity')::numeric
      from public.consumption_reports report cross join lateral jsonb_array_elements(private.consumption_current_lines(report.id)) item
      where team and report.care_recipient_id=p_patient and report.workflow_mode='direct' and report.status='recorded'
        and report.created_at>=p_from and report.created_at<p_to
    ), totals as (
      select product_id,location,sum(quantity) used,count(*) records from consumption group by product_id,location
    )
    select coalesce(jsonb_agg(jsonb_build_object('productId',product_id,'location',location,
      'quantity',used::text,'movements',records,'days',ceil(days),'averagePerDay',(used/days)::text)),'[]'::jsonb)
    from totals
  );
end;
$$;
