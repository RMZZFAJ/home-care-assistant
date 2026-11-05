CREATE OR REPLACE FUNCTION public.acknowledge_requisition(p_id uuid, p_mode text, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;pref jsonb;d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 perform private.require_cap(d.care_recipient_id,'req.science');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into d from public.operational_documents where id=p_id for update;
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if exists(select 1 from public.requisition_science_events where requisition_id=p_id and user_id=auth.uid()) then return public.requisition_progress(p_id);end if;
 if d.status='cancelled' or d.version<>p_version then raise exception 'stale document version' using errcode='P0001';end if;
 select notification_preferences into pref from public.profiles where id=auth.uid();
 if p_mode='express' then
 if not coalesce((pref->>'scienceExpress')::boolean,true) then raise exception 'express science disabled';end if;
 elsif p_mode='app_visible' then
 if not coalesce((pref->>'scienceAutomatic')::boolean,false) or not coalesce((s.policy->>'scienceAutomatic')::boolean,false) then raise exception 'automatic science disabled';end if;
 else raise exception 'invalid science mode';end if;
 if not(auth.uid()=any(s.eligible_users)) then raise exception 'science permission required' using errcode='42501';end if;
 perform private.record_science(p_id,auth.uid(),p_mode,jsonb_build_object('sessionId',private.auth_session(),'documentVersion',p_version,'source',case when p_mode='express' then 'authenticated_confirmation' else 'visible_content_loaded' end));
 return public.requisition_progress(p_id);
end;$function$
