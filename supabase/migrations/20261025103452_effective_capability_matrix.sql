-- The matrix distinguishes a configured override from a non-delegable role
-- boundary. This read model grants no operational authority.
create function private.capability_definition_rows(p_patient uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('allowed_roles',a.roles,'default_roles',array(select r from unnest(c.default_roles) r where r=any(a.roles))) order by c.code),'[]')
 from public.capability_definitions c cross join lateral(select array(select r from unnest(array['admin','family','supervisor','professional','reader']) r where case
 when c.code='access.manage' then r='admin'
 when c.code like 'com.%' or c.code in ('bal.defer.approve','bal.schedule.manage','bal.approve.family') then r in ('admin','family')
 when c.code='bal.count' and exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and activated_at is not null) then r in ('supervisor','professional')
 else true end) roles) a;
$$;
create function public.patient_capability_definitions(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.can(p_patient,'access.manage') then raise exception 'patient administration authorization required' using errcode='42501';end if;
 return private.capability_definition_rows(p_patient);
end;$$;
alter function public.patient_governance(uuid) rename to fluent_pre_matrix_governance;
revoke all on function public.fluent_pre_matrix_governance(uuid) from public,anon,authenticated,service_role;
create function public.patient_governance(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare v_result jsonb;begin
 v_result:=public.fluent_pre_matrix_governance(p_patient);
 if jsonb_typeof(v_result->'data') is distinct from 'object' then raise exception 'invalid governance read model';end if;
 return jsonb_set(v_result,'{data,definitions}',private.capability_definition_rows(p_patient));
end;$$;
revoke all on function private.capability_definition_rows(uuid) from public,anon,authenticated,service_role;
revoke all on function public.patient_capability_definitions(uuid),public.patient_governance(uuid) from public,anon,authenticated,service_role;
grant execute on function public.patient_capability_definitions(uuid),public.patient_governance(uuid) to authenticated;
