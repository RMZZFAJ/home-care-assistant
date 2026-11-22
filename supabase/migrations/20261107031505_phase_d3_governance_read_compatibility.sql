-- Keep the effective definitions at their established nested location as well
-- as the top-level matrix consumed by the current UI. History is paginated
-- separately; the default remains the actionable open proposals.
create or replace function public.patient_governance(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;page_data jsonb;definitions jsonb;begin
 result:=public.fluent_pre_matrix_governance(p_patient);
 if jsonb_typeof(result->'data') is distinct from 'object' then raise exception 'invalid governance read model';end if;
 definitions:=private.capability_definition_rows(p_patient);
 result:=jsonb_set(result,'{data,definitions}',definitions);
 page_data:=public.patient_governance_changes(p_patient);
 return result||jsonb_build_object('definitions',definitions,'changes',page_data->'changes','changePage',page_data-'changes');
end;$$;
revoke all on function public.patient_governance(uuid) from public,anon,authenticated,service_role;
grant execute on function public.patient_governance(uuid) to authenticated;
