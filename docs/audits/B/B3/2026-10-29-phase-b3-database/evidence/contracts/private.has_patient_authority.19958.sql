CREATE OR REPLACE FUNCTION private.has_patient_authority(p_patient uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from private.authority_sessions where session_id=private.auth_session() and user_id=auth.uid() and mode='patient' and care_recipient_id=p_patient)
 or exists(select 1 from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and user_id=auth.uid() and care_recipient_id=p_patient);
$function$
