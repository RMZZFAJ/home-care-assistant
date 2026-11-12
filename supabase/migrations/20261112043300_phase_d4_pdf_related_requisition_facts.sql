-- Resolve reverse REQ references only from explicit, already-issued canonical
-- child events at or before the selected version. Preserve historical cuts,
-- current authorization and the source/bytes of existing reservations.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('private.document_pdf_presentation(uuid,integer,jsonb)'::regprocedure);
 anchor:='  ) explicit_references order by kind,id loop';
 if position(anchor in definition)=0 then raise exception 'PDF reference contract drift';end if;
 execute replace(definition,anchor,$refs$
   union all select child.document_id,'related_document'
    from public.document_events child
    cross join lateral jsonb_array_elements(coalesce(child.body->'requestLinks','[]'::jsonb)) k
    join public.requisition_items i on i.id=(k->>'requisition_item_id')::uuid
    where chosen.body->>'type'='REQ' and i.requisition_id=p_id
     and child.care_recipient_id=chosen.care_recipient_id
     and child.created_at<=chosen.created_at
     and child.body->>'type' in ('COM','ENT')
     and nullif(child.body->>'protocol','') is not null
  ) explicit_references order by kind,id loop$refs$);
end;$$;
notify pgrst,'reload schema';
