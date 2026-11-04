CREATE OR REPLACE FUNCTION public.balance_workspace(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_a public.bal_assignments;v_doc uuid;v_available boolean:=false;v_enabled boolean;begin
 perform private.require_cap(p_patient,'bal.read');
 select enabled into v_enabled from public.bal_regimes where care_recipient_id=p_patient;
 select * into v_a from public.bal_assignments where care_recipient_id=p_patient and status='active';
 if found then
 select document_id into v_doc from public.bal_cycles where id=v_a.cycle_id;
 v_available:=v_a.professional_id=auth.uid() and private.can(p_patient,'bal.count') and v_a.starts_at<=now() and v_a.ends_at>now()
 and exists(select 1 from public.scheduled_shifts s where s.id=v_a.shift_id and s.status='published' and s.version=v_a.shift_version)
 and private.schedule_worker(p_patient,auth.uid());end if;
 return jsonb_build_object('referenceRevision',private.team_revision(p_patient)::text,'enabled',coalesce(v_enabled,false),'regime',(select to_jsonb(r) from public.bal_regimes r where care_recipient_id=p_patient),
 'eligibility',jsonb_build_object('available',v_available,'assignment',case when v_a.id is not null then to_jsonb(v_a) end,'documentId',v_doc,'href','/fichas/bal','dueAt',v_a.ends_at),
 'types',coalesce((select jsonb_agg(to_jsonb(t) order by t.starts_local,t.name) from public.shift_types t where t.care_recipient_id=p_patient),'[]'),
 'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name) order by p.full_name) from public.profiles p where private.schedule_worker(p_patient,p.id) and private.member_can(p_patient,p.id,'bal.count')),'[]'),'obligations',coalesce((select jsonb_agg(to_jsonb(x) order by x.week_start desc) from (select * from public.bal_obligations where care_recipient_id=p_patient order by week_start desc limit 104) x),'[]'),
 'assignments',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name) order by x.created_at desc)
 from (select * from public.bal_assignments where care_recipient_id=p_patient order by created_at desc limit 200) x join public.profiles p on p.id=x.professional_id join public.scheduled_shifts s on s.id=x.shift_id join public.shift_types t on t.id=s.shift_type_id),'[]'),
 'deferrals',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.bal_deferrals where care_recipient_id=p_patient order by created_at desc limit 100) x),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.bal_cycle_events where care_recipient_id=p_patient order by created_at desc limit 200) x),'[]'),
 'targets',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name) order by s.starts_at)
 from public.scheduled_shifts s join public.profiles p on p.id=s.professional_id join public.shift_types t on t.id=s.shift_type_id
 where s.care_recipient_id=p_patient and s.status='published' and s.ends_at>now() and s.starts_at<now()+interval '35 days'
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count')),'[]'));
end;$function$
