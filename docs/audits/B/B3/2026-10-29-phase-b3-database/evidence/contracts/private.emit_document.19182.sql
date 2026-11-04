CREATE OR REPLACE FUNCTION private.emit_document(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;n bigint;
begin
 select * into strict d from public.operational_documents where id=p_id for update;
 if d.code is not null then return;end if;
 insert into public.document_series(care_recipient_id,type,last_number) values(d.care_recipient_id,d.type,1)
 on conflict(care_recipient_id,type) do update set last_number=public.document_series.last_number+1 returning last_number into n;
 update public.operational_documents set number=n,code=d.type||'-'||lpad(n::text,greatest(4,length(n::text)),'0'),
 protocol=d.type||'-'||to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(left(replace(d.care_recipient_id::text,'-',''),8))||'-'||upper(left(replace(d.created_by::text,'-',''),8))||'-'||n||'-'||upper(left(encode(extensions.digest(p_id::text,'sha256'),'hex'),8)) where id=p_id;
end;$function$
