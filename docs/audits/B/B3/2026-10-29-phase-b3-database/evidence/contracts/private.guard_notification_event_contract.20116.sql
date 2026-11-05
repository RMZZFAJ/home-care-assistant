CREATE OR REPLACE FUNCTION private.guard_notification_event_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if tg_table_name='notification_event_rules' then
 if 'whatsapp'=any(new.channels) and not private.whatsapp_event_supported(new.event) then raise exception 'event supports application notices only' using errcode='23514';end if;
 elsif new.channel='whatsapp' and new.event_key is not null and not private.whatsapp_event_supported(new.event_key) then return null;
 end if;return new;
end;$function$
