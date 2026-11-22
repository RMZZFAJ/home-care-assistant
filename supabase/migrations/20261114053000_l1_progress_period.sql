-- Civil-day filtering for the laboratory's chronology controls. Existing reads
-- and deep-link location keep their original contract and authorization.
create function public.document_progress_period(p_document uuid,p_filter text,p_page integer,p_size integer,p_from date,p_through date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents; v_total bigint; v_rows jsonb;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then
  raise exception 'document not found' using errcode='42501';end if;
 if p_filter is null or p_filter not in ('all','automatic','manual') or p_page is null or p_page<1 or p_page>1000000
  or p_size is null or p_size<1 or p_size>50 or p_from is not null and p_through is not null and p_from>p_through
  then raise exception 'invalid progress page or period' using errcode='22023';end if;
 with facts as (
  select e.id,e.recorded_at,'automatic'::text source,e.action,e.version,e.actor_id,e.actor_name
  from private.document_progress_facts e where e.document_id=p_document
 ), timeline as (
  select id,recorded_at,source,action,version,actor_id,actor_name from facts where p_filter<>'manual'
  union all select id,recorded_at,'manual',null,null,author_id,author_name from private.document_progress_notes
   where document_id=p_document and p_filter<>'automatic' and private.progress_note_readable(document_progress_notes)
 ), filtered as (
  select * from timeline where (p_from is null or recorded_at >= (p_from::timestamp at time zone 'America/Sao_Paulo'))
   and (p_through is null or recorded_at < ((p_through+1)::timestamp at time zone 'America/Sao_Paulo'))
 ), selected as (select * from filtered order by recorded_at,id limit p_size offset ((p_page::bigint-1)*p_size))
 select (select count(*) from filtered),coalesce(jsonb_agg(case when s.source='manual' then private.progress_note_view(n)
  else jsonb_build_object('id',s.id,'source','automatic','documentId',p_document,'recordedAt',s.recorded_at,
   'action',s.action,'version',s.version,'authorId',s.actor_id,'authorName',s.actor_name) end order by s.recorded_at,s.id),'[]'::jsonb)
 into v_total,v_rows from selected s left join private.document_progress_notes n on s.source='manual' and n.id=s.id;
 return jsonb_build_object('documentId',p_document,'documentType',d.type,'filter',p_filter,'page',p_page,'size',p_size,'total',v_total,
  'from',p_from,'through',p_through,'timeZone','America/Sao_Paulo',
  'canPublish',private.can(d.care_recipient_id,'document.progress.create') and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active),'data',v_rows);
end;$$;
revoke all on function public.document_progress_period(uuid,text,integer,integer,date,date) from public,anon,authenticated,service_role;
grant execute on function public.document_progress_period(uuid,text,integer,integer,date,date) to authenticated;
notify pgrst,'reload schema';
