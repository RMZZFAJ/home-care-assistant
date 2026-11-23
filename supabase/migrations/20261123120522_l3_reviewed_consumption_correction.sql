create function public.team_consumption_correction_reference(p_patient uuid,p_report uuid,p_products text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  report public.consumption_reports;
  original jsonb;
  selected_stock jsonb;
  removed_stock jsonb;
  removed text[];
  observation text;
begin
  perform private.require_team_consumption_write(p_patient);
  select * into report from public.consumption_reports
    where id=p_report and care_recipient_id=p_patient and workflow_mode='direct';
  if not found then raise exception 'team consumption unavailable' using errcode='42501'; end if;
  if report.reported_by<>auth.uid() then
    perform private.require_cap(p_patient,'consumption.team.correct');
  end if;
  if report.status<>'recorded' then
    raise exception 'stale team consumption report' using errcode='PT409';
  end if;

  original:=private.consumption_current_lines(p_report);
  selected_stock:=public.team_consumption_reference(p_patient,p_products);
  select array_agg(line->>'productId' order by line->>'productId') into removed
    from jsonb_array_elements(original) line where not (line->>'productId'=any(p_products));
  if removed is not null then
    removed_stock:=public.team_consumption_reference(p_patient,removed);
  end if;
  select revision.body into observation from public.consumption_report_revisions revision
    where revision.report_id=p_report order by revision.version desc limit 1;

  return jsonb_build_object(
    'careRecipientId',p_patient,'reportId',p_report,'version',report.version,
    'original',original,'observation',coalesce(observation,report.body),
    'materials',(selected_stock->'materials')||coalesce(removed_stock->'materials','[]'::jsonb),
    'referenceHash',encode(extensions.digest(jsonb_build_array(
      p_report,report.version,selected_stock->>'referenceHash',removed_stock->>'referenceHash'
    )::text,'sha256'),'hex')
  );
end;
$$;

revoke all on function public.team_consumption_correction_reference(uuid,uuid,text[])
  from public,anon,authenticated,service_role;
grant execute on function public.team_consumption_correction_reference(uuid,uuid,text[]) to authenticated;

-- Extend the existing transactional writer after receipt recovery and under its
-- original locks. Issue, draft retirement and Flow consumption keep their paths.
do $migration$
declare
  ddl text := replace(pg_get_functiondef('public.submit_team_consumption(uuid,uuid,jsonb,text,uuid,integer)'::regprocedure), E'\r\n', E'\n');
  prior_guard text := $old$or (p_body->>'action' is distinct from 'issue' and (p_reference is not null or p_draft_id is not null))$old$;
  before_issue text := $old$  if p_body->>'action'='issue' then
    confirmed_lines:=$old$;
begin
  if (length(ddl)-length(replace(ddl,prior_guard,'')))<>length(prior_guard)
    or (length(ddl)-length(replace(ddl,before_issue,'')))<>length(before_issue) then
    raise exception 'team consumption submission baseline changed';
  end if;
  ddl:=replace(ddl,prior_guard,$new$or (p_body->>'action' is distinct from 'issue' and p_draft_id is not null)
    or (coalesce(p_body->>'action','') not in ('issue','correct') and p_reference is not null)$new$);
  execute replace(ddl,before_issue,$new$  if p_body->>'action'='correct' then
    if p_reference is null then
      raise exception 'correction review required' using errcode='22023';
    end if;
    confirmed_lines:=private.consumption_input(p_body->'lines');
    select array_agg(item->>'productId' order by item->>'productId') into materials
      from jsonb_array_elements(confirmed_lines) item;
    perform 1 from public.care_recipient_products
      where care_recipient_id=p_patient and (
        product_id=any(materials)
        or product_id in (
          select line->>'productId' from public.consumption_reports r
          cross join lateral jsonb_array_elements(private.consumption_current_lines(r.id)) line
          where r.id=(p_body->>'reportId')::uuid and r.care_recipient_id=p_patient
            and r.workflow_mode='direct'
            and (r.reported_by=auth.uid() or private.can(p_patient,'consumption.team.correct'))
        )
      ) order by product_id for share;
    fields:=public.team_consumption_correction_reference(p_patient,(p_body->>'reportId')::uuid,materials);
    if p_reference is distinct from fields->>'referenceHash'
      or (p_body->>'expectedVersion')::integer is distinct from (fields->>'version')::integer then
      raise exception 'stock reference changed; confirm the reviewed materials again' using errcode='PT409';
    end if;
  end if;
  if p_body->>'action'='issue' then
    confirmed_lines:=$new$);
end;
$migration$;
