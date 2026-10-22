-- Reuse the existing outbox; UI acknowledgements are independent of provider receipts.
alter table public.requisition_notifications add column document_id uuid references public.operational_documents(id),
 add column document_event_id uuid references public.document_events(id),add column seen_at timestamptz;
alter table public.requisition_notifications drop constraint notification_event_kind;
alter table public.requisition_notifications add constraint notification_event_kind check(num_nonnulls(requisition_id,alert_event_id,document_id)=1);
create unique index notification_document_event_once on public.requisition_notifications(document_event_id,recipient_user_id,channel) where document_event_id is not null;
create index notification_document on public.requisition_notifications(document_id);
drop trigger requisition_notification_enqueue_trigger on public.requisitions;

create function private.user_can(p_patient uuid,p_user uuid,p_cap text) returns boolean
language plpgsql stable security definer set search_path='' as $$declare r text;v boolean;begin
 if exists(select 1 from public.profiles where id=p_user and role='admin' and status='active' and global_scope) then return true;end if;
 select m.role::text into r from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active';
 if r is null or p_cap like 'com.%' and r not in ('family','admin') then return false;end if;
 select enabled into v from public.capability_overrides where care_recipient_id=p_patient and subject_user=p_user and capability=p_cap;if found then return v;end if;
 select enabled into v from public.capability_overrides where care_recipient_id=p_patient and subject_role=r and capability=p_cap;if found then return v;end if;
 return coalesce((select r=any(default_roles) from public.capability_definitions where code=p_cap),false);
end;$$;
create function private.enqueue_document_event() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;m record;s record;g text;begin
 select * into strict d from public.operational_documents where id=new.document_id;
 if d.status='draft' then return new;end if;
 for m in select distinct p.id,p.full_name from public.profiles p left join public.care_recipient_memberships v on v.user_id=p.id and v.care_recipient_id=d.care_recipient_id and v.status='active'
 where p.status='active' and (v.id is not null or p.role='admin' and p.global_scope) loop
 if not private.user_can(d.care_recipient_id,m.id,lower(d.type)||'.read') then continue;end if;
 g:=case when exists(select 1 from public.care_recipient_memberships where care_recipient_id=d.care_recipient_id and user_id=m.id and role='family') then 'family' else 'other' end;
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel)
 values(d.care_recipient_id,d.id,new.id,m.id,g,m.full_name,'internal');
 for s in select * from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.id and is_enabled and channel<>'internal' loop
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel,destination)
 values(d.care_recipient_id,d.id,new.id,m.id,s.recipient_group,m.full_name,s.channel,s.destination);
 end loop;
 end loop;return new;
end;$$;
create trigger document_event_notifications after insert on public.document_events for each row execute function private.enqueue_document_event();

create or replace function public.validate_notification_job(p_id uuid,p_worker_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$declare n public.requisition_notifications;d public.operational_documents;begin
 if not public.is_global_administrator() and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_id and leased_by=p_worker_id and state='processing' and lease_expires_at>now() for update;
 if not found then return false;end if;
 if n.document_id is not null then
 select * into d from public.operational_documents where id=n.document_id;
 if private.user_can(n.care_recipient_id,n.recipient_user_id,lower(d.type)||'.read') then return true;end if;
 elsif exists(select 1 from public.profiles p where p.id=n.recipient_user_id and p.status='active' and (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.user_id=p.id and m.care_recipient_id=n.care_recipient_id and m.status='active'))) then return true;
 end if;
 update public.requisition_notifications set state='cancelled',last_error='RECIPIENT_REVOKED',leased_by=null,lease_expires_at=null where id=n.id;return false;
