begin;
-- Omission preserves the current value. JSON null is the explicit removal
-- intent. Existing requests/history are not rewritten; every old Auth/CAS
-- boundary and function grant is retained.
do $$declare body text;needle text;replacement text;begin
 body:=pg_get_functiondef('public.v4_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
 needle:='p_change ? ''patientShortName'' and length(trim(p_change->>''patientShortName'')) not between 1 and 60';
 replacement:='p_change ? ''patientShortName'' and p_change->''patientShortName''<>''null''::jsonb and (jsonb_typeof(p_change->''patientShortName'') is distinct from ''string'' or length(trim(p_change->>''patientShortName'')) not between 1 and 60)';
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'short name range baseline mismatch';end if;
 execute replace(body,needle,replacement);

 body:=pg_get_functiondef('public.v4_review_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
 needle:='if item.key in (''balReview'',''balRequirement'',''scienceRequirement'',''patientShortName'') and (jsonb_typeof(item.value) is distinct from ''string'' or length(trim(item.value#>>''{}''))=0) then raise exception ''invalid patient settings'';end if;';
 replacement:='if item.key in (''balReview'',''balRequirement'',''scienceRequirement'') and (jsonb_typeof(item.value) is distinct from ''string'' or length(trim(item.value#>>''{}''))=0) then raise exception ''invalid patient settings'';end if;
 if item.key=''patientShortName'' and item.value<>''null''::jsonb and (jsonb_typeof(item.value) is distinct from ''string'' or length(trim(item.value#>>''{}'')) not between 1 and 60) then raise exception ''invalid patient short name'' using errcode=''22023'';end if;';
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'short name type baseline mismatch';end if;
 execute replace(body,needle,replacement);

 body:=pg_get_functiondef('public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
 needle:='if p_key is null or p_version is null or p_version<1 then';
 replacement:='if p_request_id is null and p_kind=''settings'' and p_change ? ''patientShortName'' and p_change->''patientShortName''<>''null''::jsonb then
 if jsonb_typeof(p_change->''patientShortName'') is distinct from ''string'' or length(trim(p_change->>''patientShortName'')) not between 1 and 60 or (p_change->>''patientShortName'')<>trim(p_change->>''patientShortName'') then raise exception ''invalid patient short name'' using errcode=''22023'';end if;
 end if;
 if p_key is null or p_version is null or p_version<1 then';
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'short name current authority baseline mismatch';end if;
 execute replace(body,needle,replacement);
end;$$;
notify pgrst,'reload schema';
commit;
