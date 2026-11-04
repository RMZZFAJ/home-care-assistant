CREATE OR REPLACE FUNCTION public.notification_webhook(p_provider_reference text, p_state text, p_notification_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;s public.requisition_lifecycle;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service authorization required' using errcode='42501';end if;
 perform public.v3_notification_webhook(p_provider_reference,p_state,p_notification_id);
 if p_state<>'read' then return;end if;
 select * into n from public.requisition_notifications where provider_reference=p_provider_reference and state='read' and channel='whatsapp' and event_key='req.issued' and template_name in ('hca_req_ciencia_familia_v4','hca_req_ciencia_simplificada_v4');
 if not found or n.template_snapshot is null then return;end if;
 select * into s from public.requisition_lifecycle where requisition_id=n.document_id;
 if not coalesce((s.policy->>'scienceAutomatic')::boolean,false)
 or not coalesce((select (notification_preferences->>'scienceAutomatic')::boolean from public.profiles where id=n.recipient_user_id),false)
 or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=n.recipient_user_id and ltrim(v.phone,'+')=ltrim(n.destination,'+') and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null) then return;end if;
 perform private.record_science(n.document_id,n.recipient_user_id,'whatsapp_read',jsonb_build_object('providerReference',p_provider_reference,'notificationId',n.id,'documentEventId',n.document_event_id,'template',n.template_name,'templateVersion',n.template_version));
end;$function$
