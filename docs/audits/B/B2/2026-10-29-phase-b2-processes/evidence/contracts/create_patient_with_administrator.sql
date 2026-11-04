CREATE OR REPLACE FUNCTION public.create_patient_with_administrator(p_name text, p_development boolean, p_administrator_email text)
 RETURNS care_recipients
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare person uuid;patient public.care_recipients;begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 select p.id into person from public.profiles p join auth.users u on u.id=p.id where lower(u.email)=lower(trim(p_administrator_email)) and u.email_confirmed_at is not null and p.status='active';
 if person is null then raise exception 'confirmed active administrator identity required';end if;
 patient:=public.admin_upsert_recipient(null,p_name,true,p_development);
 insert into private.membership_authority values(pg_backend_pid(),txid_current(),patient.id,person,'admin',true,true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock) values(patient.id,person,'admin',true,true);
 delete from private.membership_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and care_recipient_id=patient.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'patient.initial_administrator','patient',patient.id,jsonb_build_object('userId',person,'explicit',true));return patient;
end;$function$
