CREATE OR REPLACE FUNCTION public.schedule_workspace(p_patient uuid, p_from date, p_until date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not(private.can(p_patient,'schedule.read.team') or private.can(p_patient,'schedule.read.own')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if p_from is null or p_until is null or p_until<p_from or p_until>p_from+42 then raise exception 'invalid schedule interval';end if;
 return jsonb_build_object('types',coalesce((select jsonb_agg(to_jsonb(t) order by t.starts_local,t.name) from public.shift_types t where t.care_recipient_id=p_patient),'[]'),
 'shifts',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name) order by s.starts_at,p.full_name)
 from public.scheduled_shifts s join public.profiles p on p.id=s.professional_id join public.shift_types t on t.id=s.shift_type_id
 where s.care_recipient_id=p_patient and private.schedule_visible(p_patient,s.professional_id)
 and s.starts_at<((p_until+1)::timestamp at time zone s.timezone) and s.ends_at>(p_from::timestamp at time zone s.timezone)),'[]'),
 'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name) order by p.full_name)
 from public.profiles p where private.schedule_worker(p_patient,p.id) and (private.can(p_patient,'schedule.read.team') or private.can(p_patient,'schedule.propose') or p.id=auth.uid())),'[]'),
 'changes',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.shift_change_requests c where c.care_recipient_id=p_patient
 and private.schedule_visible(p_patient,c.professional_id) and c.status='pending'),'[]'),
 'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.shift_series s where s.care_recipient_id=p_patient
 and private.schedule_visible(p_patient,s.professional_id) and s.valid_until>=p_from and s.anchor_date<=p_until),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select * from public.shift_events where care_recipient_id=p_patient
 and private.schedule_visible(p_patient,professional_id) order by created_at desc limit 100) e),'[]'));
end;$function$
