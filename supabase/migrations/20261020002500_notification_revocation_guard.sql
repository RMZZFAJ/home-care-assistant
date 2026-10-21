create or replace function public.validate_notification_job(p_id uuid,p_worker_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare n public.requisition_notifications;
begin
  if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
  select * into n from public.requisition_notifications where id=p_id and leased_by=p_worker_id and state='processing' and lease_expires_at>now() for update;
  if not found then return false;end if;
  if not exists(select 1 from public.profiles p where p.id=n.recipient_user_id and p.status='active' and
    (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.user_id=p.id and m.care_recipient_id=n.care_recipient_id and m.status='active')))
  then
    update public.requisition_notifications set state='cancelled',last_error='recipient access revoked before send',leased_by=null,lease_expires_at=null where id=n.id;return false;
  end if;
  return true;
end;$$;
create or replace function public.invalidate_revoked_membership_invitations() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='revoked' then
    update public.care_recipient_invitations set status='revoked' where care_recipient_id=new.care_recipient_id and status='pending' and email=(select lower(email) from auth.users where id=new.user_id);
    update public.requisition_notifications set state=case when state='processing' then 'uncertain' else 'cancelled' end,
      last_error='recipient patient membership revoked',leased_by=null,lease_expires_at=null
    where care_recipient_id=new.care_recipient_id and recipient_user_id=new.user_id and state in ('pending','processing');
  end if;return new;
end;$$;
create or replace function public.invalidate_revoked_profile_notifications() returns trigger
language plpgsql security definer set search_path=public as $$begin
  if new.status='revoked' then
    update public.requisition_notifications set state=case when state='processing' then 'uncertain' else 'cancelled' end,
      last_error='recipient global account revoked',leased_by=null,lease_expires_at=null
    where recipient_user_id=new.id and state in ('pending','processing');
  end if;return new;
end;$$;
create trigger invalidate_revoked_profile_notifications after update of status on public.profiles for each row execute function public.invalidate_revoked_profile_notifications();
revoke all on function public.validate_notification_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.validate_notification_job(uuid,uuid) to authenticated,service_role;
