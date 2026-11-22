-- The HTTP boundary rate-limits public lookups and isolates untrusted PDFs.
-- No raw address, document body or uploaded file is retained in the limiter.
create table private.pdf_verification_windows (
 bucket bigint not null,subject text not null,requests integer not null default 0,
 uploads integer not null default 0,primary key(bucket,subject),
 check(subject='global' or subject~'^[a-f0-9]{64}$'),check(requests>=0 and uploads>=0)
);
revoke all on private.pdf_verification_windows from public,anon,authenticated,service_role;
create function public.claim_pdf_verification(p_subject text,p_upload boolean default false) returns boolean
language plpgsql security definer set search_path='' as $$
declare b bigint:=floor(extract(epoch from clock_timestamp())/60);g private.pdf_verification_windows;s private.pdf_verification_windows;begin
 if auth.role() is distinct from 'service_role' then raise exception 'verification worker required' using errcode='42501';end if;
 if p_subject is null or p_subject!~'^[a-f0-9]{64}$' or p_upload is null then raise exception 'invalid verification budget' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-verification-budget',0));
 delete from private.pdf_verification_windows where bucket<b-2;
 insert into private.pdf_verification_windows(bucket,subject) values(b,'global'),(b,p_subject) on conflict do nothing;
 select * into strict g from private.pdf_verification_windows where bucket=b and subject='global';
 select * into strict s from private.pdf_verification_windows where bucket=b and subject=p_subject;
 if g.requests>=60 or s.requests>=20 or p_upload and (g.uploads>=12 or s.uploads>=4) then return false;end if;
 update private.pdf_verification_windows set requests=requests+1,uploads=uploads+case when p_upload then 1 else 0 end where bucket=b and subject in ('global',p_subject);
 return true;
end;$$;
revoke all on function public.claim_pdf_verification(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.claim_pdf_verification(text,boolean) to service_role;

-- Only the bounded public HTTP facade invokes this minimum-data declassifier.
revoke execute on function public.pdf_issuance_public(text,text) from public,anon,authenticated;
grant execute on function public.pdf_issuance_public(text,text) to service_role;
create function public.legacy_pdf_public(p_hash text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare stamp timestamptz;begin
 if auth.role() is distinct from 'service_role' then raise exception 'verification worker required' using errcode='42501';end if;
 if p_hash is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid PDF digest' using errcode='22023';end if;
 select min(created_at) into stamp from (
  select created_at from public.document_pdfs where sha256=p_hash
  union all select created_at from public.document_pdf_renders where sha256=p_hash
 ) records;
 return case when stamp is null then jsonb_build_object('found',false) else jsonb_build_object('found',true,'registeredAt',stamp,'sha256',p_hash) end;
end;$$;
revoke all on function public.legacy_pdf_public(text) from public,anon,authenticated,service_role;
grant execute on function public.legacy_pdf_public(text) to service_role;
