-- Preserve the existing normal path for an approved invitation awaiting its
-- recipient, alongside proposals still awaiting local approval. Filter before
-- pagination so neither older actionable state is hidden by resolved history.
create or replace function public.patient_governance_changes(p_patient uuid,p_status text default 'open',p_kind text default null,p_query text default '',p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient) then raise exception 'patient unavailable' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 1000000 or p_size is null or p_size not between 1 and 50
  or p_status is null or p_status not in ('open','all','pending','awaiting_acceptance','applied','rejected')
  or p_kind is not null and p_kind not in ('capability','settings','membership','notification_rule','administration')
  or p_query is null or length(p_query)>160 then raise exception 'invalid governance query' using errcode='22023';end if;
 with matching as materialized (
  select c.* from public.access_change_requests c where c.care_recipient_id=p_patient
   and (p_status='all' or p_status='open' and c.status in ('pending','awaiting_acceptance') or c.status=p_status)
   and (p_kind is null or c.kind=p_kind)
   and (btrim(p_query)='' or strpos(lower(c.id::text||' '||c.kind||' '||c.proposed::text),lower(btrim(p_query)))>0)
 ), page_rows as (
  select * from matching order by created_at desc,id desc limit p_size offset ((p_page::bigint-1)*p_size)
 ) select jsonb_build_object('total',(select count(*) from matching),'page',p_page,'pageSize',p_size,'changes',coalesce((
  select jsonb_agg((to_jsonb(c)-'idempotency_key')||jsonb_build_object('resolution',c.resolution-'invitationHash',
   'proposerName',coalesce(p.full_name,'Identidade histórica'),'current',private.access_change_current(p_patient,c.kind,c.proposed),
   'subjectName',(select s.full_name from public.profiles s where s.id::text=coalesce(c.proposed->>'userId',c.proposed->>'subjectUser',c.proposed->'args'->>'userId',c.proposed->'args'->>'recipientUserId')))
   order by c.created_at desc,c.id desc) from page_rows c left join public.profiles p on p.id=c.proposed_by),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.patient_governance_changes(uuid,text,text,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.patient_governance_changes(uuid,text,text,text,integer,integer) to authenticated;
