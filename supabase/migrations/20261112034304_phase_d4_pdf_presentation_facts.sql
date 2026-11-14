-- Persistent reporting facts required by the approved operational composition:
-- exact cut, original author role and authorized explicit references. No reissue
-- or rewriting of historical events, actors, reservations or ready bytes.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure);
 anchor:=' s:=jsonb_build_object(''schemaVersion'',2';
 if position(anchor in definition)=0 then raise exception 'Document actor capture drift';end if;
 execute replace(definition,anchor,$actor$
 if nullif(d.canonical_snapshot->>'protocol','') is null and d.protocol is not null
  and jsonb_typeof(actors->'issuer')='object' then
  actors:=jsonb_set(actors,'{issuer,careRole}',coalesce((select to_jsonb(m.role::text)
   from public.care_recipient_memberships m where m.care_recipient_id=d.care_recipient_id
    and m.user_id=d.created_by and m.status='active'),'null'::jsonb),true);
 end if;
 s:=jsonb_build_object('schemaVersion',2$actor$);
end;$$;

create function private.document_pdf_presentation(p_id uuid,p_version integer,p_snapshot jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare chosen public.document_events;original public.document_events;peer public.operational_documents;
 target record;issuer jsonb;author jsonb:='{"state":"unavailable"}';refs jsonb:='[]';begin
 perform public.operational_document(p_id);
 select * into strict chosen from public.document_events where document_id=p_id and version=p_version;
 select * into original from public.document_events where document_id=p_id and version<=p_version
  and nullif(body->>'protocol','') is not null order by version limit 1;
 issuer:=original.body#>'{actors,issuer}';
 if not coalesce((p_snapshot#>>'{sourceFacts,historical}')::boolean,false)
  and issuer->>'id'=p_snapshot#>>'{sourceFacts,issuerId}'
  and issuer->>'name'=p_snapshot#>>'{sourceFacts,issuerName}'
  and (nullif(issuer->>'careRole','') is not null or nullif(issuer->>'category','') is not null) then
  author:=jsonb_build_object('state','known','actorId',issuer->'id','name',issuer->'name',
   'careRole',issuer->'careRole','category',issuer->'category','registration',issuer->'registration','registrationState',issuer->'state');
 end if;
 for target in
  select distinct id,kind from (
   select i.requisition_id id,'requisition'::text kind
    from jsonb_array_elements(coalesce(chosen.body->'requestLinks','[]'::jsonb)) k
    join public.requisition_items i on i.id=(k->>'requisition_item_id')::uuid
   union all select (chosen.body#>>'{payload,sourceRequisition,requisitionId}')::uuid,'source_requisition'
    where nullif(chosen.body#>>'{payload,sourceRequisition,requisitionId}','') is not null
   union all select (p_snapshot#>>'{transfer,originDocumentId}')::uuid,'transfer_origin'
    where nullif(p_snapshot#>>'{transfer,originDocumentId}','') is not null
   union all select (e.body#>>'{event,newRequisitionId}')::uuid,'remaining_need'
    from public.document_events e where e.document_id=p_id and e.version<=p_version
     and e.action='req.remaining_need_declared' and nullif(e.body#>>'{event,newRequisitionId}','') is not null
  ) explicit_references order by kind,id loop
  select * into strict peer from public.operational_documents where id=target.id;
  if peer.care_recipient_id<>chosen.care_recipient_id or peer.id=p_id then
   raise exception 'Invalid operational reference scope' using errcode='23514';end if;
  if private.can(peer.care_recipient_id,lower(peer.type)||'.read') then
   if peer.protocol is null or peer.code is null then raise exception 'Issued operational reference required' using errcode='23514';end if;
   refs:=refs||jsonb_build_array(jsonb_build_object('kind',target.kind,'accessible',true,'id',peer.id,'type',peer.type,'code',peer.code));
  else refs:=refs||jsonb_build_array(jsonb_build_object('kind',target.kind,'accessible',false));end if;
 end loop;
 return jsonb_build_object('schemaVersion',1,'documentId',p_id,'version',p_version,'asOf',chosen.created_at,'author',author,'references',refs);
end;$$;
revoke all on function private.document_pdf_presentation(uuid,integer,jsonb) from public,anon,authenticated,service_role;

create function private.freeze_pdf_presentation_facts() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if new.renderer_revision=16 then
  if new.snapshot#>>'{lifecycleFacts,documentId}' is distinct from new.document_id::text
   or (new.snapshot#>>'{lifecycleFacts,version}')::integer is distinct from new.version then
   raise exception 'Canonical lifecycle freeze required before presentation' using errcode='23514';end if;
  new.snapshot:=new.snapshot||jsonb_build_object('presentationFacts',private.document_pdf_presentation(new.document_id,new.version,new.snapshot));
 end if;return new;
end;$$;
revoke all on function private.freeze_pdf_presentation_facts() from public,anon,authenticated,service_role;
create trigger zzzzzzz_freeze_pdf_presentation_facts before insert on private.pdf_issuances
 for each row execute function private.freeze_pdf_presentation_facts();

do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
 anchor:='end;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'PDF access contract drift';end if;
 execute replace(definition,anchor,$access$
 if exists(select 1 from jsonb_array_elements(coalesce(r.snapshot#>'{presentationFacts,references}','[]'::jsonb)) ref
  where ref->'accessible'='true'::jsonb and not exists(select 1 from public.operational_documents d
   where d.id=(ref->>'id')::uuid and private.can(d.care_recipient_id,lower(d.type)||'.read'))) then
  raise exception 'Operational reference read required' using errcode='42501';
 end if;
end;$access$);
end;$$;
notify pgrst,'reload schema';
