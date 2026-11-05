CREATE OR REPLACE FUNCTION private.guard_bal_schedule_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if (new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.status<>'published') and exists(
 select 1 from public.bal_assignments a where a.shift_id=old.id and a.status='active' and a.ends_at>now()) then
 raise exception 'balance requires family deferral before schedule period change' using errcode='P0001';end if;
 return new;
end;$function$