end;$$;
create function public.mark_notification_seen(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.requisition_notifications set seen_at=coalesce(seen_at,now()) where id=p_id and recipient_user_id=auth.uid() and public.can_access_recipient(care_recipient_id);
 if not found then raise exception 'notification not found' using errcode='42501';end if;
end;$$;
grant execute on function public.mark_notification_seen(uuid) to authenticated;

create table public.document_pdfs (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.operational_documents(id),version integer not null,
 object_path text not null,sha256 text not null check(sha256~'^[a-f0-9]{64}$'),created_at timestamptz not null default now(),unique(document_id,version)
);
create function public.notification_document_payload(p_id uuid,p_worker_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare n public.requisition_notifications;d public.operational_documents;e public.document_events;begin
 if not public.validate_notification_job(p_id,p_worker_id) then raise exception 'invalid notification job' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_id;
 select * into d from public.operational_documents where id=coalesce(n.document_id,n.requisition_id);
 if not found then return null;end if;
 if n.document_event_id is not null then select * into e from public.document_events where id=n.document_event_id;
 else select * into e from public.document_events where document_id=d.id order by version limit 1;end if;
 return jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id,'code',d.code,'type',d.type,'protocol',d.protocol,'version',e.version,'snapshot',e.body,'hash',e.content_hash);
end;$$;
grant execute on function public.notification_document_payload(uuid,uuid) to service_role;

create table public.attachments (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 document_id uuid references public.operational_documents(id),movement_id uuid references public.stock_movements(id),
 uploaded_by uuid not null references public.profiles(id),filename text not null,mime_type text not null,
 bytes bigint not null check(bytes between 1 and 10485760),object_path text not null unique,
 state text not null default 'quarantine' check(state in ('quarantine','ready','rejected')),
 sha256 text check(sha256~'^[a-f0-9]{64}$'),created_at timestamptz not null default now(),confirmed_at timestamptz,
 check(num_nonnulls(document_id,movement_id)=1)
);
create index attachment_document on public.attachments(document_id);
create index attachment_movement on public.attachments(movement_id);
create index attachment_patient on public.attachments(care_recipient_id);
create function private.attachment_read(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.attachments a left join public.operational_documents d on d.id=a.document_id where a.id=p_id and
 (a.uploaded_by=auth.uid() or a.state='ready' and case when d.id is not null then private.can(a.care_recipient_id,lower(d.type)||'.read') else private.can(a.care_recipient_id,'stock.family.read') end));
$$;
create function public.reserve_attachment(p_patient uuid,p_document uuid,p_movement uuid,p_filename text,p_mime text,p_bytes bigint) returns jsonb
language plpgsql security definer set search_path='' as $$declare d public.operational_documents;v public.attachments;v_id uuid:=gen_random_uuid();begin
 if num_nonnulls(p_document,p_movement)<>1 or p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or p_bytes not between 1 and 10485760 or length(p_filename) not between 1 and 180 then raise exception 'invalid attachment';end if;
 if p_document is not null then
 select * into d from public.operational_documents where id=p_document and care_recipient_id=p_patient;
 if not found then raise exception 'document not found';end if;
 perform private.require_cap(p_patient,lower(d.type)||'.read');
 if not (d.created_by=auth.uid() or d.recipient_id=auth.uid() or public.can_manage_recipient(p_patient) or d.type='BAL' and private.can(p_patient,'bal.count')) then raise exception 'attachment write not authorized' using errcode='42501';end if;
 else
 perform private.require_cap(p_patient,'stock.family.manage');
 if not exists(select 1 from public.stock_movements where id=p_movement and care_recipient_id=p_patient and reference_type='family_manual') then raise exception 'invalid movement';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('attachments:'||coalesce(p_document,p_movement),0));
 if (select count(*) from public.attachments where coalesce(document_id,movement_id)=coalesce(p_document,p_movement) and state<>'rejected')>=10 then raise exception 'attachment limit reached';end if;
 insert into public.attachments(id,care_recipient_id,document_id,movement_id,uploaded_by,filename,mime_type,bytes,object_path)
 values(v_id,p_patient,p_document,p_movement,auth.uid(),p_filename,p_mime,p_bytes,p_patient||'/'||auth.uid()||'/'||v_id||'/original') returning * into v;return to_jsonb(v);
