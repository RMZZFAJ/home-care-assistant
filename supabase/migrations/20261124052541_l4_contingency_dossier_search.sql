create function public.contingency_case_index(p_patient uuid, p_process text, p_query text, p_page integer)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  query_text text := btrim(p_query);
  search_text text := lower(query_text);
  result jsonb;
begin
  perform private.require_contingency(p_patient, p_process, 'contingency.read');
  if query_text is null or length(query_text) > 200 or p_page is null or p_page not between 0 and 100000 then
    raise exception 'invalid contingency search' using errcode = '22023';
  end if;

  with matches as materialized (
    select c.id, c.created_at
    from private.contingency_cases c
    where c.care_recipient_id = p_patient and c.process = p_process
      and (search_text = ''
        or strpos(c.id::text, search_text) > 0
        or strpos(lower(c.content->>'knownReference'), search_text) > 0
        or strpos(lower(c.content->>'fact'), search_text) > 0
        or exists (
          select 1 from private.contingency_events e where e.case_id = c.id
            and case e.action
              when 'supplement' then strpos(lower(e.body->>'knownReference'), search_text) > 0
                or strpos(lower(e.body->>'fact'), search_text) > 0
              when 'link_existing' then strpos(lower(e.body->>'targetCode'), search_text) > 0
              else false
            end
        ))
  ), results as (
    select id, created_at from matches order by created_at desc, id limit 25 offset p_page * 25
  )
  select jsonb_build_object(
    'patientId', p_patient, 'process', p_process, 'query', query_text, 'page', p_page, 'pageSize', 25,
    'total', (select count(*) from matches),
    'canReport', private.contingency_allowed(p_patient, p_process, 'contingency.report'),
    'data', coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'patientId', c.care_recipient_id, 'process', c.process,
      'reference', c.content->>'knownReference', 'description', left(c.content->>'fact', 240),
      'recordedAt', c.created_at,
      'state', case recent.action when 'link_existing' then 'linked'
        when 'needs_clarification' then 'needs_clarification' else 'recorded' end
    ) order by c.created_at desc, c.id), '[]'::jsonb)
  ) into result
  from results
  join private.contingency_cases c on c.id = results.id
  left join lateral (
    select e.action from private.contingency_events e where e.case_id = c.id order by e.sequence desc limit 1
  ) recent on true;
  return result;
end;
$$;

revoke all on function public.contingency_case_index(uuid, text, text, integer) from public, anon, authenticated, service_role;
grant execute on function public.contingency_case_index(uuid, text, text, integer) to authenticated;

create function public.contingency_case_dossier(p_patient uuid, p_process text, p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  dossier jsonb;
  evidence jsonb;
begin
  if p_id is null then raise exception 'contingency dossier required' using errcode = '22023'; end if;
  dossier := public.contingency_cases(p_patient, p_process, p_id);
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'filename', a.filename, 'confirmedAt', a.confirmed_at)
    order by a.confirmed_at, a.id), '[]'::jsonb) into evidence
  from public.attachments a
  where a.contingency_id = p_id and a.care_recipient_id = p_patient and a.state = 'ready'
    and private.attachment_read(a.id);
  return dossier || jsonb_build_object('evidence', evidence);
end;
$$;

revoke all on function public.contingency_case_dossier(uuid, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.contingency_case_dossier(uuid, text, uuid) to authenticated;
