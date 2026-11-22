-- A pinned type version cannot become current again through authorized commands.
do $$declare body text;marker text;replacement text;begin
 body:=replace(pg_get_functiondef('public.schedule_preparation_recovery(uuid,text,uuid,integer,jsonb,uuid)'::regprocedure),E'\r\n',E'\n');
 marker:='h text;header jsonb;reason text;begin';
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule recovery declaration marker missing';end if;
 body:=replace(body,marker,'h text;header jsonb;reason text;source jsonb;current_type_version integer;begin');
 marker:=$marker$ elsif d.revision>p_expected then reason:='advanced_revision';
 end if;$marker$;
 marker:=replace(marker,E'\r\n',E'\n');
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule recovery source marker missing';end if;
 replacement:=$replacement$ elsif d.revision>p_expected then reason:='advanced_revision';
 elsif p_purpose='schedule_series_create' and d.state='active' and d.revision=p_expected then
  select version into current_type_version from public.shift_types where id=nullif(d.content->'schedule'->>'shiftTypeId','')::uuid and care_recipient_id=p_patient;
  if current_type_version>(d.content->'schedule'->>'shiftTypeVersion')::integer then
   reason:='source_advanced';source:=jsonb_build_object('savedTypeVersion',d.content->'schedule'->'shiftTypeVersion','currentTypeVersion',current_type_version);
  end if;
 end if;$replacement$;
 body:=replace(body,marker,replacement);
 marker:='''reason'',reason,''receipt'',d.consumed_result';
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule recovery proof marker missing';end if;
 execute replace(body,marker,'''reason'',reason,''source'',source,''receipt'',d.consumed_result');
end;$$;
