-- Preserve old values without asserting that an automatic zero was observed.
alter table public.requisition_items add column stock_observation text not null default 'legacy_unclassified';
alter table public.requisition_items alter column current_stock drop not null;
alter table public.requisition_items add constraint requisition_stock_observation_check check (
 stock_observation='legacy_unclassified'
 or stock_observation='observed' and current_stock is not null
 or stock_observation in ('unknown','unfilled') and current_stock is null
);

create function private.requisition_stock_observation(p_line jsonb)
returns text language plpgsql immutable set search_path='' as $$
declare mode text;
begin
 if p_line ? 'stockObservation' and (jsonb_typeof(p_line->'stockObservation') is distinct from 'string' or p_line->>'stockObservation' not in ('observed','unknown','unfilled')) then raise exception 'invalid stock observation mode' using errcode='22023';end if;
 mode:=coalesce(p_line->>'stockObservation',case when p_line->>'currentStock' is null then 'unfilled' else 'legacy_unclassified' end);
 if (mode in ('observed','legacy_unclassified')) is distinct from (p_line->>'currentStock' is not null)
 then raise exception 'invalid stock observation' using errcode='22023';end if;
 return mode;
end;$$;
create function private.validate_requisition_observation(p_line jsonb,p_decimals integer)
returns void language plpgsql security definer set search_path='' as $$
declare mode text;q numeric;
begin
 mode:=private.requisition_stock_observation(p_line);
 if mode in ('observed','legacy_unclassified') then
  q:=(p_line->>'currentStock')::numeric;
  perform private.require_exact_quantity(q,p_decimals,true);
  if q>100000 then raise exception 'invalid observed stock quantity' using errcode='22023';end if;
 end if;
end;$$;
revoke all on function private.requisition_stock_observation(jsonb),private.validate_requisition_observation(jsonb,integer) from public,anon,authenticated,service_role;

create or replace function public.guard_requisition_item_stock()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.stock_observation='legacy_unclassified' and new.current_stock is null and not coalesce((select is_historical from public.requisitions where id=new.requisition_id),false)
 then raise exception 'legacy operational stock requires its original value' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function public.guard_requisition_item_stock() from public,anon,authenticated,service_role;

