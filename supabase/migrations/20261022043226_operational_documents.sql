-- Four operational documents. Existing identities and historical migrations stay intact.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated,service_role;

create table public.patient_settings (
  care_recipient_id uuid primary key references public.care_recipients(id),
  version integer not null default 1,
  settings jsonb not null default '{"balDay":null,"balReview":"optional","balApprovers":["family","supervisor"],"balRequirement":"any","whatsappSimpleAcceptance":false}',
  bootstrap_closed boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.capability_definitions (
  code text primary key, default_roles text[] not null, critical boolean not null default false
);
insert into public.capability_definitions(code,default_roles,critical) values
 ('req.read',array['admin','family','supervisor','professional','reader'],false),
 ('req.create',array['admin','supervisor','professional'],false),
 ('req.review',array['admin','supervisor'],false),
 ('req.family_stock',array['admin','supervisor','professional'],false),
 ('com.read',array['admin','family'],false),('com.create',array['admin','family'],false),
 ('com.approve',array['admin'],true),('com.purchase',array['admin','family'],false),
 ('com.receive',array['admin','family'],false),('com.validate',array['admin'],true),
 ('ent.read',array['admin','family','supervisor','professional','reader'],false),
 ('ent.create',array['admin','family'],false),('ent.receive',array['admin','family','supervisor','professional'],false),
 ('ent.cancel',array['admin'],true),
 ('bal.read',array['admin','family','supervisor','professional','reader'],false),
 ('bal.count',array['admin','supervisor','professional'],false),
 ('bal.approve.family',array['admin','family'],true),('bal.approve.supervisor',array['supervisor'],true),
 ('stock.family.read',array['admin','family'],true),('stock.family.manage',array['admin'],true),
 ('stock.team.read',array['admin','family','supervisor','professional','reader'],false),
 ('catalog.manage',array['admin'],false),('access.manage',array['admin'],true),
 ('notifications.manage',array['admin'],false),('audit.read',array['admin'],false),
 ('consumption.report',array['admin','family','supervisor','professional'],false),
 ('consumption.confirm',array['admin','supervisor'],true);
create table public.capability_overrides (
  id uuid primary key default gen_random_uuid(), care_recipient_id uuid not null references public.care_recipients(id),
  capability text not null references public.capability_definitions(code), subject_role text,
  subject_user uuid references public.profiles(id), enabled boolean not null,
  check((subject_role is null)<>(subject_user is null)),
  check(subject_role is null or subject_role in ('admin','family','supervisor','professional','reader'))
);
create unique index capability_role_once on public.capability_overrides(care_recipient_id,capability,subject_role) where subject_role is not null;
create unique index capability_user_once on public.capability_overrides(care_recipient_id,capability,subject_user) where subject_user is not null;
create index capability_user_fk on public.capability_overrides(subject_user);
create table public.access_change_requests (
  id uuid primary key default gen_random_uuid(), care_recipient_id uuid not null references public.care_recipients(id),
  kind text not null check(kind in ('capability','settings','membership')), proposed jsonb not null,
  base_version integer not null, status text not null default 'pending' check(status in ('pending','applied','rejected')),
  proposed_by uuid not null references public.profiles(id), approved_by uuid references public.profiles(id),
  idempotency_key uuid not null, created_at timestamptz not null default now(), decided_at timestamptz,
  unique(care_recipient_id,idempotency_key),check(approved_by is null or approved_by<>proposed_by)
);
create index access_change_patient on public.access_change_requests(care_recipient_id,created_at desc);

create or replace function private.can(p_patient uuid,p_capability text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_role text;v_override boolean;v_default boolean;
begin
 if auth.uid() is null then return false;end if;
 if public.is_global_administrator() then return exists(select 1 from public.care_recipients where id=p_patient);end if;
 select m.role::text into v_role from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.user_id=auth.uid() and m.status='active' and p.status='active';
 if v_role is null then return false;end if;
 if p_capability like 'com.%' and v_role not in ('admin','family') then return false;end if;
 select enabled into v_override from public.capability_overrides where care_recipient_id=p_patient and capability=p_capability and subject_user=auth.uid();
 if found then return v_override;end if;
 select enabled into v_override from public.capability_overrides where care_recipient_id=p_patient and capability=p_capability and subject_role=v_role;
 if found then return v_override;end if;
 select v_role=any(default_roles) into v_default from public.capability_definitions where code=p_capability;
 return coalesce(v_default,false);
end;$$;
create function public.patient_capabilities(p_patient uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(code,private.can(p_patient,code)),'{}') from public.capability_definitions
 where public.can_access_recipient(p_patient);
$$;
create or replace function public.recipient_can(p_recipient_id uuid,p_operation text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_recipients where id=p_recipient_id and is_active)
 and private.can(p_recipient_id,case p_operation when 'admin' then 'access.manage' when 'submit' then 'req.create'
 when 'review' then 'req.review' when 'stock' then 'stock.family.manage' when 'count' then 'bal.count' else p_operation end);
$$;

create table public.document_series (
 care_recipient_id uuid not null references public.care_recipients(id),type text not null check(type in ('REQ','COM','ENT','BAL')),
 last_number bigint not null default 0 check(last_number>=0),primary key(care_recipient_id,type)
);
create table public.operational_documents (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 type text not null check(type in ('REQ','COM','ENT','BAL')),number bigint,code text,protocol text unique,
 status text not null default 'draft',created_by uuid references public.profiles(id),recipient_id uuid references public.profiles(id),
 version integer not null default 1,payload jsonb not null default '{}',workflow_data jsonb not null default '{}',canonical_snapshot jsonb not null default '{}',
 content_hash text not null default '',idempotency_key uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(care_recipient_id,type,number),unique(created_by,idempotency_key),unique(id,care_recipient_id),
 check(content_hash='' or content_hash~'^[a-f0-9]{64}$')
);
create index documents_patient_type on public.operational_documents(care_recipient_id,type,created_at desc);
create index documents_recipient on public.operational_documents(recipient_id,status);
create table public.document_lines (
 id uuid primary key default gen_random_uuid(),document_id uuid not null,care_recipient_id uuid not null,
 product_id text not null,name_snapshot text not null,unit_snapshot text not null,category_snapshot text not null,
 quantity numeric(18,6) not null check(quantity>=0),approved_quantity numeric(18,6) not null default 0,
 purchased_quantity numeric(18,6) not null default 0,accepted_quantity numeric(18,6) not null default 0,
 reconciled_quantity numeric(18,6) not null default 0,fully_checked boolean not null default false,
 metadata jsonb not null default '{}',
 foreign key(document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
 foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id),
 unique(document_id,product_id),unique(id,care_recipient_id),
 check(approved_quantity>=0 and approved_quantity<=quantity),check(purchased_quantity>=0 and purchased_quantity<=approved_quantity),
 check(accepted_quantity>=0 and accepted_quantity<=quantity),check(reconciled_quantity>=0 and accepted_quantity+reconciled_quantity<=quantity)
);
create index document_line_product on public.document_lines(care_recipient_id,product_id);
create table public.document_events (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.operational_documents(id),
 care_recipient_id uuid not null references public.care_recipients(id),version integer not null,
 action text not null,actor_id uuid references public.profiles(id),body jsonb not null,content_hash text not null,
 idempotency_key uuid not null,created_at timestamptz not null default now(),
 unique(document_id,version),unique(actor_id,idempotency_key)
);
create index document_event_patient on public.document_events(care_recipient_id,created_at desc);
create table public.document_request_links (
 document_line_id uuid not null references public.document_lines(id),requisition_item_id uuid not null references public.requisition_items(id),
 primary key(document_line_id,requisition_item_id)
);
create index document_link_req on public.document_request_links(requisition_item_id);
create table public.purchase_receipts (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.operational_documents(id),
 submitted_by uuid not null references public.profiles(id),validated_by uuid references public.profiles(id),
 state text not null check(state in ('pending','approved','rejected')),lines jsonb not null,reason text,
 created_at timestamptz not null default now(),validated_at timestamptz
);
create index purchase_receipt_document on public.purchase_receipts(document_id,state);
create table public.bal_approvals (
 document_id uuid not null references public.operational_documents(id),review_group text not null check(review_group in ('family','supervisor')),
 actor_id uuid not null references public.profiles(id),count_version integer not null,created_at timestamptz not null default now(),
 primary key(document_id,review_group),unique(document_id,actor_id)
);

create function private.immutable_event() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'confirmed event is immutable' using errcode='42501';end;$$;
create trigger immutable_document_event before update or delete on public.document_events for each row execute function private.immutable_event();

create function private.emit_document(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;n bigint;
begin
 select * into strict d from public.operational_documents where id=p_id for update;
 if d.code is not null then return;end if;
 insert into public.document_series(care_recipient_id,type,last_number) values(d.care_recipient_id,d.type,1)
 on conflict(care_recipient_id,type) do update set last_number=public.document_series.last_number+1 returning last_number into n;
 update public.operational_documents set number=n,code=d.type||'-'||lpad(n::text,greatest(4,length(n::text)),'0'),
 protocol=d.type||'-'||to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(left(replace(d.care_recipient_id::text,'-',''),8))||'-'||upper(left(replace(d.created_by::text,'-',''),8))||'-'||n||'-'||upper(left(encode(extensions.digest(p_id::text,'sha256'),'hex'),8)) where id=p_id;
end;$$;
create function private.record_document_event(p_id uuid,p_action text,p_body jsonb,p_key uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;s jsonb;h text;
begin
 select * into strict d from public.operational_documents where id=p_id for update;
 s:=jsonb_build_object('schemaVersion',1,'id',d.id,'careRecipientId',d.care_recipient_id,'type',d.type,'code',d.code,'protocol',d.protocol,
 'status',d.status,'createdBy',d.created_by,'recipientId',d.recipient_id,'payload',d.payload,'workflow',d.workflow_data,'lines',coalesce((select jsonb_agg(to_jsonb(l) order by l.product_id) from public.document_lines l where document_id=p_id),'[]'),
 'version',d.version,'action',p_action,'event',p_body,'previousHash',d.content_hash);
 h:=encode(extensions.digest(s::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=s,content_hash=h,updated_at=now() where id=p_id;
 insert into public.document_events(document_id,care_recipient_id,version,action,actor_id,body,content_hash,idempotency_key)
 values(p_id,d.care_recipient_id,d.version,p_action,auth.uid(),s,h,p_key);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),p_action,'document',p_id,jsonb_build_object('care_recipient_id',d.care_recipient_id,'type',d.type,'version',d.version));
end;$$;

-- Extensible units preserve the established base unit of every catalogue entry.
create table public.measurement_units (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid references public.care_recipients(id),
 code text not null,name text not null,dimension text not null check(dimension in ('count','volume','mass','package')),
 decimals integer not null default 0 check(decimals between 0 and 6)
);
create unique index unit_global_once on public.measurement_units(code) where care_recipient_id is null;
create unique index unit_local_once on public.measurement_units(care_recipient_id,code) where care_recipient_id is not null;
insert into public.measurement_units(code,name,dimension,decimals) values
 ('unidade','Unidade','count',0),('comprimido','Comprimido','count',0),('fralda','Fralda','count',0),
 ('caixa','Caixa','package',0),('pacote','Pacote','package',0),('frasco','Frasco','count',0),('bisnaga','Bisnaga','count',0),
 ('envelope','Envelope','count',0),('mL','Mililitro','volume',3),('g','Grama','mass',3);
alter table public.care_recipient_products add column quantity_decimals integer not null default 0 check(quantity_decimals between 0 and 6);
alter table public.care_recipient_products drop constraint care_recipient_products_unit_check;
create table public.product_presentations (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null,product_id text not null,
 barcode text not null check(barcode~'^[0-9]{8,14}$'),name text not null,base_quantity numeric(18,6) not null check(base_quantity>0),
 active boolean not null default true,created_at timestamptz not null default now(),
 foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id),unique(care_recipient_id,barcode)
);
create index presentation_product_fk on public.product_presentations(care_recipient_id,product_id);

-- Restrict table reads and expose only authorized transactional entry points.
do $$declare t text;begin
 foreach t in array array['patient_settings','capability_definitions','capability_overrides','access_change_requests','document_series','operational_documents','document_lines','document_events','document_request_links','purchase_receipts','bal_approvals','measurement_units','product_presentations'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end;$$;
create policy definitions_read on public.capability_definitions for select to authenticated using(true);
create policy settings_read on public.patient_settings for select to authenticated using(public.can_access_recipient(care_recipient_id));
create policy capabilities_admin on public.capability_overrides for select to authenticated using(public.can_manage_recipient(care_recipient_id));
create policy changes_admin on public.access_change_requests for select to authenticated using(public.can_manage_recipient(care_recipient_id));
create policy document_read on public.operational_documents for select to authenticated using(private.can(care_recipient_id,lower(type)||'.read'));
create policy document_lines_read on public.document_lines for select to authenticated using(exists(select 1 from public.operational_documents d where d.id=document_id));
create policy document_events_read on public.document_events for select to authenticated using(exists(select 1 from public.operational_documents d where d.id=document_id));
create policy document_links_read on public.document_request_links for select to authenticated using(exists(select 1 from public.document_lines l where l.id=document_line_id));
create policy purchase_receipts_read on public.purchase_receipts for select to authenticated using(exists(select 1 from public.operational_documents d where d.id=document_id));
create policy bal_approvals_read on public.bal_approvals for select to authenticated using(exists(select 1 from public.operational_documents d where d.id=document_id));
create policy units_read on public.measurement_units for select to authenticated using(care_recipient_id is null or public.can_access_recipient(care_recipient_id));
create policy presentations_read on public.product_presentations for select to authenticated using(public.can_access_recipient(care_recipient_id));
-- Policy helpers require schema usage but are not available through the Data API.
grant usage on schema private to authenticated;
grant execute on function private.can(uuid,text) to authenticated;
grant execute on function public.patient_capabilities(uuid) to authenticated;
