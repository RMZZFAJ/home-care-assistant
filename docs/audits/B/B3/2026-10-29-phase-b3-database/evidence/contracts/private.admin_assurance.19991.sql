CREATE OR REPLACE FUNCTION private.admin_assurance()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and factor_type='totp' and status='verified')
 or auth.jwt()->>'aal'='aal2'
 or exists(select 1 from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and user_id=auth.uid());
$function$
