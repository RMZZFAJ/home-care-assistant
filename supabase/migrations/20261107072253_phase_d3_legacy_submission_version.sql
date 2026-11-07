-- A replayed revision reads the latest document. Submitting must retain the
-- original revision version, while the second key may recover its own prior
-- committed submission before CAS. Never submit an intervening editor revision.
create or replace function public.revise_and_submit_supply_document(p_id uuid,p_payload jsonb,p_key uuid,p_version integer,p_recount boolean,p_submit boolean,p_submission_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;previous private.phase_d3_commands;h text;begin
 if p_key is null or p_submission_key is null or p_submit is null or p_recount is null then raise exception 'invalid supply revision intention' using errcode='22023';end if;
 perform public.operational_document(p_id);
 h:=encode(extensions.digest(jsonb_build_array('atomic-supply-revision',p_id,p_payload,p_version,p_recount,p_submit,p_submission_key)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('atomic-supply-revision:'||auth.uid()||':'||p_key,0));
 perform public.operational_document(p_id);
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if previous.intent_hash is distinct from h then raise exception 'supply revision idempotency conflict' using errcode='23505';end if;return previous.result;end if;
 result:=public.revise_supply_document(p_id,p_payload,p_key,p_version,p_recount);
 if p_submit and not p_recount then result:=public.supply_document_command(p_id,'submit','{}'::jsonb,p_submission_key,p_version+1);end if;
 perform public.operational_document(p_id);
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 return result;
end;$$;
