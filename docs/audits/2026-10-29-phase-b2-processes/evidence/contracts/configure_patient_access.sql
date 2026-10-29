CREATE OR REPLACE FUNCTION public.configure_patient_access(p_patient uuid, p_kind text, p_change jsonb, p_key uuid, p_version integer, p_request_id uuid DEFAULT NULL::uuid, p_decision text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.access_change_requests;result jsonb;begin
 if p_request_id is not null and p_decision='approve' then
 if not public.can_manage_recipient(p_patient) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if c.proposed_by=auth.uid() then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if c.status='pending' and c.kind='membership' and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(c.proposed->>'userId')::uuid and status='active') then
 if coalesce(p_change->>'invitationTokenHash','')!~'^[0-9a-f]{64}$' then raise exception 'recipient invitation acceptance required' using errcode='23514';end if;
 insert into private.membership_invitation_intents values(pg_backend_pid(),txid_current(),c.id,p_change->>'invitationTokenHash');
 end if;end if;
 result:=public.v4_review_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
 delete from private.membership_invitation_intents where backend_pid=pg_backend_pid() and transaction_id=txid_current();return result;
exception when sqlstate 'P0001' then
 -- A stale client revision cannot succeed through a database transaction retry.
 -- Keep real serialization failures untouched; expose this logical conflict once.
 if sqlerrm='stale policy version' then raise exception 'stale policy version' using errcode='PT409';end if;
 raise;
end;$function$
