-- P07 uses an ENT carrier. Declaration and agreement do not dispatch material.
create table public.ent_transfers (
 document_id uuid primary key references public.operational_documents(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 initiator_id uuid not null references public.profiles(id),counterparty_id uuid not null references public.profiles(id),
 original_recipient_id uuid not null references public.profiles(id),origin_document_id uuid references public.operational_documents(id),
 state text not null check(state in ('pending','agreed','declined','withdrawn','dispatched')),
 declaration jsonb not null,agreement jsonb,withdrawal jsonb,dispatched_at timestamptz,
 created_at timestamptz not null default statement_timestamp(),
 check(initiator_id<>counterparty_id and initiator_id<>original_recipient_id)
);
alter table public.ent_transfers enable row level security;
revoke all on public.ent_transfers from public,anon,authenticated,service_role;
grant select on public.ent_transfers to authenticated;
create policy ent_transfers_read on public.ent_transfers for select to authenticated
 using(coalesce(private.can(care_recipient_id,'ent.read'),false) and exists(
   select 1 from public.operational_documents d where d.id=document_id and d.care_recipient_id=ent_transfers.care_recipient_id and d.type='ENT'));
create index ent_transfer_patient_state on public.ent_transfers(care_recipient_id,state,created_at);
create table private.transfer_commands (
 actor_id uuid not null references public.profiles(id),key uuid not null,care_recipient_id uuid not null references public.care_recipients(id),
 document_id uuid not null references public.operational_documents(id),request jsonb not null,result jsonb not null,
 primary key(actor_id,key)
);
alter table private.transfer_commands enable row level security;
revoke all on private.transfer_commands from public,anon,authenticated,service_role;

create function private.transfer_party_eligible(p_patient uuid,p_user uuid,p_source text) returns boolean
language sql stable security definer set search_path='' as $$
 select p_source in ('FAMILY','CARE_TEAM') and exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
   where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active'
   and (m.role::text in ('admin',case when p_source='FAMILY' then 'professional' else 'family' end)
     or p_source='FAMILY' and m.role::text='supervisor') and private.member_can(p_patient,p_user,'ent.receive'));
$$;
revoke all on function private.transfer_party_eligible(uuid,uuid,text) from public,anon,authenticated,service_role;

