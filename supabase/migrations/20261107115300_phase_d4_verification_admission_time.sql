-- Budget admission uses the clock after its observed serialization wait.
create or replace function public.claim_pdf_verification(p_subject text,p_upload boolean default false) returns boolean
language plpgsql security definer set search_path='' as $$
declare b bigint:=floor(extract(epoch from clock_timestamp())/60);g private.pdf_verification_windows;s private.pdf_verification_windows;begin
 if auth.role() is distinct from 'service_role' then raise exception 'verification worker required' using errcode='42501';end if;
 if p_subject is null or p_subject!~'^[a-f0-9]{64}$' or p_upload is null then raise exception 'invalid verification budget' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('pdf-verification-budget',0));
 b:=floor(extract(epoch from clock_timestamp())/60);
 delete from private.pdf_verification_windows where bucket<b-2;
 insert into private.pdf_verification_windows(bucket,subject) values(b,'global'),(b,p_subject) on conflict do nothing;
 select * into strict g from private.pdf_verification_windows where bucket=b and subject='global';
 select * into strict s from private.pdf_verification_windows where bucket=b and subject=p_subject;
 if g.requests>=60 or s.requests>=20 or p_upload and (g.uploads>=12 or s.uploads>=4) then return false;end if;
 update private.pdf_verification_windows set requests=requests+1,uploads=uploads+case when p_upload then 1 else 0 end where bucket=b and subject in ('global',p_subject);
 return true;
end;$$;

-- Existing exact-byte legacy lookup now has a consumer; avoid full archive scans.
create index document_pdfs_verification_sha256 on public.document_pdfs(sha256);
create index document_pdf_renders_verification_sha256 on public.document_pdf_renders(sha256);
