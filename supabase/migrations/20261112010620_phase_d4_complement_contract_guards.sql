-- Cover both columns of the source foreign key; source chronology has its own order.
create index document_complements_source_fk on private.document_complements(source_id,care_recipient_id);
alter table private.document_complements add constraint document_complements_reason_meaningful check(reason !~ '^[[:space:]]*$');
do $$declare v_definition text;v_anchor text:='if p_key is null or p_reason is null';begin
 v_definition:=pg_get_functiondef('public.link_document_complement(uuid,uuid,integer,integer,text,uuid)'::regprocedure);
 if position(v_anchor in v_definition)=0 then raise exception 'complement validation contract drift';end if;
 execute replace(v_definition,v_anchor,'p_reason:=regexp_replace(p_reason,''^[[:space:]]+|[[:space:]]+$'','''',''g'');
 if p_key is null or p_reason is null');
end;$$;
notify pgrst,'reload schema';
