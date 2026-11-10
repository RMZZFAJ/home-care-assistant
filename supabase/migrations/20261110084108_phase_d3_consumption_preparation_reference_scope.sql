-- Current operational references retain native active-patient read requirements.
-- Own private history/replay/cleanup still use the separate personal read scope.
create or replace function public.consumption_preparation_reference(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient' using errcode='42501';end if;
 perform private.validate_consumption_preparation(jsonb_build_object('consumption',p_fields,'reference',null,'referenceHash',null),jsonb_build_object('version',1,'stage','consumption_preparation'),p_purpose);
 s:=private.consumption_preparation_snapshot(p_patient,p_purpose,p_target,p_fields);
 perform private.require_consumption_read(p_patient,s->>'location');
 return jsonb_build_object('reference',s,'referenceHash',encode(extensions.digest(s::text,'sha256'),'hex'));
end;$$;
revoke all on function public.consumption_preparation_reference(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.consumption_preparation_reference(uuid,text,uuid,jsonb) to authenticated;
