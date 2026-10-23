-- Serialize the final archive authorization with concurrent policy revocation.
begin;
alter function public.archive_requisition(uuid,text) rename to v4_review_archive_requisition;
revoke all on function public.v4_review_archive_requisition(uuid,text) from public,anon,authenticated,service_role;
create function public.archive_requisition(p_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare patient uuid;begin
 select care_recipient_id into strict patient from public.requisition_lifecycle where requisition_id=p_id;
 perform private.require_cap(patient,'req.archive');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient,0));
 perform private.require_cap(patient,'req.archive');
 return public.v4_review_archive_requisition(p_id,p_reason);
end;$$;
grant execute on function public.archive_requisition(uuid,text) to authenticated;
commit;
