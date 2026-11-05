CREATE OR REPLACE FUNCTION public.v3_flow_exchange(p_hash text, p_submit jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.flow_sessions;v uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'verified flow endpoint required' using errcode='42501';end if;
 select * into s from public.flow_sessions where token_hash=p_hash for update;
 if not found or s.expires_at<=now() or not private.user_can(s.care_recipient_id,s.user_id,'consumption.report') then raise exception 'flow session expired or revoked' using errcode='42501';end if;
 if p_submit is null then
 if s.used_at is not null then raise exception 'flow token used' using errcode='42501';end if;
 return jsonb_build_object('catalog',coalesce((select jsonb_agg(jsonb_build_object('id',product_id,'title',name,'unit',unit)) from public.care_recipient_products where care_recipient_id=s.care_recipient_id and is_active),'[]'));end if;
 if s.used_at is not null then
 if exists(select 1 from public.flow_submissions where session_id=s.id and body=p_submit) then return jsonb_build_object('pendingConfirmation',true);end if;
 raise exception 'flow replay conflict' using errcode='42501';end if;
 if jsonb_typeof(p_submit) is distinct from 'object' or length(p_submit::text)>10000 then raise exception 'invalid flow submission';end if;
 insert into public.flow_submissions(session_id,care_recipient_id,user_id,body) values(s.id,s.care_recipient_id,s.user_id,p_submit) returning id into v;
 update public.flow_sessions set used_at=now() where id=s.id;
 return jsonb_build_object('pendingConfirmation',true,'submissionId',v);
end;$function$
