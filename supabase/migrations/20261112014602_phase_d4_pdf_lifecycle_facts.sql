-- V15 freezes cancellation, own cancellation awareness and formal complements
-- at the chosen documentary version. Earlier intentions keep their own bytes.
create function private.document_pdf_lifecycle(p_id uuid,p_version integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;chosen public.document_events;c public.document_events;
 r private.document_complements;own_event public.document_events;peer_event public.document_events;
 peer public.operational_documents;own_version integer;peer_version integer;peer_hash text;v_role text;
 acks jsonb:='[]';v_links jsonb:='[]';v_cancel jsonb;begin
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id;
 select * into strict chosen from public.document_events where document_id=p_id and version=p_version;
 if chosen.body->>'status'='cancelled' then
  select * into c from public.document_events e where e.document_id=p_id and e.version<=p_version
   and e.action in ('req.status','com.cancel','ent.cancel','ent.consent_cancel','bal.cancel')
   and e.body->>'status'='cancelled' order by e.version desc limit 1;
  if c.id is not null then
   select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'version',e.version,'actorId',e.actor_id,
    'actorName',nullif(e.actor_name,''),'recordedAt',e.created_at) order by e.version),'[]') into acks
   from public.document_events e where e.document_id=p_id and e.version<=p_version and e.version>c.version
    and e.action=lower(d.type)||'.cancellation_acknowledged' and e.body#>>'{event,cancellationEventId}'=c.id::text;
  end if;
 end if;
 v_cancel:=jsonb_build_object('state',case when chosen.body->>'status'<>'cancelled' then 'not_cancelled' when c.id is null then 'unavailable' else 'recorded' end,
  'act',case when c.id is null then null else jsonb_build_object('id',c.id,'version',c.version,'actorId',c.actor_id,
   'actorName',nullif(c.actor_name,''),'recordedAt',c.created_at,'reason',nullif(c.body#>>'{event,reason}','')) end,'acknowledgements',acks);
 for r in select * from private.document_complements where (source_id=p_id and source_version<p_version)
  or (child_id=p_id and child_version<p_version) order by recorded_at,id loop
  v_role:=case when r.source_id=p_id then 'supplement' else 'source' end;
  own_version:=case when r.source_id=p_id then r.source_version+1 else r.child_version+1 end;
  peer_version:=case when r.source_id=p_id then r.child_version else r.source_version end;
  peer_hash:=case when r.source_id=p_id then r.child_hash else r.source_hash end;
  select * into strict peer from public.operational_documents where id=case when r.source_id=p_id then r.child_id else r.source_id end;
  select * into own_event from public.document_events where document_id=p_id and version=own_version
   and action=lower(d.type)||case when v_role='supplement' then '.complement_added' else '.complement_linked' end;
  select * into peer_event from public.document_events where document_id=peer.id and version=peer_version;
  if own_event.id is null or own_event.body#>>'{event,relationId}' is distinct from r.id::text
   or own_event.body->>'previousHash' is distinct from (case when r.source_id=p_id then r.source_hash else r.child_hash end)
   or peer_event.id is null or peer_event.content_hash is distinct from peer_hash or nullif(peer_event.body->>'protocol','') is null then
   raise exception 'canonical complement reference unavailable' using errcode='23514';end if;
  if private.can(peer.care_recipient_id,lower(peer.type)||'.read') then
   v_links:=v_links||jsonb_build_array(jsonb_build_object('id',r.id,'role',v_role,'version',own_version,'eventId',own_event.id,'accessible',true,
    'actorId',r.actor_id,'actorName',r.actor_name,'recordedAt',r.recorded_at,'reason',r.reason,
    'document',jsonb_build_object('id',peer.id,'type',peer.type,'code',peer_event.body->>'code','protocol',peer_event.body->>'protocol','version',peer_version,'hash',peer_hash)));
  else
   v_links:=v_links||jsonb_build_array(jsonb_build_object('id',r.id,'role',v_role,'version',own_version,'eventId',own_event.id,'accessible',false));
  end if;
 end loop;
 return jsonb_build_object('schemaVersion',1,'documentId',p_id,'version',p_version,'cancellation',v_cancel,'complements',v_links);
end;$$;
revoke all on function private.document_pdf_lifecycle(uuid,integer) from public,anon,authenticated,service_role;

-- Existing source/fidelity contracts also apply to the new renderer.
do $$declare v_definition text;v_anchor text;begin
 v_definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 v_anchor:='if new.renderer_revision not in (6,7,8,9,10,11,12,13,14) then';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF source revision drift';end if;
 execute replace(v_definition,v_anchor,'if new.renderer_revision not in (6,7,8,9,10,11,12,13,14,15) then');
 v_definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 v_anchor:='if new.renderer_revision not in (7,8,9,10,11,12,13,14) then';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF fidelity revision drift';end if;
 execute replace(v_definition,v_anchor,'if new.renderer_revision not in (7,8,9,10,11,12,13,14,15) then');
 v_definition:=pg_get_functiondef('public.reserve_pdf_issuance_v14(uuid,uuid,integer)'::regprocedure);
 v_definition:=replace(v_definition,'public.reserve_pdf_issuance_v14(','public.reserve_pdf_issuance_v15(');
 v_anchor:='case when e.body->>''type''=''BAL'' then 12 when e.body->>''type''=''COM'' then 13 when e.body->>''type''=''ENT'' then 14 else 10 end';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF lifecycle selection drift';end if;
 execute replace(v_definition,v_anchor,'15');
 v_definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
 if length(v_definition)-length(replace(v_definition,'end;',''))<>length('end;') then raise exception 'PDF access contract drift';end if;
 execute replace(v_definition,'end;',$guard$ if exists(select 1 from jsonb_array_elements(coalesce(r.snapshot#>'{lifecycleFacts,complements}','[]'::jsonb)) l
  where l->'accessible'='true'::jsonb and not exists(select 1 from public.operational_documents d
   where d.id=(l#>>'{document,id}')::uuid and private.can(d.care_recipient_id,lower(d.type)||'.read'))) then
  raise exception 'referenced document read required' using errcode='42501';
 end if;
end;$guard$);
end;$$;

create function private.freeze_pdf_lifecycle_facts() returns trigger
language plpgsql security definer set search_path='' as $$
declare e public.document_events;begin
 if new.renderer_revision<>15 then return new;end if;
 select * into strict e from public.document_events where document_id=new.document_id and version=new.version;
 if new.source_hash is distinct from e.content_hash or new.snapshot-'sourceFacts'-'documentFacts' is distinct from e.body then
  raise exception 'canonical lifecycle PDF source required' using errcode='23514';end if;
 if e.body->>'type'='BAL' then
  new.snapshot:=new.snapshot||jsonb_build_object('balanceApplication',private.bal_application_facts(new.document_id,
   nullif(e.body#>>'{workflow,countVersion}','')::integer,new.version,nullif(e.body#>>'{workflow,appliedAt}','') is not null),
   'balanceReviewCorrections',private.bal_correction_facts(new.document_id,new.version));
 elsif e.body->>'type'='COM' then
  new.snapshot:=new.snapshot||jsonb_build_object('purchaseEntryBalances',private.purchase_entry_balance_facts(new.document_id,new.version));
 end if;
 new.snapshot:=new.snapshot||jsonb_build_object('lifecycleFacts',private.document_pdf_lifecycle(new.document_id,new.version));
 return new;
end;$$;
revoke all on function private.freeze_pdf_lifecycle_facts() from public,anon,authenticated,service_role;
create trigger zzzzzz_freeze_pdf_lifecycle_facts before insert on private.pdf_issuances
 for each row execute function private.freeze_pdf_lifecycle_facts();
revoke all on function public.reserve_pdf_issuance_v15(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v15(uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
