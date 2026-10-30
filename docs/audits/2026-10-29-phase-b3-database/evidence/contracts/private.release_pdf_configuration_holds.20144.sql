CREATE OR REPLACE FUNCTION private.release_pdf_configuration_holds()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if new.include_pdf and (tg_op='INSERT' or not old.include_pdf) then
 update public.requisition_notifications n set include_pdf=true,next_attempt_at=now(),attempts=0,last_error=null
 where n.care_recipient_id=new.care_recipient_id and n.channel='whatsapp' and n.state='pending' and n.next_attempt_at='infinity'::timestamptz and n.last_error='PDF_TEMPLATE_VARIANT_REQUIRED'
 and case n.event_key when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else n.event_key end=new.event
 and exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=n.care_recipient_id and m.user_id=n.recipient_user_id and m.role::text=new.subject_role and m.status='active');
 end if;return null;
end;$function$
