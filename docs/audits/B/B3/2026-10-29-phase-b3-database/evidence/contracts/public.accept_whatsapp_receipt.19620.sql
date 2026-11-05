CREATE OR REPLACE FUNCTION public.accept_whatsapp_receipt(p_provider_id text, p_phone text, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.whatsapp_challenges;d public.operational_documents;result jsonb;previous text:=current_setting('hca.verified_whatsapp_provider',true);begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'signed webhook worker required' using errcode='42501';end if;
 select * into c from public.whatsapp_challenges where token_hash=p_hash;
 if not found then return jsonb_build_object('accepted',false);end if;
 select * into strict d from public.operational_documents where id=c.document_id;
 insert into private.worker_authority values(pg_backend_pid(),txid_current(),c.recipient_id,d.care_recipient_id,'verified_whatsapp_receipt');
 perform set_config('hca.verified_whatsapp_provider',p_provider_id,true);
 result:=public.verified_legacy_whatsapp_receipt(p_provider_id,p_phone,p_hash);
 delete from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current();
 perform set_config('hca.verified_whatsapp_provider',coalesce(previous,''),true);
 return result;
end;$function$
