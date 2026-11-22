-- New consumer revision only for ENT snapshots containing administrative cases.
-- Old entrypoints, pending intentions, snapshots and signed bytes remain valid.
do $migration$
declare src text;old text;
begin
 src:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 old:='if new.renderer_revision not in (6,7) then';
 if length(src)-length(replace(src,old,''))<>length(old) then raise exception 'PDF source revision contract drift';end if;
 execute replace(src,old,'if new.renderer_revision not in (6,7,8) then');
 src:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 old:='if new.renderer_revision<>7 then';
 if length(src)-length(replace(src,old,''))<>length(old) then raise exception 'PDF fidelity revision contract drift';end if;
 execute replace(src,old,'if new.renderer_revision not in (7,8) then');
 src:=pg_get_functiondef('public.reserve_pdf_issuance_v7(uuid,uuid,integer)'::regprocedure);
 old:='public.reserve_pdf_issuance_v7(';
 if length(src)-length(replace(src,old,''))<>length(old) then raise exception 'PDF reservation entrypoint drift';end if;
 src:=replace(src,old,'public.reserve_pdf_issuance_v8(');
 old:=$old$upper(encode(extensions.gen_random_bytes(16),'hex')),7,case when$old$;
 if length(src)-length(replace(src,old,''))<>length(old) then raise exception 'PDF reservation revision drift';end if;
 src:=replace(src,old,$new$upper(encode(extensions.gen_random_bytes(16),'hex')),
  case when e.body->>'type'='ENT' and jsonb_array_length(coalesce(e.body#>'{deliveryRegularization,cases}','[]'))>0 then 8 else 7 end,case when$new$);
 execute src;
end;
$migration$;
revoke all on function public.reserve_pdf_issuance_v8(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v8(uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
