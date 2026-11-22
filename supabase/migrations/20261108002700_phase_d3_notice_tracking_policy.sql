begin;
-- Expose only the presentation deadline to a current document reader. The
-- existing delivery read and settings write contracts remain unchanged.
create function public.document_notice_tracking_policy(p_document uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare patient uuid;kind text;settings jsonb;seconds integer:=10;raw jsonb;
begin
 select care_recipient_id,lower(type)||'.read' into patient,kind from public.operational_documents where id=p_document;
 if not found or not private.can(patient,kind) then raise exception 'document permission required' using errcode='42501';end if;
 select s.settings into settings from public.patient_settings s where care_recipient_id=patient;
 raw:=settings->'shareWaitSeconds';
 if raw is not null and raw<>'null'::jsonb then
  if jsonb_typeof(raw)<>'number' or raw::text!~'^(0|[1-9]|10)$' then raise exception 'invalid notice tracking policy' using errcode='22023';end if;
  seconds:=(raw::text)::integer;
 end if;
 if not private.can(patient,kind) then raise exception 'document permission required' using errcode='42501';end if;
 return jsonb_build_object('waitSeconds',seconds);
end;$$;
revoke all on function public.document_notice_tracking_policy(uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_notice_tracking_policy(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
