CREATE OR REPLACE FUNCTION private.enqueue_notice(p_patient uuid, p_user uuid, p_event text, p_document uuid DEFAULT NULL::uuid, p_document_event uuid DEFAULT NULL::uuid, p_alert uuid DEFAULT NULL::uuid, p_report uuid DEFAULT NULL::uuid, p_reminder uuid DEFAULT NULL::uuid, p_pdf boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare person public.profiles;m public.care_recipient_memberships;r public.notification_event_rules;channels text[];v_channel text;destination text;due timestamptz:=now();local_now timestamp:=now() at time zone 'America/Sao_Paulo';h integer;g text;required boolean;begin
 select * into person from public.profiles where id=p_user and status='active';if not found then return;end if;
 select * into m from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=p_user and status='active';if not found then return;end if;
 select * into r from public.notification_event_rules where care_recipient_id=p_patient and event=case p_event when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else p_event end and subject_role=m.role::text;
 channels:=case when found then r.channels else array(select distinct v from (select 'internal'::text v union select x.channel from public.recipient_notification_settings x where x.care_recipient_id=p_patient and x.recipient_user_id=p_user and x.is_enabled) c) end;
 required:=r.mode='required';if required and not('internal'=any(channels)) then channels:=array_append(channels,'internal');end if;
 if r.mode='silent' then channels:=array['internal'];end if;
 g:=case m.role when 'family' then 'family' when 'supervisor' then 'supervision' when 'professional' then 'care_team' else 'other' end;
 h:=extract(hour from local_now);
 if r.quiet_start is not null and r.quiet_end is not null and (r.quiet_start<=r.quiet_end and h>=r.quiet_start and h<r.quiet_end or r.quiet_start>r.quiet_end and (h>=r.quiet_start or h<r.quiet_end)) then
 due:=(date_trunc('day',local_now)+make_interval(hours=>r.quiet_end)+case when r.quiet_start>r.quiet_end and h>=r.quiet_start then interval '1 day' else interval '0' end) at time zone 'America/Sao_Paulo';end if;
 foreach v_channel in array channels loop
 if v_channel='internal' then
 if not coalesce(required,false) and not coalesce((person.notification_preferences->>'internal')::boolean,true) then continue;end if;
 destination:=null;
 else
 if not coalesce((person.notification_preferences->>v_channel)::boolean,false) then continue;end if;
 select s.destination into destination from public.recipient_notification_settings s where care_recipient_id=p_patient and recipient_user_id=p_user and s.channel=v_channel and is_enabled;
 if destination is null then continue;end if;
 if v_channel='email' and not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and lower(u.email)=lower(destination)) then continue;end if;
 if v_channel='whatsapp' and not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=p_user and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null and ltrim(v.phone,'+')=ltrim(destination,'+')) then continue;end if;
 end if;
 if coalesce(r.cooldown_minutes,0)>0 and exists(select 1 from public.requisition_notifications n where n.care_recipient_id=p_patient and n.recipient_user_id=p_user and n.event_key=p_event and n.channel=v_channel
 and coalesce(n.document_id,n.alert_event_id,n.consumption_report_id,n.reminder_id)=coalesce(p_document,p_alert,p_report,p_reminder) and n.created_at>now()-make_interval(mins=>r.cooldown_minutes)) then continue;end if;
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,alert_event_id,consumption_report_id,reminder_id,recipient_user_id,recipient_group,recipient_label,channel,destination,event_key,include_pdf,next_attempt_at,silent)
 values(p_patient,p_document,p_document_event,p_alert,p_report,p_reminder,p_user,g,person.full_name,v_channel,destination,p_event,p_event<>'req.registered_author' and p_pdf,case when v_channel='internal' then now() else due end,coalesce(r.mode='silent',false)) on conflict do nothing;
 end loop;
end;$function$
