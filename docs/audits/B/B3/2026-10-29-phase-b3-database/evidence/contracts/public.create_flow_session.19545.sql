CREATE OR REPLACE FUNCTION public.create_flow_session(p_patient uuid, p_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v uuid;begin
 perform private.require_cap(p_patient,'consumption.report');
 if not public.recent_session() or p_hash is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'recent session required' using errcode='42501';end if;
 insert into public.flow_sessions(care_recipient_id,user_id,token_hash,expires_at) values(p_patient,auth.uid(),p_hash,now()+interval '20 minutes') returning id into v;return v;
end;$function$
