-- A new format identity preserves in-flight V15 recovery while the operational
-- composition and its minimal distributed identity change. This is not a data
-- migration for typography. Existing reservations, source facts and bytes stay put.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 anchor:='if new.renderer_revision not in (6,7,8,9,10,11,12,13,14,15) then';
 if position(anchor in definition)=0 then raise exception 'PDF source format drift';end if;
 execute replace(definition,anchor,'if new.renderer_revision not in (6,7,8,9,10,11,12,13,14,15,16) then');
 definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 anchor:='if new.renderer_revision not in (7,8,9,10,11,12,13,14,15) then';
 if position(anchor in definition)=0 then raise exception 'PDF fidelity format drift';end if;
 execute replace(definition,anchor,'if new.renderer_revision not in (7,8,9,10,11,12,13,14,15,16) then');
 definition:=pg_get_functiondef('private.freeze_pdf_lifecycle_facts()'::regprocedure);
 anchor:='if new.renderer_revision<>15 then';
 if position(anchor in definition)=0 then raise exception 'PDF lifecycle format drift';end if;
 execute replace(definition,anchor,'if new.renderer_revision not in (15,16) then');
 definition:=pg_get_functiondef('public.reserve_pdf_issuance_v15(uuid,uuid,integer)'::regprocedure);
 definition:=replace(definition,'public.reserve_pdf_issuance_v15(','public.reserve_pdf_issuance_v16(');
 anchor:='15,case when e.version<>d.version';
 if position(anchor in definition)=0 then raise exception 'PDF reservation format drift';end if;
 execute replace(definition,anchor,'16,case when e.version<>d.version');
end;$$;
revoke all on function public.reserve_pdf_issuance_v16(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v16(uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
