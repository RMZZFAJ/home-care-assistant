-- New BAL emissions freeze the application visible at their selected event.
-- No old intention, canonical event/hash or stored PDF is rewritten.
do $$declare definition text;needle text;begin
 definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 needle:='if new.renderer_revision not in (6,7,8,9,10) then';
 if position(needle in definition)=0 then raise exception 'PDF source revision drift';end if;
 execute replace(definition,needle,'if new.renderer_revision not in (6,7,8,9,10,11) then');
 definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 needle:='if new.renderer_revision not in (7,8,9,10) then';
 if position(needle in definition)=0 then raise exception 'PDF fidelity revision drift';end if;
 execute replace(definition,needle,'if new.renderer_revision not in (7,8,9,10,11) then');
 definition:=pg_get_functiondef('public.reserve_pdf_issuance_v10(uuid,uuid,integer)'::regprocedure);
 definition:=replace(definition,'public.reserve_pdf_issuance_v10(','public.reserve_pdf_issuance_v11(');
 needle:='10,case when e.version';
 if position(needle in definition)=0 then raise exception 'PDF BAL selection drift';end if;
 execute replace(definition,needle,'case when e.body->>''type''=''BAL'' then 11 else 10 end,case when e.version');
end;$$;
revoke all on function public.reserve_pdf_issuance_v11(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v11(uuid,uuid,integer) to authenticated;

create function private.freeze_pdf_balance_application() returns trigger
language plpgsql security definer set search_path='' as $$
declare e public.document_events;count_version integer;begin
 if new.renderer_revision<>11 then return new;end if;
 select * into strict e from public.document_events where document_id=new.document_id and version=new.version;
 if e.body->>'type' is distinct from 'BAL' or new.source_hash is distinct from e.content_hash
  or new.snapshot-'sourceFacts'-'documentFacts' is distinct from e.body then
  raise exception 'canonical BAL PDF source required' using errcode='23514';end if;
 count_version:=nullif(e.body#>>'{workflow,countVersion}','')::integer;
 new.snapshot:=new.snapshot||jsonb_build_object('balanceApplication',private.bal_application_facts(
  new.document_id,count_version,new.version,nullif(e.body#>>'{workflow,appliedAt}','') is not null));
 return new;
end;$$;
revoke all on function private.freeze_pdf_balance_application() from public,anon,authenticated,service_role;
create trigger zzz_freeze_pdf_balance_application before insert on private.pdf_issuances
 for each row execute function private.freeze_pdf_balance_application();

-- A frozen file containing a stock value cannot be returned after that read
-- authority is lost. Its bytes remain immutable; a new masked emission is allowed.
create function private.require_pdf_issuance_access(r private.pdf_issuances) returns void
language plpgsql volatile security definer set search_path='' as $$begin
 if exists(select 1 from jsonb_array_elements(coalesce(r.snapshot#>'{balanceApplication,lines}','[]'::jsonb)) l
  where l->>'state'='known') then
  perform private.require_cap(r.care_recipient_id,'stock.team.read');
 end if;
end;$$;
revoke all on function private.require_pdf_issuance_access(private.pdf_issuances) from public,anon,authenticated,service_role;

do $$declare definition text;needle text;proc record;begin
 -- Every older entry point can replay a newer intention, so none may bypass
 -- the additional read gate when returning its frozen source.
 for proc in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname ~ '^reserve_pdf_issuance(_v[0-9]+)?$' loop
  definition:=pg_get_functiondef(proc.oid);
  needle:='return private.pdf_issuance_receipt(r)||jsonb_build_object(''snapshot''';
  if position(needle in definition)=0 then raise exception 'PDF reservation access contract drift';end if;
  execute replace(definition,needle,'perform private.require_pdf_issuance_access(r);'||needle);
 end loop;
 for proc in select unnest(array['public.pdf_issuance(uuid)'::regprocedure,
  'private.require_pdf_lease(uuid,text)'::regprocedure,
  'public.pdf_issuance_stage(uuid,text,text,text)'::regprocedure,
  'public.complete_pdf_issuance(uuid,text,text,integer,jsonb,text,text)'::regprocedure])::oid as oid loop
  definition:=pg_get_functiondef(proc.oid);
  needle:='perform private.require_pdf_document(r.document_id);';
  if position(needle in definition)=0 then raise exception 'PDF source access contract drift';end if;
  execute replace(definition,needle,needle||'perform private.require_pdf_issuance_access(r);');
 end loop;
end;$$;
notify pgrst, 'reload schema';
