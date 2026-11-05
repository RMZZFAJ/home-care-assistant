CREATE OR REPLACE FUNCTION private.guard_membership_elevation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null and current_user<>'authenticated' then return new;end if;
 if tg_op='UPDATE' and old.role='admin' and old.status='active' and (new.role<>'admin' or new.status<>'active') and not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=old.care_recipient_id and m.user_id<>old.user_id and m.role='admin' and m.status='active' and p.status='active') then raise exception 'last patient administrator must remain active' using errcode='23514';end if;
 if exists(select 1 from private.membership_authority a where a.backend_pid=pg_backend_pid() and a.transaction_id=txid_current() and a.care_recipient_id=new.care_recipient_id and a.user_id=new.user_id and a.role=new.role and a.manage_stock=new.can_manage_stock and a.count_stock=new.can_count_stock and new.status='active') then return new;end if;
 if not public.can_manage_recipient(new.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;return new;
end;$function$
