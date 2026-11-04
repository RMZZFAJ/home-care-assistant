CREATE OR REPLACE FUNCTION public.register_verified_phone()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p text;begin
 if not public.recent_session() then raise exception 'recent authentication required' using errcode='42501';end if;
 select '+'||ltrim(phone,'+') into p from auth.users where id=auth.uid() and phone_confirmed_at is not null and length(phone)>7;
 if p is null then raise exception 'confirm phone with Auth OTP first';end if;
 insert into public.verified_phones(user_id,phone) values(auth.uid(),p) on conflict(user_id) do update set phone=excluded.phone,verified_at=now();
end;$function$