create function private.transfer_preparation(p_patient uuid,p_source text) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare people jsonb;products jsonb;origins jsonb;origin_total integer;result jsonb;begin
 perform private.require_cap(p_patient,'ent.read');perform private.require_cap(p_patient,'ent.create');
 if p_source is null or p_source not in ('FAMILY','CARE_TEAM') then raise exception 'invalid transfer source' using errcode='22023';end if;
 perform private.require_cap(p_patient,case when p_source='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role) order by p.full_name,m.user_id),'[]') into people
 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.user_id<>auth.uid() and private.transfer_party_eligible(p_patient,m.user_id,p_source);
 select coalesce(jsonb_agg(jsonb_build_object('id',p.product_id,'name',p.name,'category',p.category,'unit',p.unit,
   'quantityDecimals',p.quantity_decimals,'active',p.is_active,'available',private.stock_quantity(p_patient,p.product_id,p_source)::text) order by p.name,p.product_id),'[]') into products
 from public.care_recipient_products p where p.care_recipient_id=p_patient and (p.is_active or private.stock_quantity(p_patient,p.product_id,p_source)>0);
 select count(*) into origin_total from public.operational_documents d where d.care_recipient_id=p_patient and d.type='ENT' and d.code is not null
   and d.payload->>'destination'=p_source and exists(select 1 from public.document_lines l where l.document_id=d.id and l.accepted_quantity>0);
 select coalesce(jsonb_agg(to_jsonb(x) order by x."createdAt" desc,x.id),'[]') into origins from (
   select d.id,d.code,d.created_at as "createdAt",(select jsonb_agg(l.product_id order by l.product_id) from public.document_lines l where l.document_id=d.id and l.accepted_quantity>0) as "productIds"
   from public.operational_documents d where d.care_recipient_id=p_patient and d.type='ENT' and d.code is not null and d.payload->>'destination'=p_source
     and exists(select 1 from public.document_lines l where l.document_id=d.id and l.accepted_quantity>0)
   order by d.created_at desc,d.id limit 100) x;
 result:=jsonb_build_object('patientId',p_patient,'source',p_source,'destination',case when p_source='FAMILY' then 'CARE_TEAM' else 'FAMILY' end,
   'people',people,'products',products,'origins',origins,'originTotal',origin_total,'actor',auth.uid());
 return result||jsonb_build_object('referenceHash',encode(extensions.digest(result::text,'sha256'),'hex'),'checkedAt',statement_timestamp());
end;$$;
revoke all on function private.transfer_preparation(uuid,text) from public,anon,authenticated,service_role;
create function public.transfer_preparation(p_patient uuid,p_source text) returns jsonb
language sql stable security definer set search_path='' as $$select private.transfer_preparation(p_patient,p_source);$$;
revoke all on function public.transfer_preparation(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.transfer_preparation(uuid,text) to authenticated;

create function private.transfer_facts(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare t public.ent_transfers;d public.operational_documents;begin
 select * into t from public.ent_transfers where document_id=p_id;if not found then return null;end if;
 perform private.require_cap(t.care_recipient_id,'ent.read');select * into strict d from public.operational_documents where id=p_id;
 return jsonb_build_object('state',t.state,'declaration',t.declaration,'agreement',t.agreement,'withdrawal',t.withdrawal,
   'dispatchedAt',t.dispatched_at,'originDocumentId',t.origin_document_id,
   'canAgree',t.state='pending' and auth.uid()=t.counterparty_id and private.transfer_party_eligible(t.care_recipient_id,auth.uid(),d.payload->>'source'),
   'canDispatch',t.state='agreed' and auth.uid()=t.initiator_id and private.can(t.care_recipient_id,'ent.create')
     and private.can(t.care_recipient_id,case when d.payload->>'source'='FAMILY' then 'stock.family.read' else 'stock.team.read' end)
     and private.transfer_party_eligible(t.care_recipient_id,t.counterparty_id,d.payload->>'source') and private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,d.payload->>'source'),
   'canWithdraw',t.state in ('pending','agreed') and (auth.uid()=t.initiator_id or public.can_manage_recipient(t.care_recipient_id) and private.can(t.care_recipient_id,'access.manage')));
end;$$;
revoke all on function private.transfer_facts(uuid) from public,anon,authenticated,service_role;

create function private.guard_transfer_history() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' then raise exception 'transfer history is immutable' using errcode='42501';end if;
 if (new.document_id,new.care_recipient_id,new.initiator_id,new.counterparty_id,new.original_recipient_id,new.origin_document_id,new.declaration,new.created_at)
   is distinct from (old.document_id,old.care_recipient_id,old.initiator_id,old.counterparty_id,old.original_recipient_id,old.origin_document_id,old.declaration,old.created_at)
   or old.agreement is not null and new.agreement is distinct from old.agreement
   or old.withdrawal is not null and new.withdrawal is distinct from old.withdrawal
   or old.dispatched_at is not null and new.dispatched_at is distinct from old.dispatched_at then raise exception 'transfer history is immutable' using errcode='42501';end if;
 if new.state<>old.state and not (old.state='pending' and new.state in ('agreed','declined','withdrawn') or old.state='agreed' and new.state in ('withdrawn','dispatched')) then
   raise exception 'invalid transfer state transition' using errcode='PT409';end if;
 return new;
end;$$;
create trigger transfer_history_immutable before update or delete on public.ent_transfers for each row execute function private.guard_transfer_history();
revoke all on function private.guard_transfer_history() from public,anon,authenticated,service_role;

create function public.create_transfer_declaration(p_patient uuid,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;old private.transfer_commands;context jsonb;x jsonb;p public.care_recipient_products;
 q numeric;v_id uuid:=gen_random_uuid();v_source text;v_recipient uuid;v_counterparty uuid;v_origin uuid;v_reason text;v_result jsonb;v_request jsonb;v_decl jsonb;begin
 perform private.require_cap(p_patient,'ent.read');
 if p_key is null then raise exception 'transfer key required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));perform private.require_cap(p_patient,'ent.read');
 v_request:=jsonb_build_object('action','declare','body',p_body);
 select * into old from private.transfer_commands where actor_id=auth.uid() and key=p_key;
 if found then if old.care_recipient_id<>p_patient or old.request is distinct from v_request then raise exception 'transfer idempotency conflict' using errcode='23505';end if;return old.result;end if;
 perform private.require_cap(p_patient,'ent.create');
 if jsonb_typeof(p_body) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_body) k where k not in ('source','counterpartyId','recipientId','originDocumentId','referenceHash','reason','lines'))
   or jsonb_typeof(p_body->'lines') is distinct from 'array' or jsonb_array_length(p_body->'lines') not between 1 and 1000
   or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(trim(p_body->>'reason'))<3 or private.bal_comment_units(p_body->>'reason')>1000
   or jsonb_typeof(p_body->'referenceHash') is distinct from 'string' or coalesce(p_body->>'referenceHash','')!~'^[0-9a-f]{64}$'
   or jsonb_typeof(p_body->'recipientId') is distinct from 'string' or coalesce(p_body->>'recipientId','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   or jsonb_typeof(p_body->'counterpartyId') is distinct from 'string' or coalesce(p_body->>'counterpartyId','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   or (p_body ? 'originDocumentId' and p_body->'originDocumentId'<>'null'::jsonb and (jsonb_typeof(p_body->'originDocumentId') is distinct from 'string' or coalesce(p_body->>'originDocumentId','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')) then
   raise exception 'invalid transfer declaration' using errcode='22023';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive transfer patient' using errcode='42501';end if;
 v_source:=p_body->>'source';context:=private.transfer_preparation(p_patient,v_source);
 if p_body->>'referenceHash' is distinct from context->>'referenceHash' then raise exception 'stale transfer preparation' using errcode='PT409';end if;
 v_recipient:=(p_body->>'recipientId')::uuid;v_counterparty:=(p_body->>'counterpartyId')::uuid;v_origin:=(p_body->>'originDocumentId')::uuid;v_reason:=trim(p_body->>'reason');
 if v_recipient=auth.uid() or v_counterparty=auth.uid() or not private.transfer_party_eligible(p_patient,v_recipient,v_source) or not private.transfer_party_eligible(p_patient,v_counterparty,v_source) then raise exception 'transfer parties not eligible' using errcode='42501';end if;
 if v_origin is not null and not exists(select 1 from public.operational_documents origin_doc where origin_doc.id=v_origin and origin_doc.care_recipient_id=p_patient and origin_doc.type='ENT' and origin_doc.code is not null and origin_doc.payload->>'destination'=v_source) then raise exception 'transfer origin document unavailable' using errcode='42501';end if;
 if (select count(distinct value->>'productId') from jsonb_array_elements(p_body->'lines'))<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate transfer material' using errcode='22023';end if;
 insert into public.operational_documents(id,care_recipient_id,type,created_by,recipient_id,idempotency_key,payload,status)
 values(v_id,p_patient,'ENT',auth.uid(),v_recipient,p_key,jsonb_build_object('source',v_source,'destination',context->>'destination','recipientId',v_recipient,'recipientReason',v_reason,'notes',v_reason,'lines',p_body->'lines'),'transfer_pending') returning * into d;
 for x in select value from jsonb_array_elements(p_body->'lines') loop
   if jsonb_typeof(x) is distinct from 'object' or exists(select 1 from jsonb_object_keys(x) k where k not in ('productId','quantity'))
     or jsonb_typeof(x->'productId') is distinct from 'string' or jsonb_typeof(x->'quantity') not in ('string','number')
     or coalesce(x->>'quantity','')!~'^[0-9]+(\.[0-9]+)?$' then raise exception 'invalid transfer material' using errcode='22023';end if;
   select * into p from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' for share;
   if not found then raise exception 'transfer material unavailable' using errcode='22023';end if;
   q:=(x->>'quantity')::numeric;
   if q is null or q<=0 or q>1000000000 or q<>round(q,p.quantity_decimals) then raise exception 'invalid transfer quantity' using errcode='22023';end if;
   if q>private.stock_quantity(p_patient,p.product_id,v_source) then raise exception 'insufficient transfer stock' using errcode='P0001';end if;
   if v_origin is not null and not exists(select 1 from public.document_lines where document_id=v_origin and product_id=p.product_id and accepted_quantity>0) then raise exception 'transfer origin material mismatch' using errcode='22023';end if;
   insert into public.document_lines(document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,metadata)
   values(v_id,p_patient,p.product_id,p.name,p.unit,p.category::text,q,jsonb_build_object('inactiveAtDeclaration',not p.is_active));
 end loop;
 v_decl:=jsonb_build_object('actor',jsonb_build_object('id',auth.uid(),'name',(select full_name from public.profiles where id=auth.uid())),
   'counterparty',jsonb_build_object('id',v_counterparty,'name',(select full_name from public.profiles where id=v_counterparty)),
   'recipient',jsonb_build_object('id',v_recipient,'name',(select full_name from public.profiles where id=v_recipient)),
   'source',v_source,'destination',context->>'destination','reason',v_reason,'recordedAt',statement_timestamp(),'referenceHash',context->>'referenceHash');
 insert into public.ent_transfers(document_id,care_recipient_id,initiator_id,counterparty_id,original_recipient_id,origin_document_id,state,declaration)
 values(v_id,p_patient,auth.uid(),v_counterparty,v_recipient,v_origin,'pending',v_decl);
 perform private.record_document_event(v_id,'ent.transfer.declared',p_body,p_key);
 perform private.enqueue_notice(p_patient,v_counterparty,'ent.transfer.declared',v_id);
 perform private.require_cap(p_patient,'ent.read');perform private.require_cap(p_patient,'ent.create');
 perform private.require_cap(p_patient,case when v_source='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
 if not private.transfer_party_eligible(p_patient,v_counterparty,v_source) or not private.transfer_party_eligible(p_patient,v_recipient,v_source) then raise exception 'transfer party authority changed' using errcode='42501';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive transfer patient' using errcode='42501';end if;
 if context->>'referenceHash' is distinct from private.transfer_preparation(p_patient,v_source)->>'referenceHash' then raise exception 'stale transfer preparation' using errcode='PT409';end if;
 v_result:=public.operational_document(v_id);
 insert into private.transfer_commands(actor_id,key,care_recipient_id,document_id,request,result) values(auth.uid(),p_key,p_patient,v_id,v_request,v_result);
 return v_result;
end;$$;
revoke all on function public.create_transfer_declaration(uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_transfer_declaration(uuid,jsonb,uuid) to authenticated;

-- Keep the existing ENT engine and all of its receipt/cancellation safeguards.
alter function public.supply_document_command(uuid,text,jsonb,uuid,integer) rename to fluent_pre_transfer_command;
revoke all on function public.fluent_pre_transfer_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;

create function private.transfer_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.ent_transfers;d public.operational_documents;old private.transfer_commands;v_request jsonb;v_result jsonb;v_actor jsonb;v_reason text;v_source text;begin
 select * into t from public.ent_transfers where document_id=p_id;
 if not found then raise exception 'transfer not found' using errcode='P0002';end if;
 perform private.require_cap(t.care_recipient_id,'ent.read');
 if p_key is null then raise exception 'transfer key required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||t.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 select * into strict t from public.ent_transfers where document_id=p_id for update;
 perform private.require_cap(t.care_recipient_id,'ent.read');
 v_request:=jsonb_build_object('action',p_action,'body',p_body,'version',p_version);
 select * into old from private.transfer_commands where actor_id=auth.uid() and key=p_key;
 if found then if old.document_id<>p_id or old.request is distinct from v_request then raise exception 'transfer idempotency conflict' using errcode='23505';end if;return old.result;end if;
 if p_action is null or p_action not in ('agree','decline','withdraw','dispatch') or jsonb_typeof(p_body) is distinct from 'object'
   or exists(select 1 from jsonb_object_keys(p_body) k where k<>'reason' or p_action='dispatch') then raise exception 'invalid transfer command' using errcode='22023';end if;
 if p_version is null or p_version<>d.version then raise exception 'stale transfer version' using errcode='PT409';end if;
 if not exists(select 1 from public.care_recipients where id=t.care_recipient_id and is_active) then raise exception 'inactive transfer patient' using errcode='42501';end if;
 v_source:=d.payload->>'source';
 v_actor:=jsonb_build_object('id',auth.uid(),'name',(select full_name from public.profiles where id=auth.uid()));
 if p_action<>'dispatch' then
   if jsonb_typeof(p_body->'reason') is distinct from 'string' or length(trim(p_body->>'reason'))<3 or private.bal_comment_units(p_body->>'reason')>1000 then raise exception 'transfer own reason required' using errcode='22023';end if;
   v_reason:=trim(p_body->>'reason');
 end if;
 if p_action in ('agree','decline') then
   if auth.uid()<>t.counterparty_id or not private.transfer_party_eligible(t.care_recipient_id,auth.uid(),v_source) then raise exception 'only transfer counterparty may decide' using errcode='42501';end if;
   if t.state<>'pending' then raise exception 'transfer decision already settled' using errcode='PT409';end if;
   if p_action='agree' and (not private.member_can(t.care_recipient_id,t.initiator_id,'ent.create') or not private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,v_source)) then raise exception 'transfer party authority changed' using errcode='42501';end if;
   update public.ent_transfers set state=case when p_action='agree' then 'agreed' else 'declined' end,
     agreement=jsonb_build_object('actor',v_actor,'reason',v_reason,'decision',p_action,'recordedAt',statement_timestamp(),'documentVersion',d.version) where document_id=p_id;
   update public.operational_documents set status=case when p_action='agree' then 'transfer_ready' else 'rejected' end,version=version+1 where id=p_id;
   perform private.record_document_event(p_id,case when p_action='agree' then 'ent.transfer.agreed' else 'ent.transfer.declined' end,p_body,p_key);
   perform private.enqueue_notice(t.care_recipient_id,t.initiator_id,case when p_action='agree' then 'ent.transfer.agreed' else 'ent.transfer.declined' end,p_id);
 elsif p_action='withdraw' then
   if auth.uid()<>t.initiator_id and not(public.can_manage_recipient(t.care_recipient_id) and private.can(t.care_recipient_id,'access.manage')) then raise exception 'transfer withdrawal authorization required' using errcode='42501';end if;
   if t.state not in ('pending','agreed') then raise exception 'transfer already dispatched or closed' using errcode='PT409';end if;
   update public.ent_transfers set state='withdrawn',withdrawal=jsonb_build_object('actor',v_actor,'reason',v_reason,'recordedAt',statement_timestamp(),
     'kind',case when auth.uid()=t.initiator_id then 'initiator_withdrawal' else 'administrative_close' end) where document_id=p_id;
   update public.operational_documents set status='cancelled',version=version+1 where id=p_id;
   perform private.record_document_event(p_id,'ent.transfer.withdrawn',p_body,p_key);
   perform private.enqueue_notice(t.care_recipient_id,t.counterparty_id,'ent.transfer.withdrawn',p_id);
 else
   if auth.uid()<>t.initiator_id then raise exception 'only transfer initiator may dispatch' using errcode='42501';end if;
   perform private.require_cap(t.care_recipient_id,'ent.create');
   perform private.require_cap(t.care_recipient_id,case when v_source='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
   if t.state<>'agreed' then raise exception 'transfer agreement required before dispatch' using errcode='PT409';end if;
   if not private.transfer_party_eligible(t.care_recipient_id,t.counterparty_id,v_source) or not private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,v_source) then raise exception 'transfer party authority changed' using errcode='42501';end if;
   update public.ent_transfers set state='dispatched',dispatched_at=statement_timestamp() where document_id=p_id;
   update public.operational_documents set status='draft' where id=p_id;
   perform public.fluent_pre_transfer_command(p_id,'submit','{}',p_key,p_version);
 end if;
 -- These checks follow document events, profile FKs and the native movements.
 perform private.require_cap(t.care_recipient_id,'ent.read');
 if p_action in ('agree','decline') and (auth.uid()<>t.counterparty_id or not private.transfer_party_eligible(t.care_recipient_id,auth.uid(),v_source)) then raise exception 'transfer counterparty authority changed' using errcode='42501';end if;
 if p_action='agree' and (not private.member_can(t.care_recipient_id,t.initiator_id,'ent.create') or not private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,v_source)) then raise exception 'transfer party authority changed' using errcode='42501';end if;
 if p_action='withdraw' and auth.uid()<>t.initiator_id and not(public.can_manage_recipient(t.care_recipient_id) and private.can(t.care_recipient_id,'access.manage')) then raise exception 'transfer withdrawal authority changed' using errcode='42501';end if;
 if p_action='dispatch' then
   perform private.require_cap(t.care_recipient_id,'ent.create');
   perform private.require_cap(t.care_recipient_id,case when v_source='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
   if not private.transfer_party_eligible(t.care_recipient_id,t.counterparty_id,v_source) or not private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,v_source) then raise exception 'transfer party authority changed' using errcode='42501';end if;
 end if;
 if not exists(select 1 from public.care_recipients where id=t.care_recipient_id and is_active) then raise exception 'inactive transfer patient' using errcode='42501';end if;
 v_result:=public.operational_document(p_id);
 insert into private.transfer_commands(actor_id,key,care_recipient_id,document_id,request,result) values(auth.uid(),p_key,t.care_recipient_id,p_id,v_request,v_result);
 return v_result;
end;$$;
revoke all on function private.transfer_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
create function public.transfer_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language sql security definer set search_path='' as $$select private.transfer_command(p_id,p_action,p_body,p_key,p_version);$$;
revoke all on function public.transfer_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.transfer_command(uuid,text,jsonb,uuid,integer) to authenticated;

create function public.supply_document_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$declare t public.ent_transfers;begin
 select * into t from public.ent_transfers where document_id=p_id;
 if found then
   perform private.require_cap(t.care_recipient_id,'ent.read');
   if p_action='submit' then return private.transfer_command(p_id,'dispatch',p_body,p_key,p_version);end if;
   if t.state in ('pending','agreed') and p_action='cancel' then return private.transfer_command(p_id,'withdraw',p_body,p_key,p_version);end if;
   if t.state<>'dispatched' then raise exception 'transfer not dispatched; use its declaration decision' using errcode='PT409';end if;
   if p_action='reassign' then raise exception 'bilateral transfer recipient is frozen; cancel and declare a new transfer' using errcode='22023';end if;
 end if;
 return public.fluent_pre_transfer_command(p_id,p_action,p_body,p_key,p_version);
end;$$;
revoke all on function public.supply_document_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.supply_document_command(uuid,text,jsonb,uuid,integer) to authenticated;

-- The counterparty's decision is an actionable task before pagination. It is
-- not a personal receipt task for the separately designated recipient.
alter function private.delivery_task(uuid) rename to pre_transfer_delivery_task;
revoke all on function private.pre_transfer_delivery_task(uuid) from public,anon,authenticated,service_role;
create function private.delivery_task(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare t public.ent_transfers;facts jsonb;begin
 select * into t from public.ent_transfers where document_id=p_id;
 if found then
   if not private.can(t.care_recipient_id,'ent.read') then return null;end if;
   facts:=private.transfer_facts(p_id);
   if (facts->>'canAgree')::boolean then return jsonb_build_object('code','transfer_decision','label','Decidir concordância da transferência');end if;
   if (facts->>'canDispatch')::boolean then return jsonb_build_object('code','transfer_dispatch','label','Expedir transferência com concordância registrada');end if;
 end if;
 return private.pre_transfer_delivery_task(p_id);
end;$$;
revoke all on function private.delivery_task(uuid) from public,anon,authenticated,service_role;

do $$declare d text;needle text;begin
 d:=replace(pg_get_functiondef('public.delivery_task_list(uuid,text,text,integer,integer)'::regprocedure),E'\r\n',E'\n');
 needle:='''tasks'',''pending_receipt''';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected transfer task filters';end if;
 d:=replace(d,needle,'''tasks'',''transfer_pending'',''transfer_ready'',''pending_receipt''');
 needle:='p_scope=''team'' or d.recipient_id=auth.uid()';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected transfer own scope';end if;
 d:=replace(d,needle,'p_scope=''team'' or d.recipient_id=auth.uid() or exists(select 1 from public.ent_transfers t where t.document_id=d.id and auth.uid() in (t.initiator_id,t.counterparty_id))');
 execute d;
end;$$;

do $$declare d text;needle text;begin
 d:=replace(pg_get_functiondef('public.operational_document(uuid)'::regprocedure),E'\r\n',E'\n');
 needle:='return to_jsonb(d)||';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected transfer document projection';end if;
 d:=replace(d,needle,'return to_jsonb(d)||case when d.type=''ENT'' and exists(select 1 from public.ent_transfers where document_id=p_id) then jsonb_build_object(''transfer'',private.transfer_facts(p_id)) else ''{}''::jsonb end||');execute d;
 d:=replace(pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure),E'\r\n',E'\n');
 needle:=' h:=encode(extensions.digest(s::text,''sha256''),''hex'');';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected transfer snapshot boundary';end if;
 d:=replace(d,needle,' if d.type=''ENT'' and exists(select 1 from public.ent_transfers where document_id=p_id) then s:=s||jsonb_build_object(''transfer'',private.transfer_facts(p_id)-array[''canAgree'',''canDispatch'',''canWithdraw'']);end if;'||E'\n'||needle);execute d;
end;$$;
