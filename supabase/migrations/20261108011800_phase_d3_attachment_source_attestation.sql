begin;
-- A browser may declare a fingerprint, but only the server that read and
-- sanitized those bytes may attest their provenance. No retroactive attestation.
alter table private.attachment_attempts add column source_verified_at timestamptz;

create function public.attest_attachment_source(p_id uuid,p_actor uuid,p_source_hash text,p_source_bytes bigint,p_source_mime text,p_hash text,p_transformation text) returns void
language plpgsql volatile security definer set search_path='' as $$
declare a public.attachments;t private.attachment_attempts;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'server attestation required' using errcode='42501';end if;
 select * into strict a from public.attachments where id=p_id for update;
 if p_actor is distinct from a.uploaded_by or not exists(select 1 from public.profiles where id=p_actor and status='active') or
 not (case when a.document_id is not null then private.user_can(a.care_recipient_id,p_actor,(select lower(type)||'.read' from public.operational_documents where id=a.document_id)) else private.user_can(a.care_recipient_id,p_actor,'stock.family.manage') end)
 then raise exception 'evidence permission revoked' using errcode='42501';end if;
 if a.state not in ('quarantine','ready') then raise exception 'attachment attempt terminal' using errcode='PT409';end if;
 select * into strict t from private.attachment_attempts where attachment_id=a.id;
 if p_source_hash is distinct from t.source_hash or p_source_bytes is distinct from t.source_bytes or p_source_mime is distinct from t.source_mime or p_hash is distinct from t.derivative_hash or p_transformation is distinct from t.transformation then
  raise exception 'attachment idempotency fingerprint conflict' using errcode='23505';end if;
 update private.attachment_attempts set source_verified_at=now() where attachment_id=a.id and source_verified_at is null;
 if found then insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(p_actor,'attachment.source_attested','attachment',a.id,jsonb_build_object('care_recipient_id',a.care_recipient_id,'source_sha256',t.source_hash,'derivative_sha256',t.derivative_hash,'transformation',t.transformation));end if;
end;$$;
revoke all on function public.attest_attachment_source(uuid,uuid,text,bigint,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.attest_attachment_source(uuid,uuid,text,bigint,text,text,text) to service_role;

do $$declare body text;needle text;begin
 body:=pg_get_functiondef('public.begin_attachment_upload(uuid,text,text,uuid)'::regprocedure);
 needle:='if p_token is null or';
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'begin attachment baseline mismatch';end if;
 execute replace(body,needle,'if t.source_verified_at is null then raise exception ''server attestation required'' using errcode=''42501'';end if; if p_token is null or');

 body:=pg_get_functiondef('public.finalize_attachment(uuid,uuid,text,text,bigint,boolean)'::regprocedure);
 needle:='t.attachment_id=a.id and t.derivative_hash=p_hash';
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'finalize attachment attestation baseline mismatch';end if;
 execute replace(body,needle,needle||' and t.source_verified_at is not null');

 body:=pg_get_functiondef('public.attachment_attempts(uuid,uuid,uuid,uuid)'::regprocedure);
 needle:='''sourceSha256'',t.source_hash,''sourceBytes'',t.source_bytes,''sourceMime'',t.source_mime,''expectedSha256'',t.derivative_hash';
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'attachment provenance baseline mismatch';end if;
 execute replace(body,needle,'''sourceSha256'',case when t.source_verified_at is not null then t.source_hash end,''sourceBytes'',case when t.source_verified_at is not null then t.source_bytes end,''sourceMime'',case when t.source_verified_at is not null then t.source_mime end,''expectedSha256'',case when t.source_verified_at is not null then t.derivative_hash end');
end;$$;
notify pgrst,'reload schema';
commit;
