-- BEFORE INSERT also runs for rows discarded by ON CONFLICT. Counting only
-- completed row events prevents an ignored/upserted profile from inflating
-- the counter that protects the last active global administrator.
do $migration$
begin
lock table public.profiles in share row exclusive mode;

drop trigger protect_last_global_admin on public.profiles;
create trigger protect_last_global_admin
after insert or update or delete on public.profiles
for each row execute function public.protect_last_global_admin();

-- Reconcile any drift introduced by previous ignored inserts while writes
-- are serialized. No profile, role or identity is changed by this repair.
update public.global_admin_guard
set active_count = (
  select count(*) from public.profiles
  where status = 'active' and role = 'admin' and global_scope
)
where singleton;
end;
$migration$;
