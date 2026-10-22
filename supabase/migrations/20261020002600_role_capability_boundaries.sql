-- Official stock is administered by patient/global administrators. Supervisors and
-- professionals may submit requests and count when granted; family/readers read.
create or replace function public.recipient_can(p_recipient_id uuid,p_operation text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.care_recipients r where r.id=p_recipient_id and r.is_active)
    and (public.is_global_administrator() or exists(
      select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
      where m.care_recipient_id=p_recipient_id and m.user_id=auth.uid() and m.status='active' and p.status='active'
        and case p_operation
          when 'admin' then m.role='admin'
          when 'submit' then m.role in ('admin','supervisor','professional')
          when 'review' then m.role in ('admin','supervisor')
          when 'stock' then m.role='admin'
          when 'count' then m.role='admin' or m.role in ('supervisor','professional') and m.can_count_stock
          else false end));
$$;
create or replace function public.normalize_local_capabilities() returns trigger
language plpgsql set search_path=public as $$begin
  new.can_manage_stock:=new.role='admin' and coalesce(new.can_manage_stock,false);
  new.can_count_stock:=new.role in ('admin','supervisor','professional') and coalesce(new.can_count_stock,false);
  return new;
end;$$;
create trigger normalize_membership_capabilities before insert or update on public.care_recipient_memberships
for each row execute function public.normalize_local_capabilities();
create trigger normalize_invitation_capabilities before insert or update on public.care_recipient_invitations
for each row execute function public.normalize_local_capabilities();
update public.care_recipient_memberships set can_manage_stock=false where role<>'admin' and can_manage_stock;
update public.care_recipient_memberships set can_count_stock=false where role in ('reader','family') and can_count_stock;
update public.care_recipient_invitations set can_manage_stock=false where role<>'admin' and can_manage_stock;
update public.care_recipient_invitations set can_count_stock=false where role in ('reader','family') and can_count_stock;