create function private.requisition_legacy_intent(p_intent jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_set(jsonb_set(p_intent,'{lines}',coalesce((select jsonb_agg(x.value-'stockObservation' order by x.ord) from jsonb_array_elements(p_intent->'lines') with ordinality x(value,ord)),'[]'::jsonb)),
 '{extraItems}',coalesce((select jsonb_agg(x.value-'stockObservation' order by x.ord) from jsonb_array_elements(p_intent->'extraItems') with ordinality x(value,ord)),'[]'::jsonb));
$$;
revoke all on function private.requisition_legacy_intent(jsonb) from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.submit_requisition(p_care_recipient_id uuid, p_idempotency_key uuid, p_payload_hash text, p_lines jsonb, p_extra_items jsonb, p_observations jsonb)
 RETURNS TABLE(requisition_id uuid, protocol text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.requisitions;d public.operational_documents;intent jsonb;x jsonb;p public.care_recipient_products;q numeric;reason text;
begin
 perform private.require_cap(p_care_recipient_id,'req.create');
 if p_idempotency_key is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_typeof(p_extra_items) is distinct from 'array' or jsonb_typeof(p_observations) is distinct from 'array'
 or jsonb_array_length(p_lines)>1000 or jsonb_array_length(p_extra_items)>20 or jsonb_array_length(p_observations)>50 or jsonb_array_length(p_lines)+jsonb_array_length(p_extra_items)=0 then raise exception 'invalid requisition payload';end if;
 if exists(select 1 from jsonb_array_elements(p_lines) z group by z->>'productId' having count(*)>1) then raise exception 'duplicate product';end if;
 if exists(select 1 from jsonb_array_elements(p_observations) z where jsonb_typeof(z) is distinct from 'string' or length(trim(z#>>'{}')) not between 1 and 1000) then raise exception 'invalid observation';end if;
 intent:=jsonb_build_object('careRecipientId',p_care_recipient_id,
 'lines',coalesce((select jsonb_agg(jsonb_build_object('productId',z->>'productId','stockObservation',private.requisition_stock_observation(z),'currentStock',(z->>'currentStock')::numeric,'urgent',(z->>'urgent')::boolean,'repeatReason',nullif(trim(z->>'repeatReason'),'')) order by z->>'productId') from jsonb_array_elements(p_lines) z),'[]'),
 'extraItems',coalesce((select jsonb_agg(jsonb_build_object('customName',trim(z->>'customName'),'stockObservation',private.requisition_stock_observation(z),'currentStock',(z->>'currentStock')::numeric,'urgent',(z->>'urgent')::boolean) order by trim(z->>'customName'),(z->>'currentStock')::numeric,(z->>'urgent')::boolean) from jsonb_array_elements(p_extra_items) z),'[]'),
 'observations',coalesce((select jsonb_agg(trim(value) order by trim(value)) from jsonb_array_elements_text(p_observations)),'[]'));
 perform pg_advisory_xact_lock(hashtextextended('requisition-patient:'||p_care_recipient_id,0));
 perform private.require_cap(p_care_recipient_id,'req.create');
 select * into r from public.requisitions where created_by=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
 if r.care_recipient_id is distinct from p_care_recipient_id or (r.request_intent is distinct from intent and not (
  not exists(select 1 from jsonb_array_elements(p_lines||p_extra_items) line where line ? 'stockObservation')
  and private.requisition_legacy_intent(intent) is not distinct from r.request_intent
 )) then raise exception 'idempotency conflict' using errcode='23505';end if;
 return query select r.id,r.protocol,r.created_at;return;end if;
 for x in select value from jsonb_array_elements(p_lines) loop
 select * into p from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=x->>'productId' and is_active;
 q:=(x->>'currentStock')::numeric;reason:=nullif(trim(x->>'repeatReason'),'');
 if not found or jsonb_typeof(x->'urgent') is distinct from 'boolean' or length(coalesce(reason,''))>1000 then raise exception 'invalid requisition line';end if;
 perform private.validate_requisition_observation(x,p.quantity_decimals);
 if exists(select 1 from public.requisition_items i join public.requisitions oldr on oldr.id=i.requisition_id where i.care_recipient_id=p_care_recipient_id and private.effective_requisition_product(i.id)=p.product_id and oldr.status<>'cancelled'
 and not exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents od on od.id=l.document_id where k.requisition_item_id=i.id and od.type='ENT' and od.status<>'cancelled' and l.accepted_quantity>0))
 and length(coalesce(reason,''))<3 then raise exception 'duplicate review required' using errcode='P0001';end if;
 end loop;
 for x in select value from jsonb_array_elements(p_extra_items) loop
 q:=(x->>'currentStock')::numeric;
 if length(trim(coalesce(x->>'customName',''))) not between 1 and 200 or jsonb_typeof(x->'urgent') is distinct from 'boolean' then raise exception 'invalid extra';end if;
 perform private.validate_requisition_observation(x,6);
 if exists(select 1 from public.care_recipient_products c cross join lateral unnest(array_append(c.aliases,c.name)) a where c.care_recipient_id=p_care_recipient_id and c.is_active and public.unaccent(lower(trim(a)))=public.unaccent(lower(trim(x->>'customName')))) then raise exception 'custom item matches patient catalogue';end if;
 end loop;
 insert into public.operational_documents(care_recipient_id,type,created_by,status,idempotency_key,payload)
 values(p_care_recipient_id,'REQ',auth.uid(),'submitted',p_idempotency_key,jsonb_build_object('intent',intent,'requesterName',(select full_name from public.profiles where id=auth.uid()),'patientName',(select display_name from public.care_recipients where id=p_care_recipient_id))) returning * into d;
 perform private.emit_document(d.id);select * into d from public.operational_documents where id=d.id;
 insert into public.requisitions(id,protocol,code,created_by,care_recipient_id,status,idempotency_key,payload_hash,request_intent,requester_name_snapshot,recipient_name_snapshot)
 values(d.id,d.protocol,d.code,auth.uid(),p_care_recipient_id,'submitted',p_idempotency_key,encode(extensions.digest(intent::text,'sha256'),'hex'),intent,
 (select full_name from public.profiles where id=auth.uid()),(select display_name from public.care_recipients where id=p_care_recipient_id)) returning * into r;
 insert into public.requisition_items(requisition_id,product_id,current_stock,stock_observation,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)
 select r.id,c.product_id,(z->>'currentStock')::numeric,private.requisition_stock_observation(z),(z->>'urgent')::boolean,c.name,c.category::text,c.unit,'persisted' from jsonb_array_elements(p_lines) z join public.care_recipient_products c on c.care_recipient_id=p_care_recipient_id and c.product_id=z->>'productId';
 insert into public.requisition_items(requisition_id,custom_name,current_stock,stock_observation,urgent,product_name_snapshot,snapshot_source)
 select r.id,trim(z->>'customName'),(z->>'currentStock')::numeric,private.requisition_stock_observation(z),(z->>'urgent')::boolean,trim(z->>'customName'),'persisted' from jsonb_array_elements(p_extra_items) z;
 insert into public.requisition_observations(requisition_id,created_by,body) select r.id,auth.uid(),trim(value) from jsonb_array_elements_text(p_observations);
 perform private.record_document_event(d.id,'req.issued',intent,p_idempotency_key);
 return query select r.id,r.protocol,r.created_at;
end;$function$;
