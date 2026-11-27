-- Address the L3 review without changing migrations already applied remotely.
do $migration$
declare
  definition text := pg_get_functiondef('public.team_consumption_command(uuid,uuid,jsonb)'::regprocedure);
  reminder_filter constant text := 'where reminder_id=reminder_id and recipient_user_id=actor';
begin
  if strpos(definition, reminder_filter)=0 then
    raise exception 'team consumption reminder predicate changed';
  end if;
  definition := regexp_replace(definition, '\mreminder_id\M','selected_reminder_id','g');
  definition := replace(definition,
    'where selected_reminder_id=selected_reminder_id and recipient_user_id=actor',
    'where notice.reminder_id=selected_reminder_id and notice.recipient_user_id=actor and notice.care_recipient_id=p_patient');
  definition := replace(definition, 'update public.requisition_notifications set',
    'update public.requisition_notifications notice set');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text := pg_get_functiondef('public.commit_family_stock_operation(uuid,text,jsonb,text,text,uuid)'::regprocedure);
  intent_expression constant text :=
    'intent := encode(extensions.digest(jsonb_build_array(p_patient,p_action,canonical_lines,reason_text,p_reference)::text,''sha256''),''hex'');';
begin
  if strpos(definition,intent_expression)=0
    or strpos(definition,'operation.intent_hash <> intent')=0 then
    raise exception 'family stock operation intent changed';
  end if;
  definition := replace(definition,'current_reference jsonb;','current_reference jsonb; prior_intent text;');
  definition := replace(definition,intent_expression, replace(intent_expression,'intent :=','prior_intent :=')||$sql$
  select jsonb_agg(item || jsonb_build_object('quantity',trim_scale((item->>'quantity')::numeric)::text)
    || case when item ? 'referenceId' then jsonb_build_object('referenceId',(item->>'referenceId')::uuid) else '{}'::jsonb end
    order by item->>'productId')
  into canonical_lines from jsonb_array_elements(canonical_lines) item;
  $sql$||intent_expression);
  definition := replace(definition,'operation.intent_hash <> intent','operation.intent_hash not in (intent,prior_intent)');
  execute definition;
end;
$migration$;

-- Keep the approved purchase aggregate visible under the family stock grant.
-- Reading or acting on the underlying COM still has its own capability.
do $migration$
declare
  definition text := pg_get_functiondef('public.stock_overview(uuid)'::regprocedure);
  purchase_gate constant text := 'purchases boolean := family and coalesce(private.can(p_patient,''com.read''),false);';
begin
  if strpos(definition,purchase_gate)=0 then raise exception 'stock purchase overview gate changed'; end if;
  execute replace(definition,purchase_gate,'purchases boolean := family;');
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
      -- Each direct record belongs to its original period. Count the immutable
      -- effects through the requested cutoff, including corrections then known.
      select movement.product_id,'CARE_TEAM',
        case when movement.source_location='CARE_TEAM' then movement.quantity else -movement.quantity end
      from public.consumption_reports report
      join private.consumption_acts act on act.report_id=report.id and act.care_recipient_id=report.care_recipient_id
      join public.stock_movements movement on movement.reference_type='consumption_operation'
        and movement.reference_id=act.id and movement.care_recipient_id=act.care_recipient_id
      where team and report.care_recipient_id=p_patient and report.workflow_mode='direct'
        and report.created_at>=p_from and report.created_at<p_to and movement.created_at<p_to
        and ((movement.source_location='CARE_TEAM' and movement.destination_location is null)
          or (movement.source_location is null and movement.destination_location='CARE_TEAM'))
    ), totals as (
      select product_id,location,sum(quantity) used,count(*) records from consumption
      group by product_id,location having sum(quantity)>0
    )
    select coalesce(jsonb_agg(jsonb_build_object('productId',product_id,'location',location,
      'quantity',used::text,'movements',records,'days',ceil(days),'averagePerDay',(used/days)::text)
      order by product_id,location),'[]'::jsonb)
    from totals
  );
end;
$$;
