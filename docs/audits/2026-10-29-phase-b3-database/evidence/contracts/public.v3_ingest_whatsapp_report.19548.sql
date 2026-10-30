CREATE OR REPLACE FUNCTION public.v3_ingest_whatsapp_report(p_provider_id text, p_phone text, p_text text, p_lines jsonb, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c jsonb;claims text;sub text;v uuid;k uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'webhook worker required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('inbound:'||p_provider_id,0));
 if exists(select 1 from public.inbound_messages where provider_id=p_provider_id) then return jsonb_build_object('duplicate',true);end if;
 c:=public.inbound_report_context(p_phone);if c is null then return jsonb_build_object('needsAuthenticatedSelection',true);end if;
 k:=gen_random_uuid();claims:=current_setting('request.jwt.claims',true);sub:=current_setting('request.jwt.claim.sub',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c->>'userId','role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',c->>'userId',true);
 v:=public.report_extraordinary_consumption((c->>'patientId')::uuid,p_kind,'CARE_TEAM',p_text,p_lines,k);
 perform set_config('request.jwt.claims',coalesce(claims,''),true);perform set_config('request.jwt.claim.sub',coalesce(sub,''),true);
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'report','pending_confirmation',now());return jsonb_build_object('reportId',v,'pendingConfirmation',true);
end;$function$