end;$$;
create function public.finalize_attachment(p_id uuid,p_actor uuid,p_hash text,p_mime text,p_bytes bigint,p_valid boolean) returns void
language plpgsql security definer set search_path='' as $$declare a public.attachments;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'server validation required' using errcode='42501';end if;
 select * into strict a from public.attachments where id=p_id for update;
 if a.uploaded_by<>p_actor or a.bytes<>p_bytes or a.mime_type<>p_mime or p_hash!~'^[a-f0-9]{64}$' then raise exception 'attachment integrity mismatch';end if;
 if a.state<>'quarantine' then if a.sha256<>p_hash then raise exception 'immutable attachment';end if;return;end if;
 update public.attachments set state=case when p_valid then 'ready' else 'rejected' end,sha256=p_hash,confirmed_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(p_actor,case when p_valid then 'attachment.validated' else 'attachment.rejected' end,'attachment',p_id,jsonb_build_object('care_recipient_id',a.care_recipient_id,'document_id',a.document_id,'sha256',p_hash));
end;$$;
grant execute on function public.reserve_attachment(uuid,uuid,uuid,text,text,bigint) to authenticated;
grant execute on function public.finalize_attachment(uuid,uuid,text,text,bigint,boolean) to service_role;
grant execute on function private.attachment_read(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('patient-evidence','patient-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('document-receipts','document-receipts',false,10485760,array['application/pdf']) on conflict(id) do nothing;
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='patient-evidence' and exists(select 1 from public.attachments a where a.object_path=name and a.uploaded_by=auth.uid() and a.state='quarantine'));
create policy evidence_read on storage.objects for select to authenticated using(bucket_id='patient-evidence' and exists(select 1 from public.attachments a where a.object_path=name and private.attachment_read(a.id)));
create policy receipt_read on storage.objects for select to authenticated using(bucket_id='document-receipts' and exists(select 1 from public.document_pdfs p join public.operational_documents d on d.id=p.document_id where p.object_path=name and private.can(d.care_recipient_id,lower(d.type)||'.read')));

alter table public.profiles add column avatar_path text,add column professional_registration text,add column professional_state text,
 add column professional_category text,add column notification_preferences jsonb not null default '{}';
create function public.update_my_profile(p_name text,p_registration text,p_state text,p_category text,p_preferences jsonb) returns void
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or length(trim(p_name)) not between 2 and 160 or length(coalesce(p_registration,''))>30 or p_state is not null and p_state!~'^[A-Z]{2}$' or length(coalesce(p_category,''))>80 or jsonb_typeof(p_preferences)<>'object' then raise exception 'invalid profile';end if;
 update public.profiles set full_name=trim(p_name),professional_registration=nullif(trim(p_registration),''),professional_state=p_state,professional_category=p_category,notification_preferences=p_preferences where id=auth.uid() and status='active';
 if not found then raise exception 'profile unavailable' using errcode='42501';end if;
end;$$;
create function public.my_sessions() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'updatedAt',updated_at,'userAgent',user_agent,'current',id::text=auth.jwt()->>'session_id')),'[]') from auth.sessions where user_id=auth.uid();
$$;
create table public.verified_phones (
 user_id uuid primary key references public.profiles(id),phone text not null unique check(phone~'^\+[1-9][0-9]{7,14}$'),verified_at timestamptz not null default now()
);
create table public.whatsapp_challenges (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.operational_documents(id),
 recipient_id uuid not null references public.profiles(id),token_hash text not null unique,phone text not null,
 expires_at timestamptz not null,used_at timestamptz,document_version integer not null,created_at timestamptz not null default now()
);
create table public.inbound_messages (
 provider_id text primary key,phone_hash text not null,kind text not null,status text not null,created_at timestamptz not null default now()
);

