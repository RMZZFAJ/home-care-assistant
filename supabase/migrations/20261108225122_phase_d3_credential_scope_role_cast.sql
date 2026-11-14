-- recipient_role returns profile_role; normalize it to text before the deny fallback.
do $migration$
declare definition text;anchor text:='coalesce(public.recipient_role(p_patient),'''')';begin
 definition:=pg_get_functiondef('private.require_credential_scope(uuid,uuid,boolean)'::regprocedure);
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then
  raise exception 'credential scope role guard drift';end if;
 execute replace(definition,anchor,'coalesce(public.recipient_role(p_patient)::text,'''')');
end;
$migration$;
