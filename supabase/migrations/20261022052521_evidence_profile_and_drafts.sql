-- Confirmed snapshots include immutable references to validated evidence and identity labels.
create or replace function private.record_document_event(p_id uuid,p_action text,p_body jsonb,p_key uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;s jsonb;h text;actors jsonb;begin
 select * into strict d from public.operational_documents where id=p_id for update;
 actors:=jsonb_build_object('issuer',coalesce(d.canonical_snapshot->'actors'->'issuer',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.created_by)),
 'recipient',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.recipient_id),
 'patient',coalesce(d.canonical_snapshot->'actors'->'patient',(select jsonb_build_object('id',id,'name',display_name) from public.care_recipients where id=d.care_recipient_id)));
 s:=jsonb_build_object('schemaVersion',2,'id',d.id,'careRecipientId',d.care_recipient_id,'type',d.type,'code',d.code,'protocol',d.protocol,'createdAt',d.created_at,
 'status',d.status,'createdBy',d.created_by,'recipientId',d.recipient_id,'actors',actors,'payload',d.payload,'workflow',d.workflow_data,
 'lines',case when d.type='REQ' then coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.requisition_items i where requisition_id=d.id),'[]') else coalesce((select jsonb_agg(to_jsonb(l) order by l.product_id) from public.document_lines l where document_id=p_id),'[]') end,
 'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=p_id),'[]'),
 'requestLinks',coalesce((select jsonb_agg(to_jsonb(k)) from public.document_request_links k join public.document_lines l on l.id=k.document_line_id where l.document_id=p_id),'[]'),
 'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'filename',filename,'sha256',sha256,'bytes',bytes)) from public.attachments where document_id=p_id and state='ready'),'[]'),
 'version',d.version,'action',p_action,'event',p_body,'previousHash',d.content_hash);
 h:=encode(extensions.digest(s::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=s,content_hash=h,updated_at=now() where id=p_id;
 insert into public.document_events(document_id,care_recipient_id,version,action,actor_id,body,content_hash,idempotency_key) values(p_id,d.care_recipient_id,d.version,p_action,auth.uid(),s,h,p_key);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),p_action,'document',p_id,jsonb_build_object('care_recipient_id',d.care_recipient_id,'type',d.type,'version',d.version));
end;$$;
create function public.bind_validated_attachment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.attachments;d public.operational_documents;begin
 select * into strict a from public.attachments where id=p_id;
 if a.state<>'ready' or a.uploaded_by<>auth.uid() then raise exception 'validated evidence owner required' using errcode='42501';end if;
 if a.document_id is null then return;end if;
 select * into strict d from public.operational_documents where id=a.document_id for update;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 if exists(select 1 from public.document_events where document_id=d.id and action='attachment.bound' and body->'event'->>'attachmentId'=p_id::text) then return;end if;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'attachment.bound',jsonb_build_object('attachmentId',p_id,'sha256',a.sha256),p_id);
end;$$;
create function public.recent_session() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.sessions s where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id' and s.created_at>now()-interval '15 minutes');
$$;
create function public.set_my_avatar(p_path text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or p_path is null or p_path not like auth.uid()||'/%' or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=p_path) then raise exception 'invalid avatar' using errcode='42501';end if;
 update public.profiles set avatar_path=p_path where id=auth.uid() and status='active';
end;$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-avatars','profile-avatars',false,1048576,array['image/jpeg']) on conflict(id) do nothing;
create policy avatar_owner_insert on storage.objects for insert to authenticated with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_owner_read on storage.objects for select to authenticated using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
grant execute on function public.bind_validated_attachment(uuid),public.recent_session(),public.set_my_avatar(text) to authenticated;
