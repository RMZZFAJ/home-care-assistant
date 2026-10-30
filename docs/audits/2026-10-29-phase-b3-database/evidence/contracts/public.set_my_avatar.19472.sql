CREATE OR REPLACE FUNCTION public.set_my_avatar(p_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if auth.uid() is null or p_path is null or p_path not like auth.uid()||'/%' or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=p_path) then raise exception 'invalid avatar' using errcode='42501';end if;
 update public.profiles set avatar_path=p_path where id=auth.uid() and status='active';
end;$function$
