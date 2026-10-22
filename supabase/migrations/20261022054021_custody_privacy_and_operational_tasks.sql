-- Raw ledger columns cannot reveal family before/after balances to team-only readers.
revoke select on public.stock_movements from authenticated;
grant select(id,care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,destination_location,justification,created_at,reference_type,reference_id,movement_revision,idempotency_key,payload_hash,extraordinary_confirmed) on public.stock_movements to authenticated;
create function public.stock_history(p_patient uuid,p_product text default null,p_from timestamptz default null,p_to timestamptz default null,p_location text default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_size is null or p_size not between 1 and 100 or p_location is not null and p_location not in ('FAMILY','CARE_TEAM','TRANSIT') then raise exception 'invalid history filter';end if;
 return (with scoped as(select * from public.stock_movements where care_recipient_id=p_patient
 and (family or team and (source_location in ('CARE_TEAM','TRANSIT') or destination_location in ('CARE_TEAM','TRANSIT')))
 and (p_product is null or product_id=p_product) and (p_from is null or created_at>=p_from) and (p_to is null or created_at<p_to)
 and (p_location is null or source_location=p_location or destination_location=p_location)),
 paged as(select * from scoped order by created_at desc,id desc limit p_size offset (p_page-1)*p_size)
 select jsonb_build_object('total',(select count(*) from scoped),'data',coalesce((select jsonb_agg(to_jsonb(x)-'payload_hash'-'idempotency_key' order by x.created_at desc,x.id desc) from (
 select s.id,s.product_id,s.quantity::text,s.movement_type,s.source_location,s.destination_location,s.justification,s.created_at,s.performed_by,s.reference_type,s.reference_id,
 case when family or s.source_location<>'FAMILY' then s.source_balance_before end source_balance_before,
 case when family or s.source_location<>'FAMILY' then s.source_balance_after end source_balance_after,
 case when family or s.destination_location<>'FAMILY' then s.destination_balance_before end destination_balance_before,
 case when family or s.destination_location<>'FAMILY' then s.destination_balance_after end destination_balance_after
 from paged s) x),'[]')));
end;$$;
create function public.operational_tasks(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s jsonb;due date;today date:=(now() at time zone 'America/Sao_Paulo')::date;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient permission required' using errcode='42501';end if;
 select settings into s from public.patient_settings where care_recipient_id=p_patient;
 if s->>'balDay' is not null then due:=today-((extract(dow from today)::integer-(s->>'balDay')::integer+7)%7);end if;
 return jsonb_build_object('requests',(select count(*) from public.requisitions r where care_recipient_id=p_patient and status not in ('cancelled','draft') and exists(select 1 from public.requisition_items i where requisition_id=r.id and not exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0))),
 'balDay',s->'balDay','balDue',due,'balOverdue',due is not null and not exists(select 1 from public.operational_documents where care_recipient_id=p_patient and type='BAL' and status='approved' and (created_at at time zone 'America/Sao_Paulo')::date>=due),
 'drafts',(select count(*) from public.operational_documents where care_recipient_id=p_patient and status='draft' and created_by=auth.uid()),
 'consumptionPending',(select count(*) from public.consumption_reports where care_recipient_id=p_patient and status='reported' and case when location='FAMILY' then private.can(p_patient,'stock.family.manage') else private.can(p_patient,'consumption.confirm') end));
end;$$;
create or replace function public.report_extraordinary_consumption(p_patient uuid,p_kind text,p_location text,p_text text,p_lines jsonb,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$declare v public.consumption_reports;x jsonb;canonical jsonb:='[]';c public.care_recipient_products;q numeric;begin
 perform private.require_cap(p_patient,'consumption.report');
 if p_kind not in ('consumption','shortage') or p_location not in ('FAMILY','CARE_TEAM') or length(trim(p_text)) not between 3 and 2000 or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)>100 or p_key is null then raise exception 'invalid consumption report';end if;
 if p_location='FAMILY' and public.recipient_role(p_patient) not in ('admin','family') then raise exception 'family scope required' using errcode='42501';end if;
 if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'invalid report lines';end if;
 if (select count(distinct z->>'productId') from jsonb_array_elements(p_lines) z)<>jsonb_array_length(p_lines) then raise exception 'duplicate report product';end if;
 for x in select value from jsonb_array_elements(p_lines) loop
 select * into c from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' and is_active;
 q:=(x->>'quantity')::numeric;
 if not found or q is null or q<=0 or q>1000000000 or q<>round(q,c.quantity_decimals) or x ? 'unit' and x->>'unit'<>c.unit then raise exception 'invalid structured consumption';end if;
 canonical:=canonical||jsonb_build_array(jsonb_build_object('productId',c.product_id,'quantity',q::text,'unit',c.unit));
 end loop;
 p_lines:=canonical;
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 select * into v from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;
 if found then if v.care_recipient_id<>p_patient or v.kind<>p_kind or v.location<>p_location or v.body<>p_text or v.lines<>p_lines then raise exception 'idempotency conflict' using errcode='23505';end if;return v.id;end if;
 insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) values(p_patient,auth.uid(),p_kind,p_location,p_text,p_lines,p_key) returning * into v;
 return v.id;
end;$$;

grant execute on function public.stock_history(uuid,text,timestamptz,timestamptz,text,integer,integer),public.operational_tasks(uuid) to authenticated;
-- Notifications remain unreadable after the underlying document capability is revoked.
do $$declare p record;begin for p in select policyname from pg_policies where schemaname='public' and tablename='requisition_notifications' loop execute format('drop policy %I on public.requisition_notifications',p.policyname);end loop;end;$$;
create policy authorized_notification_read on public.requisition_notifications for select to authenticated using(
 (recipient_user_id=auth.uid() or public.can_manage_recipient(care_recipient_id)) and
 case when document_id is not null then exists(select 1 from public.operational_documents d where d.id=document_id and private.can(care_recipient_id,lower(d.type)||'.read'))
 else public.can_access_recipient(care_recipient_id) end);

