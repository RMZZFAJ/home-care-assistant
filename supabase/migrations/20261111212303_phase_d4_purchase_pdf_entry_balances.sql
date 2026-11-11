-- COM V13 adds frozen family stock provenance; all older intentions stay intact.
do $$declare v_definition text;v_anchor text;begin
 v_definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 v_anchor:='if new.renderer_revision not in (6,7,8,9,10,11,12) then';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF source contract drift';end if;
 execute replace(v_definition,v_anchor,'if new.renderer_revision not in (6,7,8,9,10,11,12,13) then');
 v_definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 v_anchor:='if new.renderer_revision not in (7,8,9,10,11,12) then';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF fidelity contract drift';end if;
 execute replace(v_definition,v_anchor,'if new.renderer_revision not in (7,8,9,10,11,12,13) then');
 v_definition:=pg_get_functiondef('public.reserve_pdf_issuance_v12(uuid,uuid,integer)'::regprocedure);
 v_definition:=replace(v_definition,'public.reserve_pdf_issuance_v12(','public.reserve_pdf_issuance_v13(');
 v_anchor:='case when e.body->>''type''=''BAL'' then 12 else 10 end';
 if position(v_anchor in v_definition)=0 then raise exception 'PDF purchase selection contract drift';end if;
 execute replace(v_definition,v_anchor,'case when e.body->>''type''=''BAL'' then 12 when e.body->>''type''=''COM'' then 13 else 10 end');
 v_definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
 v_anchor:='end;';
 if length(v_definition)-length(replace(v_definition,v_anchor,''))<>length(v_anchor) then raise exception 'PDF read guard contract drift';end if;
 execute replace(v_definition,v_anchor,$new$ if exists(select 1 from jsonb_array_elements(coalesce(r.snapshot->'purchaseEntryBalances','[]'::jsonb)) entry where entry->>'state'='known') then
  perform private.require_cap(r.care_recipient_id,'stock.family.read');
 end if;
end;$new$);
end;$$;
revoke all on function public.reserve_pdf_issuance_v13(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v13(uuid,uuid,integer) to authenticated;

create function private.freeze_pdf_purchase_entry_balances() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_event public.document_events;begin
 if new.renderer_revision<>13 then return new;end if;
 select * into strict v_event from public.document_events where document_id=new.document_id and version=new.version;
 if v_event.body->>'type' is distinct from 'COM' or new.source_hash is distinct from v_event.content_hash
  or new.snapshot-'sourceFacts'-'documentFacts' is distinct from v_event.body then
  raise exception 'canonical COM entry balance source required' using errcode='23514';end if;
 new.snapshot:=new.snapshot||jsonb_build_object('purchaseEntryBalances',private.purchase_entry_balance_facts(new.document_id,new.version));
 return new;
end;$$;
revoke all on function private.freeze_pdf_purchase_entry_balances() from public,anon,authenticated,service_role;
create trigger zzzzz_freeze_pdf_purchase_entry_balances before insert on private.pdf_issuances
 for each row execute function private.freeze_pdf_purchase_entry_balances();
notify pgrst,'reload schema';
