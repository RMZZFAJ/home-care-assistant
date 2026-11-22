-- Exact own-attempt lookup waits for the same locks as linking. An absent row
-- after that barrier is a known result; a network failure remains uncertain.
create function public.document_complement_attempt(p_source uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r private.document_complements;begin
 perform public.operational_document(p_source);
 select * into strict d from public.operational_documents where id=p_source;
 if p_key is null then raise exception 'attempt identity required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 perform pg_advisory_xact_lock(hashtextextended('document-complement:'||auth.uid()||':'||p_key,0));
 perform public.operational_document(p_source);
 select * into r from private.document_complements where actor_id=auth.uid() and idempotency_key=p_key;
 if not found then return jsonb_build_object('sourceId',p_source,'key',p_key,'state','not_found','result',null);end if;
 if r.source_id<>p_source then raise exception 'attempt source mismatch' using errcode='23505';end if;
 perform public.operational_document(r.child_id);
 return jsonb_build_object('sourceId',p_source,'key',p_key,'state','confirmed',
  'result',jsonb_build_object('link',private.document_complement_view(r,p_source),'key',p_key,'recovered',true));
end;$$;
revoke all on function public.document_complement_attempt(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_complement_attempt(uuid,uuid) to authenticated;

-- Add the eight native linkage facts to the existing automatic chronology.
do $$declare v_definition text;v_anchor text:='''req.issued'',''req.legacy_imported''';begin
 v_definition:=pg_get_functiondef('public.document_progress(uuid,text,integer,integer)'::regprocedure);
 if position(v_anchor in v_definition)=0 then raise exception 'document chronology contract drift';end if;
 execute replace(v_definition,v_anchor,'''req.complement_added'',''req.complement_linked'',''com.complement_added'',''com.complement_linked'',
  ''ent.complement_added'',''ent.complement_linked'',''bal.complement_added'',''bal.complement_linked'','||v_anchor);
end;$$;
notify pgrst,'reload schema';
