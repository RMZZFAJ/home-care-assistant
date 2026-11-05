CREATE OR REPLACE FUNCTION private.enqueue_scheduled_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record;user_id uuid;rid uuid;today date:=(now() at time zone 'America/Sao_Paulo')::date;clock_hour integer:=extract(hour from now() at time zone 'America/Sao_Paulo');n integer:=0;begin
 for s in select p.care_recipient_id,p.settings from public.patient_settings p join public.care_recipients c on c.id=p.care_recipient_id where c.is_active and (p.settings ? 'balReminderUsers' or p.settings ? 'shiftReminder') limit 100 loop
 if not exists(select 1 from public.bal_regimes br where br.care_recipient_id=s.care_recipient_id and br.enabled) and s.settings->>'balDay' is not null and (s.settings->>'balDay')::integer=extract(dow from today) and clock_hour>=9 then
 for user_id in select value::uuid from jsonb_array_elements_text(coalesce(s.settings->'balReminderUsers','[]')) loop
 if not private.member_can(s.care_recipient_id,user_id,'bal.count') then continue;end if;
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at) values(s.care_recipient_id,user_id,'bal',today,(today+time '09:00') at time zone 'America/Sao_Paulo') on conflict do nothing returning id into rid;
 if rid is not null then perform private.enqueue_notice(s.care_recipient_id,user_id,'bal.reminder',null,null,null,null,rid);n:=n+1;end if;end loop;end if;
 if coalesce((s.settings->'shiftReminder'->>'enabled')::boolean,false) and clock_hour>=coalesce((s.settings->'shiftReminder'->>'hour')::integer,19)
 and coalesce(s.settings->'shiftReminder'->'days','[]') ? extract(dow from today)::text then
 for user_id in select value::uuid from jsonb_array_elements_text(coalesce(s.settings->'shiftReminder'->'userIds','[]')) loop
 if not private.member_can(s.care_recipient_id,user_id,'consumption.report') then continue;end if;
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at) values(s.care_recipient_id,user_id,'shift',today,(today+make_time((s.settings->'shiftReminder'->>'hour')::integer,0,0)) at time zone 'America/Sao_Paulo') on conflict do nothing returning id into rid;
 if rid is not null then perform private.enqueue_notice(s.care_recipient_id,user_id,'shift.reminder',null,null,null,null,rid);n:=n+1;end if;end loop;end if;
 end loop;return n;
end;$function$
