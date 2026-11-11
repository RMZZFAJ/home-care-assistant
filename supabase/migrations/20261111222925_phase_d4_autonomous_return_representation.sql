-- New ENT representations name the actual frozen direction. Older intentions
-- retain their renderer and bytes; no movement or historical record is changed.
do $$declare v_definition text;v_anchor text;begin
 v_definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 v_anchor:='if new.renderer_revision not in (6,7,8,9,10,11,12,13) then';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF source revision contract drift';end if;
 execute replace(v_definition,v_anchor,'if new.renderer_revision not in (6,7,8,9,10,11,12,13,14) then');
 v_definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 v_anchor:='if new.renderer_revision not in (7,8,9,10,11,12,13) then';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF fidelity revision contract drift';end if;
 execute replace(v_definition,v_anchor,'if new.renderer_revision not in (7,8,9,10,11,12,13,14) then');
 v_definition:=pg_get_functiondef('public.reserve_pdf_issuance_v13(uuid,uuid,integer)'::regprocedure);
 v_definition:=replace(v_definition,'public.reserve_pdf_issuance_v13(','public.reserve_pdf_issuance_v14(');
 v_anchor:='case when e.body->>''type''=''BAL'' then 12 when e.body->>''type''=''COM'' then 13 else 10 end';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF return revision selection drift';end if;
 execute replace(v_definition,v_anchor,'case when e.body->>''type''=''BAL'' then 12 when e.body->>''type''=''COM'' then 13 when e.body->>''type''=''ENT'' then 14 else 10 end');
end;$$;
revoke all on function public.reserve_pdf_issuance_v14(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v14(uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
