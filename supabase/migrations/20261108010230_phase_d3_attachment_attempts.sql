begin;

alter table public.attachments drop constraint attachments_state_check;
alter table public.attachments add constraint attachments_state_check check(state in ('quarantine','ready','rejected','abandoned'));

create table private.attachment_attempts (
 attachment_id uuid primary key references public.attachments(id),
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
 source_bytes bigint not null check(source_bytes between 1 and 4194304),
 source_mime text not null check(source_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
 derivative_hash text not null check(derivative_hash ~ '^[a-f0-9]{64}$'),
 transformation text not null check(transformation in ('image-normalized-v1','pdf-passive-pages-v1')),
 created_at timestamptz not null default now(),abandoned_at timestamptz
);
create table private.attachment_uploads (
 attachment_id uuid not null references private.attachment_attempts(attachment_id),
 token uuid not null, state text not null default 'active' check(state in ('active','stored','refused','uncertain')),
 started_at timestamptz not null default now(), settled_at timestamptz,
 primary key(attachment_id,token)
);
alter table private.attachment_attempts enable row level security;
alter table private.attachment_uploads enable row level security;
revoke all on private.attachment_attempts,private.attachment_uploads from public,anon,authenticated,service_role;

create function private.attachment_writer(p_id uuid) returns boolean
language sql volatile security definer set search_path='' as $$
 select exists(select 1 from public.attachments a left join public.operational_documents d on d.id=a.document_id
 where a.id=p_id and a.uploaded_by=auth.uid() and
 case when a.document_id is not null then
  d.care_recipient_id=a.care_recipient_id and private.can(a.care_recipient_id,lower(d.type)||'.read') and
  (d.created_by=auth.uid() or d.recipient_id=auth.uid() or public.can_manage_recipient(a.care_recipient_id) or d.type='BAL' and private.can(a.care_recipient_id,'bal.count'))
 else private.can(a.care_recipient_id,'stock.family.manage') and exists(select 1 from public.stock_movements m where m.id=a.movement_id and m.care_recipient_id=a.care_recipient_id and m.reference_type='family_manual') end);
$$;
revoke all on function private.attachment_writer(uuid) from public,anon,authenticated,service_role;

-- Keep the legacy signature and metadata comparison. Formal abandonment alone
-- frees capacity; no time-based expiry, object deletion or history rewriting.
do $$declare body text;needle text:='and state<>''rejected'')>=10';begin
 body:=pg_get_functiondef('public.reserve_attachment(uuid,uuid,uuid,text,text,bigint,uuid)'::regprocedure);
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'reserve attachment baseline mismatch';end if;
 execute replace(body,needle,'and state not in (''rejected'',''abandoned''))>=10');
end;$$;

create function public.prepare_attachment_attempt(p_patient uuid,p_document uuid,p_movement uuid,p_filename text,p_mime text,p_bytes bigint,p_key uuid,p_source_hash text,p_source_bytes bigint,p_source_mime text,p_hash text,p_transformation text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare a public.attachments;t private.attachment_attempts;legacy boolean;
begin
 if p_source_hash is null or p_source_hash!~'^[a-f0-9]{64}$' or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or
 p_source_bytes is null or p_source_bytes not between 1 and 4194304 or p_bytes is null or p_bytes not between 1 and 4194304 or
 p_source_mime is null or p_source_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or
 p_transformation is null or not (p_source_mime='application/pdf' and p_mime='application/pdf' and p_transformation='pdf-passive-pages-v1' or p_source_mime<>'application/pdf' and p_mime='image/jpeg' and p_transformation='image-normalized-v1')
 then raise exception 'invalid attachment fingerprint' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('attachments:'||coalesce(p_document,p_movement),0));
 select exists(select 1 from public.attachments where uploaded_by=auth.uid() and upload_key=p_key) into legacy;
 perform public.reserve_attachment(p_patient,p_document,p_movement,p_filename,p_mime,p_bytes,p_key);
 select * into strict a from public.attachments where uploaded_by=auth.uid() and upload_key=p_key for update;
 if not private.attachment_writer(a.id) then raise exception 'attachment permission required' using errcode='42501';end if;
 select * into t from private.attachment_attempts where attachment_id=a.id;
 if not found then
  if legacy then return to_jsonb(a)||jsonb_build_object('legacy',true);end if;
  insert into private.attachment_attempts(attachment_id,source_hash,source_bytes,source_mime,derivative_hash,transformation)
  values(a.id,p_source_hash,p_source_bytes,p_source_mime,p_hash,p_transformation) returning * into t;
 end if;
 if t.source_hash<>p_source_hash or t.source_bytes<>p_source_bytes or t.source_mime<>p_source_mime or t.derivative_hash<>p_hash or t.transformation<>p_transformation then
  raise exception 'attachment idempotency fingerprint conflict' using errcode='23505';end if;
 if a.state in ('rejected','abandoned') then raise exception 'attachment attempt terminal' using errcode='PT409';end if;
 return to_jsonb(a)||jsonb_build_object('legacy',false);
end;$$;

create function public.attachment_attempts(p_patient uuid,p_document uuid,p_movement uuid,p_key uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare cap text;result jsonb;
begin
 if num_nonnulls(p_document,p_movement)<>1 then raise exception 'invalid attachment parent' using errcode='22023';end if;
 if p_document is not null then
  select lower(type)||'.read' into cap from public.operational_documents where id=p_document and care_recipient_id=p_patient;
 else
  if exists(select 1 from public.stock_movements where id=p_movement and care_recipient_id=p_patient and reference_type='family_manual') then cap:='stock.family.read';end if;
 end if;
 if cap is null or not private.can(p_patient,cap) then raise exception 'attachment permission required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'filename',a.filename,'bytes',a.bytes,'mime_type',a.mime_type,'state',a.state,'sha256',a.sha256,'object_path',a.object_path,'created_at',a.created_at,'uploaded_by',a.uploaded_by,
  'uploadKey',case when a.uploaded_by=auth.uid() then a.upload_key else null end,
  'sourceSha256',t.source_hash,'sourceBytes',t.source_bytes,'sourceMime',t.source_mime,'expectedSha256',t.derivative_hash,'transformation',t.transformation,'tracked',t.attachment_id is not null,
  'pending',exists(select 1 from private.attachment_uploads u where u.attachment_id=a.id and u.state<>'refused'),
  'canAbandon',a.state='quarantine' and t.attachment_id is not null and private.attachment_writer(a.id) and
   not exists(select 1 from private.attachment_uploads u where u.attachment_id=a.id and u.state<>'refused') and
   not exists(select 1 from storage.objects s where s.bucket_id='patient-evidence' and s.name=a.object_path)) order by a.created_at,a.id),'[]')
 into result from public.attachments a left join private.attachment_attempts t on t.attachment_id=a.id
 where a.care_recipient_id=p_patient and a.document_id is not distinct from p_document and a.movement_id is not distinct from p_movement and private.attachment_read(a.id)
 and (p_key is null and a.state<>'abandoned' or p_key is not null and a.uploaded_by=auth.uid() and a.upload_key=p_key);
 if not private.can(p_patient,cap) then raise exception 'attachment permission required' using errcode='42501';end if;
 return result;
