-- Recover an immutable own intent through live custody read. New commands still
-- pass their original write checks before any mutation and after relevant waits.
do $migration$
declare definition text;anchor text;begin
 definition:=replace(pg_get_functiondef('public.report_extraordinary_consumption(uuid,text,text,text,jsonb,uuid)'::regprocedure),E'\r\n',E'\n');
 anchor:=E' perform private.require_consumption_report(p_patient,p_location);\n if p_kind';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'report initial recovery anchor mismatch';end if;
 definition:=replace(definition,anchor,E' perform private.require_consumption_read(p_patient,p_location);\n if p_kind');
 anchor:=E' perform private.require_consumption_report(p_patient,p_location);\n select * into r from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'report locked recovery anchor mismatch';end if;
 definition:=replace(definition,anchor,E' perform private.require_consumption_read(p_patient,p_location);\n select * into r from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;');
 anchor:=' canonical:=private.consumption_lines(p_patient,p_location,input);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'report new write anchor mismatch';end if;
 execute replace(definition,anchor,E' perform private.require_consumption_report(p_patient,p_location);\n'||anchor);

 definition:=replace(pg_get_functiondef('public.supplement_consumption_report(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 anchor:=E' perform private.require_consumption_report(r.care_recipient_id,r.location);\n if p_text';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'supplement initial recovery anchor mismatch';end if;
 definition:=replace(definition,anchor,E' perform private.require_consumption_read(r.care_recipient_id,r.location);\n if p_text');
 anchor:=' select * into strict r from public.consumption_reports where id=p_id for update;perform private.require_consumption_report(r.care_recipient_id,r.location);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'supplement locked recovery anchor mismatch';end if;
 definition:=replace(definition,anchor,' select * into strict r from public.consumption_reports where id=p_id for update;perform private.require_consumption_read(r.care_recipient_id,r.location);');
 anchor:=' if r.status<>''reported'' then';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'supplement new write anchor mismatch';end if;
 execute replace(definition,anchor,E' perform private.require_consumption_report(r.care_recipient_id,r.location);\n'||anchor);

 definition:=replace(pg_get_functiondef('public.decide_consumption_report(uuid,boolean,text,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 anchor:=' perform private.require_cap(r.care_recipient_id,cap);perform private.require_consumption_read(r.care_recipient_id,r.location);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'decision initial recovery anchor mismatch';end if;
 definition:=replace(definition,anchor,' perform private.require_consumption_read(r.care_recipient_id,r.location);');
 anchor:=' select * into strict r from public.consumption_reports where id=p_id for update;perform private.require_cap(r.care_recipient_id,cap);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'decision locked recovery anchor mismatch';end if;
 definition:=replace(definition,anchor,' select * into strict r from public.consumption_reports where id=p_id for update;perform private.require_consumption_read(r.care_recipient_id,r.location);');
 anchor:=' if r.status<>''reported'' then';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'decision new write anchor mismatch';end if;
 execute replace(definition,anchor,E' perform private.require_cap(r.care_recipient_id,cap);\n'||anchor);

 definition:=replace(pg_get_functiondef('public.confirm_extraordinary_consumption(uuid,boolean)'::regprocedure),E'\r\n',E'\n');
 anchor:=' perform private.require_cap(r.care_recipient_id,case r.location when ''FAMILY'' then ''stock.family.manage'' else ''consumption.confirm'' end);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'legacy consumption recovery anchor mismatch';end if;
 execute replace(definition,anchor,' perform private.require_consumption_read(r.care_recipient_id,r.location);');
end;$migration$;
notify pgrst,'reload schema';
