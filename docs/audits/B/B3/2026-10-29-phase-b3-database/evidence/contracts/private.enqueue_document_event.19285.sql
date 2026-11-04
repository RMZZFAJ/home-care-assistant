CREATE OR REPLACE FUNCTION private.enqueue_document_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;m record;event_name text;pdf boolean;begin
 if new.action in ('req.legacy_imported','attachment.reserved','attachment.ready','attachment.rejected','attachment.bound') then return new;end if;
 select * into strict d from public.operational_documents where id=new.document_id;if d.status='draft' then return new;end if;
 if new.action='req.fulfillment_updated' and (coalesce((new.body->'event'->>'fulfilled')::integer,0)=0 or (new.body->'event'->>'fulfilled')::integer=(new.body->'event'->>'total')::integer) then return new;end if;
 for m in select user_id,role from public.care_recipient_memberships where care_recipient_id=d.care_recipient_id and status='active' loop
 if not private.member_can(d.care_recipient_id,m.user_id,lower(d.type)||'.read') then continue;end if;
 if m.role='reader' and not exists(select 1 from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=new.action and subject_role='reader' and cardinality(channels)>0) and not exists(select 1 from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.user_id and is_enabled) then continue;end if;
 if new.action in ('ent.issued','ent.submit') and m.role in ('professional','supervisor') and m.user_id<>d.recipient_id then continue;end if;
 if new.action in ('req.science_satisfied','req.science_recorded') and m.user_id<>d.created_by and m.role not in ('admin','family') then continue;end if;
 if new.action like 'req.archived.%' and m.role not in ('admin','family') then continue;end if;
 if new.action='req.reminder' and m.role not in ('admin','family') then continue;end if;
 if new.action='ent.reminder' and m.user_id<>d.recipient_id then continue;end if;
 if new.action='req.issued' and m.user_id<>d.created_by and m.role not in ('admin','family','supervisor') and not exists(select 1 from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.user_id and is_enabled) and not exists(select 1 from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=new.action and subject_role=m.role::text and cardinality(channels)>0) then continue;end if;
 event_name:=case when new.action='req.issued' and m.user_id=d.created_by then 'req.registered_author' else new.action end;
 select coalesce(include_pdf,true) into pdf from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=event_name and subject_role=m.role::text;
 if event_name='req.science_satisfied' and m.user_id=d.created_by then pdf:=true;end if;
 perform private.enqueue_notice(d.care_recipient_id,m.user_id,event_name,d.id,new.id,null,null,null,coalesce(pdf,true));
 end loop;return new;
end;$function$