end;$$;

create function public.begin_attachment_upload(p_id uuid,p_source_hash text,p_hash text,p_token uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare a public.attachments;t private.attachment_attempts;
begin
 select * into strict a from public.attachments where id=p_id for update;
 if not private.attachment_writer(a.id) then raise exception 'attachment permission required' using errcode='42501';end if;
 select * into strict t from private.attachment_attempts where attachment_id=a.id;
 if p_token is null or p_source_hash is distinct from t.source_hash or p_hash is distinct from t.derivative_hash then raise exception 'attachment idempotency fingerprint conflict' using errcode='23505';end if;
 if a.state in ('rejected','abandoned') then raise exception 'attachment attempt terminal' using errcode='PT409';end if;
 if a.state='quarantine' then
  insert into private.attachment_uploads(attachment_id,token) values(a.id,p_token) on conflict do nothing;
 end if;
 return to_jsonb(a);
end;$$;

create function private.attachment_upload_allowed(p_path text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare a public.attachments;
begin
 -- The lock is held until the Storage metadata transaction ends. Abandonment
 -- takes the same lock; an already authorized insert cannot overtake it.
 select * into a from public.attachments where object_path=p_path for update;
 if not found or a.state<>'quarantine' or not private.attachment_writer(a.id) then return false;end if;
 return not exists(select 1 from private.attachment_attempts where attachment_id=a.id) or
 exists(select 1 from private.attachment_uploads where attachment_id=a.id and state='active');
end;$$;
revoke all on function private.attachment_upload_allowed(text) from public,anon,authenticated,service_role;
grant execute on function private.attachment_upload_allowed(text) to authenticated;
drop policy evidence_upload on storage.objects;
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='patient-evidence' and private.attachment_upload_allowed(name));

create function public.settle_attachment_upload(p_id uuid,p_actor uuid,p_token uuid,p_outcome text) returns void
language plpgsql volatile security definer set search_path='' as $$
declare a public.attachments;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'server receipt required' using errcode='42501';end if;
 select * into strict a from public.attachments where id=p_id for update;
 if p_actor is distinct from a.uploaded_by or p_outcome is null or p_outcome not in ('stored','refused','uncertain') then raise exception 'invalid attachment receipt' using errcode='22023';end if;
 update private.attachment_uploads set state=p_outcome,settled_at=now() where attachment_id=p_id and token=p_token and state='active';
 if not found and not exists(select 1 from private.attachment_uploads where attachment_id=p_id and token=p_token and state=p_outcome) then raise exception 'invalid attachment receipt' using errcode='22023';end if;
end;$$;

create function public.abandon_attachment_attempt(p_id uuid,p_key uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare a public.attachments;parent uuid;
begin
 select coalesce(document_id,movement_id) into parent from public.attachments where id=p_id;
 perform pg_advisory_xact_lock(hashtextextended('attachments:'||parent,0));
 select * into strict a from public.attachments where id=p_id for update;
 if not private.attachment_writer(a.id) or p_key is distinct from a.upload_key then raise exception 'attachment permission required' using errcode='42501';end if;
 if not exists(select 1 from private.attachment_attempts where attachment_id=a.id) then raise exception 'legacy attachment attempt' using errcode='PT409';end if;
 if a.state='abandoned' then return jsonb_build_object('id',a.id,'persistence','abandoned');end if;
 if a.state<>'quarantine' or exists(select 1 from private.attachment_uploads where attachment_id=a.id and state<>'refused') or
 exists(select 1 from storage.objects where bucket_id='patient-evidence' and name=a.object_path) then raise exception 'attachment attempt pending' using errcode='PT409';end if;
 update public.attachments set state='abandoned' where id=a.id;
 update private.attachment_attempts set abandoned_at=now() where attachment_id=a.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'attachment.abandoned','attachment',a.id,jsonb_build_object('care_recipient_id',a.care_recipient_id,'document_id',a.document_id));
 return jsonb_build_object('id',a.id,'persistence','abandoned');
end;$$;

do $$declare body text;needle text:='if a.state<>''quarantine'' then if a.sha256<>p_hash then raise exception ''immutable attachment'';end if;return;end if;';replacement text:=$guard$
 if a.state not in ('quarantine','ready','rejected') then raise exception 'attachment attempt terminal' using errcode='PT409';end if;
 if a.state<>'quarantine' then
  if a.sha256 is distinct from p_hash or (a.state='ready') is distinct from p_valid then raise exception 'immutable attachment';end if;return;
 end if;
 if exists(select 1 from private.attachment_attempts t where t.attachment_id=a.id) then
  if not exists(select 1 from private.attachment_attempts t where t.attachment_id=a.id and t.derivative_hash=p_hash) or
   not exists(select 1 from storage.objects s where s.bucket_id='patient-evidence' and s.name=a.object_path) then raise exception 'attachment integrity mismatch';end if;
 end if;
$guard$;begin
 body:=pg_get_functiondef('public.finalize_attachment(uuid,uuid,text,text,bigint,boolean)'::regprocedure);
 if (length(body)-length(replace(body,needle,'')))/length(needle)<>1 then raise exception 'finalize attachment baseline mismatch';end if;
 execute replace(body,needle,replacement);
end;$$;

revoke all on function public.prepare_attachment_attempt(uuid,uuid,uuid,text,text,bigint,uuid,text,bigint,text,text,text),public.attachment_attempts(uuid,uuid,uuid,uuid),public.begin_attachment_upload(uuid,text,text,uuid),public.abandon_attachment_attempt(uuid,uuid),public.settle_attachment_upload(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_attachment_attempt(uuid,uuid,uuid,text,text,bigint,uuid,text,bigint,text,text,text),public.attachment_attempts(uuid,uuid,uuid,uuid),public.begin_attachment_upload(uuid,text,text,uuid),public.abandon_attachment_attempt(uuid,uuid) to authenticated;
grant execute on function public.settle_attachment_upload(uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
