begin;
-- Finalization and recovery retain current member/domain authority even after
-- an independent reconciliation closes new evidence submissions.
create function private.contingency_evidence_access(p_case uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.contingency_cases c join public.care_recipients p on p.id=c.care_recipient_id
 where c.id=p_case and p.is_active and private.member_can(c.care_recipient_id,p_user,'contingency.report')
 and private.member_can(c.care_recipient_id,p_user,private.contingency_domain(c.process)));
$$;
revoke all on function private.contingency_evidence_access(uuid,uuid) from public,anon,authenticated,service_role;
do $patch$ declare body text;begin
 body:=btrim(replace(pg_get_functiondef('public.finalize_attachment(uuid,uuid,text,text,bigint,boolean)'::regprocedure),chr(13),''),chr(10));
 if encode(extensions.digest(body,'sha256'),'hex')<>'f07193ebb9548dd4c48314c3b11d53e86d0d1b29b6d8be4cbed9ab1b27b449d1' then raise exception 'contingency finalizer baseline drift';end if;
 execute replace(body,$before$case when a.document_id is not null then$before$,$after$case when a.contingency_id is not null then private.contingency_evidence_access(a.contingency_id,p_actor) when a.document_id is not null then$after$);
end;$patch$;
commit;
