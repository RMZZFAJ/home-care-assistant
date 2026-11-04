CREATE OR REPLACE FUNCTION public.patient_governance(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_result jsonb;begin
 v_result:=public.fluent_pre_matrix_governance(p_patient);
 if jsonb_typeof(v_result->'data') is distinct from 'object' then raise exception 'invalid governance read model';end if;
 return jsonb_set(v_result,'{data,definitions}',private.capability_definition_rows(p_patient));
end;$function$
