-- New family publications are private. Existing records and retry hashes stay
-- immutable; historical public publications still recover by their own receipt.
create function private.progress_family_writer(p_patient uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.care_recipient_memberships m
  where m.care_recipient_id=p_patient and m.user_id=auth.uid()
   and m.status='active' and m.role::text='family');
$$;
revoke all on function private.progress_family_writer(uuid) from public,anon,authenticated,service_role;

do $family$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('private.require_progress_audience(uuid,jsonb)'::regprocedure);
 anchor:='private_note:=coalesce(opts->>''visibility'',''public'')=''family'';';
 if position(anchor in definition)=0 then raise exception 'family progress audience contract drift';end if;
 execute replace(definition,anchor,$guard$
 if private.progress_family_writer(d.care_recipient_id) and opts->>'visibility'='public' then
  raise exception 'family progress must be private' using errcode='42501';end if;
 private_note:=private.progress_family_writer(d.care_recipient_id) or coalesce(opts->>'visibility','public')='family';
 $guard$);

 definition:=pg_get_functiondef('public.document_progress_publish(uuid,uuid,jsonb)'::regprocedure);
 anchor:='perform private.require_cap(d.care_recipient_id,''document.progress.create''); perform private.require_progress_audience(p_document,v_original);';
 if position(anchor in definition)=0 then raise exception 'family progress publication contract drift';end if;
 -- Normalize only new defaulted publications, after confirmed-receipt recovery.
 -- The original submitted body continues to determine the idempotency hash.
 execute replace(definition,anchor,$normalize$
 if private.progress_family_writer(d.care_recipient_id) and (v_options is null or not(v_options ? 'visibility')) then
  v_options:=coalesce(v_options,jsonb_build_object('relevance','normal','mentions','[]'::jsonb))||jsonb_build_object('visibility','family');
 end if;
 $normalize$||anchor);
end;$family$;

-- The existing shared reader continues to require live document access and
-- additionally admits individually mentioned active members to private notes.
-- No historical note, PDF, snapshot, event, ledger, grant or RLS policy changes.

-- Recheck the normalized audience after any author/profile FK wait, without
-- changing the original intention hash or the confirmed-receipt branch.
do $final_guard$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.document_progress_publish(uuid,uuid,jsonb)'::regprocedure);
 anchor:='perform private.require_progress_audience(p_document,v_original); perform private.require_cap(d.care_recipient_id,''document.progress.create'');return';
 if position(anchor in definition)=0 then raise exception 'family progress final authority contract drift';end if;
 execute replace(definition,anchor,'perform private.require_progress_audience(p_document,case when v_options is null then v_original else v_original||jsonb_build_object(''publication'',v_options) end); perform private.require_cap(d.care_recipient_id,''document.progress.create'');return');
end;$final_guard$;
