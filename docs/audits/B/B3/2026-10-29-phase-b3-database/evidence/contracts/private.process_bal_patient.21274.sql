CREATE OR REPLACE FUNCTION private.process_bal_patient(p_patient uuid, p_now timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_r public.bal_regimes;v_type public.shift_types;v_c public.bal_cycles;v_a public.bal_assignments;v_s public.scheduled_shifts;
 v_week date;v_today date;v_day date;v_start timestamptz;v_due timestamptz;v_floor timestamptz;v_matches integer;v_sid uuid;v_late record;v_cycles integer:=0;v_i integer;v_was_missed boolean:=false;
begin
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 select * into v_r from public.bal_regimes where care_recipient_id=p_patient and enabled;
 if not found or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then return 0;end if;
 select * into strict v_type from public.shift_types where id=v_r.shift_type_id;
 v_today:=(p_now at time zone v_r.timezone)::date;
 v_week:=coalesce((select max(week_start)+7 from public.bal_obligations where care_recipient_id=p_patient),date_trunc('week',v_r.starts_on::timestamp)::date);
 -- Bounded historical catch-up; future runs continue from the same unique weeks.
 for v_i in 0..105 loop
 exit when v_week>v_today;
 v_day:=v_week+((v_r.weekday+6)%7);
 if v_day<v_r.starts_on then v_week:=v_week+7;continue;end if;
 v_start:=(v_day+v_type.starts_local) at time zone v_r.timezone;v_due:=v_start+make_interval(mins=>v_type.duration_minutes);
 select count(*),min(s.starts_at),min(s.ends_at) into v_matches,v_floor,v_due from public.scheduled_shifts s
 where s.care_recipient_id=p_patient and s.status='published' and s.shift_type_id=v_r.shift_type_id
 and (s.starts_at at time zone v_r.timezone)::date=v_day
 and (v_r.designated_professional_id is null or s.professional_id=v_r.designated_professional_id)
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count');
 if v_matches=1 then v_start:=v_floor;else v_due:=v_start+make_interval(mins=>v_type.duration_minutes);end if;
 if v_start>p_now then v_week:=v_week+7;continue;end if;
 if not exists(select 1 from public.bal_obligations where care_recipient_id=p_patient and week_start=v_week) then
 select * into v_c from public.bal_cycles where care_recipient_id=p_patient and state='open' for update;
 if not found then insert into public.bal_cycles(care_recipient_id) values(p_patient) returning * into v_c;end if;
 insert into public.bal_obligations(care_recipient_id,cycle_id,week_start,original_start,original_due,effective_due,regime_snapshot)
 values(p_patient,v_c.id,v_week,v_start,v_due,v_due,to_jsonb(v_r));
 perform private.bal_event(p_patient,v_c.id,null,'bal.cycle.opened','Obrigação semanal disponibilizada',jsonb_build_object('weekStart',v_week,'dueAt',v_due),'week:'||v_week);
 end if;v_week:=v_week+7;
 end loop;
 -- Handle both open cycles and formal recount assignments on counted cycles.
 for v_c in select * from public.bal_cycles c where care_recipient_id=p_patient and (state='open' or exists(select 1 from public.bal_assignments a where a.cycle_id=c.id and a.status='active')) order by created_at loop
 v_floor:=greatest(coalesce((select min(original_start) from public.bal_obligations where cycle_id=v_c.id),p_now),coalesce((select max(ends_at) from public.bal_assignments where cycle_id=v_c.id and status='missed'),'-infinity'::timestamptz));
 v_was_missed:=exists(select 1 from public.bal_assignments where cycle_id=v_c.id and status='missed');
 for v_i in 0..100 loop
 select * into v_a from public.bal_assignments where care_recipient_id=p_patient and cycle_id=v_c.id and status='active' for update;
 if found then
 select * into v_s from public.scheduled_shifts where id=v_a.shift_id;
 if v_a.ends_at<=p_now then
 update public.bal_assignments set status='missed',missed_at=v_a.ends_at,version=version+1 where id=v_a.id;
 update public.bal_obligations set missed_at=coalesce(missed_at,effective_due) where cycle_id=v_c.id and state='pending' and effective_due<=p_now;
 perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.missed','Plantão encerrado sem contagem',jsonb_build_object('deadline',v_a.ends_at,'professionalId',v_a.professional_id),'missed:'||v_a.id);
 v_floor:=v_a.ends_at;v_was_missed:=true;
 elsif v_s.status<>'published' or v_s.version<>v_a.shift_version or not private.schedule_worker(p_patient,v_a.professional_id) or not private.member_can(p_patient,v_a.professional_id,'bal.count') then
 update public.bal_assignments set status='invalidated',version=version+1 where id=v_a.id;
 perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.invalidated','Escala ou autorização alterada; atribuição anterior preservada','{}','invalidated:'||v_a.id);
 v_floor:=greatest(v_floor,p_now-interval '24 hours');
 else
 if v_a.starts_at<=p_now then perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.available','Contagem disponível no período programado',jsonb_build_object('startsAt',v_a.starts_at,'dueAt',v_a.ends_at),'available:'||v_a.id);end if;
 exit;end if;
 end if;
 update public.bal_deferrals d set status='stale',decided_at=p_now where d.cycle_id=v_c.id and d.status='pending'
 and (not exists(select 1 from public.bal_assignments a where a.id=d.assignment_id and a.status='active' and a.version=d.assignment_version) or not exists(select 1 from public.scheduled_shifts s where s.id=d.target_shift_id and s.status='published' and s.version=d.target_shift_version));
 if v_c.state='counted' then exit;end if;
 if exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then exit;end if;
 -- Never choose arbitrarily between simultaneous eligible professionals.
 select min(s.starts_at) into v_start from public.scheduled_shifts s where s.care_recipient_id=p_patient and s.status='published'
 and s.starts_at>=v_floor and not exists(select 1 from public.bal_assignments a where a.cycle_id=v_c.id and a.shift_id=s.id and (a.status<>'invalidated' or a.shift_version=s.version))
 and (exists(select 1 from public.bal_assignments where cycle_id=v_c.id) or p_now>=(select min(effective_due) from public.bal_obligations where cycle_id=v_c.id)
 or s.shift_type_id=v_r.shift_type_id and (s.starts_at at time zone v_r.timezone)::date=(v_floor at time zone v_r.timezone)::date and (v_r.designated_professional_id is null or s.professional_id=v_r.designated_professional_id))
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count');
 select count(*),min(s.id::text)::uuid into v_matches,v_sid from public.scheduled_shifts s where s.care_recipient_id=p_patient and s.status='published' and s.starts_at=v_start
 and (exists(select 1 from public.bal_assignments where cycle_id=v_c.id) or p_now>=(select min(effective_due) from public.bal_obligations where cycle_id=v_c.id)
 or s.shift_type_id=v_r.shift_type_id and (s.starts_at at time zone v_r.timezone)::date=(v_floor at time zone v_r.timezone)::date and (v_r.designated_professional_id is null or s.professional_id=v_r.designated_professional_id))
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count')
 and not exists(select 1 from public.bal_assignments a where a.cycle_id=v_c.id and a.shift_id=s.id and (a.status<>'invalidated' or a.shift_version=s.version));
 if v_matches<>1 then
 perform private.bal_event(p_patient,v_c.id,null,'bal.cycle.unassigned','Sem próximo plantão único elegível; exige solução autorizada',jsonb_build_object('ambiguous',v_matches>1),'unassigned:'||v_c.id||':'||v_floor);
 exit;end if;
 select * into v_s from public.scheduled_shifts where id=v_sid;
 -- Past assignments are recorded without pretending they are currently executable.
 insert into public.bal_assignments(care_recipient_id,cycle_id,shift_id,shift_version,professional_id,starts_at,ends_at,kind)
 values(p_patient,v_c.id,v_sid,v_s.version,v_s.professional_id,v_s.starts_at,v_s.ends_at,case when v_was_missed or exists(select 1 from public.bal_assignments where cycle_id=v_c.id) then 'transfer' else 'scheduled' end) returning * into v_a;
 perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.assigned','Responsabilidade vinculada ao plantão real',to_jsonb(v_s),'assignment:'||v_a.id);
 v_cycles:=v_cycles+1;
 if v_s.ends_at>p_now then exit;end if;
 end loop;end loop;
 for v_late in update public.bal_obligations set missed_at=effective_due where care_recipient_id=p_patient and state='pending' and missed_at is null and effective_due<=p_now returning * loop
 perform private.bal_event(p_patient,v_late.cycle_id,null,'bal.cycle.overdue','Prazo do balanço ultrapassado; obrigação preservada',jsonb_build_object('originalDue',v_late.original_due,'effectiveDue',v_late.effective_due),'overdue:'||v_late.id);end loop;return v_cycles;
end;$function$