create table public.consumption_reports (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 reported_by uuid not null references public.profiles(id),confirmed_by uuid references public.profiles(id),
 kind text not null check(kind in ('consumption','shortage')),location text not null check(location in ('FAMILY','CARE_TEAM')),
 status text not null default 'reported' check(status in ('reported','confirmed','rejected')),body text not null,
 lines jsonb not null,idempotency_key uuid not null,created_at timestamptz not null default now(),confirmed_at timestamptz,
 unique(reported_by,idempotency_key)
);
create index consumption_patient on public.consumption_reports(care_recipient_id,created_at desc);
create function public.report_extraordinary_consumption(p_patient uuid,p_kind text,p_location text,p_text text,p_lines jsonb,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$declare v public.consumption_reports;begin
 perform private.require_cap(p_patient,'consumption.report');
 if p_kind not in ('consumption','shortage') or p_location not in ('FAMILY','CARE_TEAM') or length(trim(p_text)) not between 3 and 2000 or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)>100 or p_key is null then raise exception 'invalid consumption report';end if;
 if p_location='FAMILY' and public.recipient_role(p_patient) not in ('admin','family') then raise exception 'family scope required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 select * into v from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;
 if found then if v.care_recipient_id<>p_patient or v.kind<>p_kind or v.location<>p_location or v.body<>p_text or v.lines<>p_lines then raise exception 'idempotency conflict' using errcode='23505';end if;return v.id;end if;
 insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) values(p_patient,auth.uid(),p_kind,p_location,p_text,p_lines,p_key) returning * into v;
 return v.id;
end;$$;
create function public.confirm_extraordinary_consumption(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.consumption_reports;x jsonb;q numeric;begin
 select * into r from public.consumption_reports where id=p_id;
 if not found then raise exception 'report not found';end if;
 perform private.require_cap(r.care_recipient_id,case r.location when 'FAMILY' then 'stock.family.manage' else 'consumption.confirm' end);
 perform pg_advisory_xact_lock(hashtextextended('stock:'||r.care_recipient_id,0));
 select * into r from public.consumption_reports where id=p_id for update;
 if r.status<>'reported' then return;end if;
 if p_accept and r.kind='consumption' then
 if jsonb_array_length(r.lines)=0 then raise exception 'structured confirmation required';end if;
 for x in select value from jsonb_array_elements(r.lines) loop
 q:=(x->>'quantity')::numeric;
 if q is null or q<=0 or q>1000000000 or not exists(select 1 from public.care_recipient_products where care_recipient_id=r.care_recipient_id and product_id=x->>'productId' and unit=x->>'unit') then raise exception 'ambiguous consumption';end if;
 perform private.move_stock(r.care_recipient_id,x->>'productId',q,r.location,null,'Consumo extraordinário confirmado','consumption',r.id);
 end loop;end if;
 update public.consumption_reports set status=case when p_accept then 'confirmed' else 'rejected' end,confirmed_by=auth.uid(),confirmed_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'consumption.reviewed','consumption',p_id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'accepted',p_accept,'kind',r.kind));
end;$$;
grant execute on function public.report_extraordinary_consumption(uuid,text,text,text,jsonb,uuid),public.confirm_extraordinary_consumption(uuid,boolean),public.update_my_profile(text,text,text,text,jsonb),public.my_sessions() to authenticated;

do $$declare t text;begin foreach t in array array['attachments','document_pdfs','verified_phones','whatsapp_challenges','inbound_messages','consumption_reports'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;end;$$;
create policy attachments_read on public.attachments for select to authenticated using(private.attachment_read(id));
create policy pdf_read on public.document_pdfs for select to authenticated using(exists(select 1 from public.operational_documents where id=document_id));
create policy phones_self on public.verified_phones for select to authenticated using(user_id=auth.uid());
create policy consumption_read on public.consumption_reports for select to authenticated using(case location when 'FAMILY' then private.can(care_recipient_id,'stock.family.read') else private.can(care_recipient_id,'stock.team.read') end);
