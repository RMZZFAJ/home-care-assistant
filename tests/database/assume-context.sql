-- Test-only bridge: identities AND sessions were issued by local Supabase Auth.
-- Never creates sessions, changes authorization rules, or enters production.
create function pg_temp.assume_context(who text,patient uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid;sid uuid;target uuid;begin
 select id into strict u from public.profiles where full_name='Teste '||who;
 select id into strict sid from auth.sessions where user_id=u order by created_at desc limit 1;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',sid,'aal','aal1')::text,true);
 target:=coalesce(patient,case when who='adminB' then '20000000-0000-4000-8000-000000000002'::uuid else '20000000-0000-4000-8000-000000000001'::uuid end);
 if who like 'global%' and patient is null then perform public.select_active_context(null);
 elsif exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=target and m.user_id=u and m.status='active' and p.status='active') then
 perform public.select_active_context(target);
 end if;
end;$$;
revoke all on function pg_temp.assume_context(text,uuid) from public;
grant execute on function pg_temp.assume_context(text,uuid) to authenticated,service_role;
