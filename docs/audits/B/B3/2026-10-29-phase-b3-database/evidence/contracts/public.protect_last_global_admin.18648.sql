CREATE OR REPLACE FUNCTION public.protect_last_global_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old boolean:=false; v_new boolean:=false;
begin
  if tg_op<>'INSERT' then v_old:=old.status='active' and old.role='admin' and old.global_scope; end if;
  if tg_op<>'DELETE' then v_new:=new.status='active' and new.role='admin' and new.global_scope; end if;
  if v_old and not v_new then
    update public.global_admin_guard set active_count=active_count-1 where singleton and active_count>1;
    if not found then raise exception 'last global administrator cannot be removed' using errcode='23514'; end if;
  elsif v_new and not v_old then
    update public.global_admin_guard set active_count=active_count+1 where singleton;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $function$
