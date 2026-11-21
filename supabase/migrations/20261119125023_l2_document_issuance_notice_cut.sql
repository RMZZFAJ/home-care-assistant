alter table private.initial_document_pdf_requests add column notice_cut jsonb;

-- The version already freezes the issuance and applicable tacit science.
-- Post-issuance decisions and deliberate resends do not enter this exemplar.
create function private.initial_pdf_notice_ids(p_request uuid) returns setof uuid
language sql stable set search_path='' as $$
  select n.id
  from private.initial_document_pdf_requests q
  join public.document_events e on e.document_id=q.document_id and e.version<=q.version
  join public.requisition_notifications n on n.document_event_id=e.id and n.document_id=q.document_id
  where q.id=p_request and q.purpose='initial' and n.origin_notification_id is null
    and (e.action in ('req.issued','com.issued','com.submit','ent.issued','ent.submit','bal.issued','bal.submit')
      or e.action in ('req.science_recorded','req.science_satisfied') and e.body#>>'{event,mode}'='tacit');
$$;

create function public.claim_initial_pdf_notices(
  p_request uuid,p_limit integer,p_worker_id uuid,p_external_enabled boolean
) returns setof public.requisition_notifications
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'issuance notice worker required' using errcode='42501';
  end if;
  if p_worker_id is null or p_limit is null or p_limit not between 1 and 10 then
    raise exception 'invalid issuance notice claim' using errcode='22023';
  end if;

  -- A captured cut or a pre-existing exemplar is sufficient for recovery.
  -- The regular worker still owns the ongoing outbox and its normal retries.
  if not exists(select 1 from private.initial_document_pdf_requests q
      where q.id=p_request and q.purpose='initial' and q.notice_cut is null
        and not exists(select 1 from private.pdf_issuances r where r.initial_request_id=q.id))
  then return; end if;

  update public.requisition_notifications
    set state=case when channel='internal' then 'pending' else 'uncertain' end,
        leased_by=null,lease_expires_at=null,last_error='processing lease expired'
    where id in (select private.initial_pdf_notice_ids(p_request))
      and state='processing' and lease_expires_at<now();
  return query
    with due as (
      select n.id from public.requisition_notifications n
      where n.id in (select private.initial_pdf_notice_ids(p_request))
        and n.state='pending' and n.next_attempt_at<=now() and n.attempts<5
        and (n.channel='internal' or n.channel='whatsapp' and coalesce(p_external_enabled,false))
      order by n.next_attempt_at,n.id limit p_limit for update of n skip locked
    )
    update public.requisition_notifications n
    set state='processing',attempts=n.attempts+1,attempted_at=now(),leased_by=p_worker_id,
        lease_expires_at=now()+interval '2 minutes'
    from due where n.id=due.id returning n.*;
end;
$$;

create function private.initial_pdf_notice_cut(p_request uuid,p_unconfirmed boolean) returns jsonb
language sql stable set search_path='' as $$
  with notices as materialized (
    select id,channel,state,last_error
    from public.requisition_notifications
    where id in (select private.initial_pdf_notice_ids(p_request))
  ), channels as (
    select channel,case when state='pending' and last_error is not null then 'retry_pending' else state end as state
    from notices
    union all
    select 'push',case when w.state='pending' and w.last_error is not null then 'retry_pending' else w.state end
    from private.web_push_deliveries w join notices n on n.id=w.notice_id
  ), counts as (
    select channel,state,count(*) as total from channels group by channel,state
  )
  select jsonb_build_object('capturedAt',statement_timestamp(),'unconfirmed',p_unconfirmed,
    'counts',coalesce(jsonb_agg(jsonb_build_object('channel',channel,'state',state,'total',total)
      order by channel,state),'[]'::jsonb))
  from counts;
$$;

create function public.capture_initial_pdf_notices(p_request uuid,p_unconfirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'issuance notice worker required' using errcode='42501';
  end if;
  perform 1 from private.initial_document_pdf_requests q where q.id=p_request and q.purpose='initial' for update;
  if not found then raise exception 'initial PDF request unavailable' using errcode='42501'; end if;
  update private.initial_document_pdf_requests q
    set notice_cut=private.initial_pdf_notice_cut(p_request,coalesce(p_unconfirmed,false))
    where q.id=p_request and q.notice_cut is null
      and not exists(select 1 from private.pdf_issuances r where r.initial_request_id=q.id);
end;
$$;

do $migration$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.initial_document_pdf(uuid,text,jsonb)'::regprocedure);
  anchor:='if r.id is null then';
  if strpos(definition,anchor)=0 then raise exception 'initial PDF notice reservation anchor missing'; end if;
  execute replace(definition,anchor,anchor||$replace$
      if q.purpose='initial' and q.notice_cut is null then
        perform public.capture_initial_pdf_notices(q.id,false);
      end if;$replace$);

  -- Preserve the exact canonical event body and its hash in pdf_issuances.
  -- The notice cut is an immutable companion source of the system request.
  definition:=pg_get_functiondef('public.pdf_issuance(uuid)'::regprocedure);
  anchor:='''snapshot'',r.snapshot,';
  if strpos(definition,anchor)=0 then raise exception 'initial PDF notice read anchor missing'; end if;
  execute replace(definition,anchor,$replace$'snapshot',r.snapshot||coalesce(
    (select jsonb_build_object('issuanceNoticeCut',q.notice_cut)
     from private.initial_document_pdf_requests q
     where q.id=r.initial_request_id and q.purpose='initial' and q.notice_cut is not null),'{}'::jsonb),$replace$);

  definition:=pg_get_functiondef('public.initial_document_pdf_status(uuid)'::regprocedure);
  anchor:='''lastError'',p.last_error)';
  if strpos(definition,anchor)=0 then raise exception 'initial PDF notice status anchor missing'; end if;
  execute replace(definition,anchor,$replace$'lastError',p.last_error,
    'noticesPrepared',q.notice_cut is not null,
    'noticesNeedAttention',coalesce((q.notice_cut->>'unconfirmed')::boolean,false)
      or exists(select 1 from jsonb_array_elements(q.notice_cut->'counts') as c
        where c->>'state' in ('failed','uncertain','retry_pending')))$replace$);
end;
$migration$;

revoke all on function private.initial_pdf_notice_ids(uuid),private.initial_pdf_notice_cut(uuid,boolean),
  public.claim_initial_pdf_notices(uuid,integer,uuid,boolean),public.capture_initial_pdf_notices(uuid,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.claim_initial_pdf_notices(uuid,integer,uuid,boolean),
  public.capture_initial_pdf_notices(uuid,boolean) to service_role;
notify pgrst,'reload schema';
