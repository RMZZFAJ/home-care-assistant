-- New logical structure is a new renderer; frozen earlier intentions remain unchanged.
do $migration$
declare src text; old text;
begin
  src := pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
  old := 'if new.renderer_revision not in (6,7,8,9) then';
  if length(src)-length(replace(src,old,'')) <> length(old) then raise exception 'PDF source revision drift'; end if;
  execute replace(src,old,'if new.renderer_revision not in (6,7,8,9,10) then');

  src := pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
  old := 'if new.renderer_revision not in (7,8,9) then';
  if length(src)-length(replace(src,old,'')) <> length(old) then raise exception 'PDF fidelity revision drift'; end if;
  execute replace(src,old,'if new.renderer_revision not in (7,8,9,10) then');

  src := pg_get_functiondef('public.reserve_pdf_issuance_v9(uuid,uuid,integer)'::regprocedure);
  old := 'public.reserve_pdf_issuance_v9(';
  if length(src)-length(replace(src,old,'')) <> length(old) then raise exception 'PDF entrypoint drift'; end if;
  src := replace(src,old,'public.reserve_pdf_issuance_v10(');
  old := $old$case when e.body->>'type'='ENT' then 9 else 7 end$old$;
  if length(src)-length(replace(src,old,'')) <> length(old) then raise exception 'PDF selection drift'; end if;
  execute replace(src,old,'10');
end;
$migration$;
revoke all on function public.reserve_pdf_issuance_v10(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v10(uuid,uuid,integer) to authenticated;
notify pgrst, 'reload schema';
