-- Business-read recovery waits on the same private command key before proving an outcome.
create function public.schedule_preparation_recovery(p_patient uuid,p_purpose text,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_preparations;c private.schedule_preparation_commands;h text;header jsonb;reason text;begin
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 if p_id is null or p_key is null or p_expected is null or p_expected<1 or jsonb_typeof(p_body) is distinct from 'object' then raise exception 'invalid schedule recovery' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 select * into d from private.schedule_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 header:=jsonb_build_object('patientId',p_patient,'ownerId',auth.uid(),'purpose',p_purpose,'key',p_key,'expectedRevision',p_expected,'command',p_body,'current',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state));
 h:=encode(extensions.digest(jsonb_build_array('schedule-preparation-commit',p_patient,p_purpose,p_id,p_expected,p_body)::text,'sha256'),'hex');
 select * into c from private.schedule_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.intent_hash=h then
   if c.preparation_id is distinct from d.id or d.state not in ('consumed','completed') then raise exception 'schedule recovery invariant failed' using errcode='XX000';end if;
   return header||jsonb_build_object('status','applied','confirmation',jsonb_build_object('draft',header->'current','receipt',d.consumed_result,'replayed',true));
  end if;
  reason:='key_conflict';
 elsif exists(select 1 from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key) then reason:='key_conflict';
 elsif d.revision>p_expected then reason:='advanced_revision';
 end if;
 return header||jsonb_build_object('status',case when reason is null then 'unknown' else 'not_applied' end,'reason',reason,'receipt',d.consumed_result);
end;$$;
revoke all on function public.schedule_preparation_recovery(uuid,text,uuid,integer,jsonb,uuid) from public,anon,service_role;
grant execute on function public.schedule_preparation_recovery(uuid,text,uuid,integer,jsonb,uuid) to authenticated;
