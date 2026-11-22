-- A pre-atomic client may already have committed the revision in an earlier
-- transaction. A failed atomic retry cannot roll that historical commit back.
-- This probe only proves the caller's matching event; absence is not a claim
-- that an in-flight command failed. It never executes a revision or submission.
create function public.supply_revision_receipt(
 p_id uuid,p_payload jsonb,p_key uuid,p_version integer,p_recount boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;expected jsonb;recorded jsonb;
begin
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id;
 if d.type not in ('COM','ENT','BAL') or p_key is null or p_version is null
  or p_version<1 or p_recount is null then return null;end if;
 select * into e from public.document_events
  where actor_id=auth.uid() and idempotency_key=p_key and document_id=p_id
   and version=p_version+1
   and action=lower(d.type)||case when p_recount then '.recount' else '.draft_updated' end;
 if not found then return null;end if;
 if d.type='BAL' and (exists(select 1 from public.bal_cycles where document_id=p_id)
  or exists(select 1 from public.bal_regimes where care_recipient_id=d.care_recipient_id and activated_at is not null)) then
  expected:=p_payload-'balanceContext';recorded:=(e.body->'event')-'balanceContext';
 else
  expected:=p_payload-'balanceContext'-'balanceAssignment';recorded:=e.body->'event';
 end if;
 if recorded is distinct from expected then return null;end if;
 -- Recheck the selected scope and read authority before returning even this
 -- minimal receipt. A lost write capability cannot erase a readable event.
 perform public.operational_document(p_id);
 return jsonb_build_object('documentId',p_id,'revisionKey',p_key,'version',e.version);
end;$$;
revoke all on function public.supply_revision_receipt(uuid,jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
grant execute on function public.supply_revision_receipt(uuid,jsonb,uuid,integer,boolean) to authenticated;
