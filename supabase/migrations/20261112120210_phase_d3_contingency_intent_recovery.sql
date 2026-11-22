-- Only official command references are retained by the client; no new form draft.
create function public.contingency_recovery(p_patient uuid,p_process text,p_key uuid,p_resolve boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$declare previous private.phase_d3_commands;result jsonb;begin
 perform private.require_contingency(p_patient,p_process,'contingency.read');
 if p_key is null or p_resolve is null then raise exception 'invalid contingency recovery' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('contingency-intent:'||auth.uid()::text||':'||p_key::text,0));
 perform private.require_contingency(p_patient,p_process,'contingency.read');
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.result->>'patientId' is distinct from p_patient::text or previous.result->>'process' is distinct from p_process or previous.result->>'key' is distinct from p_key::text then raise exception 'contingency intention unavailable' using errcode='42501';end if;
  return previous.result;
 end if;
 if not p_resolve then return jsonb_build_object('patientId',p_patient,'process',p_process,'key',p_key,'actorId',auth.uid(),'persistence','unconfirmed');end if;
 if not(private.contingency_allowed(p_patient,p_process,'contingency.report') or private.contingency_allowed(p_patient,p_process,'contingency.review')) then raise exception 'contingency recovery authority required' using errcode='42501';end if;
 result:=jsonb_build_object('patientId',p_patient,'process',p_process,'key',p_key,'actorId',auth.uid(),'persistence','not_executed','recordedAt',clock_timestamp());
 insert into private.phase_d3_commands values(auth.uid(),p_key,encode(extensions.digest(jsonb_build_array('contingency-closed-v1',p_patient,p_process,p_key)::text,'sha256'),'hex'),result);
 return result;
end;$$;
revoke all on function public.contingency_recovery(uuid,text,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.contingency_recovery(uuid,text,uuid,boolean) to authenticated;
