CREATE OR REPLACE FUNCTION private.report_notice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m record;begin
 for m in select user_id from public.care_recipient_memberships where care_recipient_id=new.care_recipient_id and status='active' and (user_id=new.reported_by or private.member_can(new.care_recipient_id,user_id,'consumption.confirm')) loop
 perform private.enqueue_notice(new.care_recipient_id,m.user_id,'occurrence.received',null,null,null,new.id);end loop;return new;
end;$function$
