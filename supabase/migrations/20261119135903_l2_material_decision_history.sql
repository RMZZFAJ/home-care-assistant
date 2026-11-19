-- The original read remains the source for balances, comparisons and linked fichas.
alter function public.document_material_context(uuid,uuid,text,integer) set schema private;
alter function private.document_material_context(uuid,uuid,text,integer) rename to document_material_overview;
revoke all on function private.document_material_overview(uuid,uuid,text,integer)
  from public,anon,authenticated,service_role;

create function private.material_decision_history(
  p_patient uuid,p_product text,p_line uuid,p_page integer
) returns jsonb
language sql stable set search_path='' as $$
  with access as materialized (
    select private.can(p_patient,'req.read') req,private.can(p_patient,'com.read') com,
      private.can(p_patient,'ent.read') ent,private.can(p_patient,'bal.read') bal,
      private.can(p_patient,'stock.family.read') family_stock,private.can(p_patient,'stock.team.read') team_stock,
      coalesce(public.recipient_role(p_patient)::text,'') in ('admin','family') family_arrivals
  ), readable_documents as not materialized (
    select d.id,d.type,d.kind,d.code,d.status,d.created_at
    from public.operational_documents d cross join access a
    where d.care_recipient_id=p_patient and d.status<>'draft'
      and case d.type when 'REQ' then a.req when 'COM' then a.com when 'ENT' then a.ent when 'BAL' then a.bal else false end
  ), lines as materialized (
    select i.id,i.requisition_id document_id,i.unit_snapshot unit
    from public.requisition_items i
    join readable_documents d on d.id=i.requisition_id and d.type='REQ'
    left join public.requisition_item_resolutions r on r.requisition_item_id=i.id
    where i.care_recipient_id=p_patient and (i.id=p_line or coalesce(i.product_id,r.product_id)=p_product)
    union all
    select l.id,l.document_id,l.unit_snapshot
    from public.document_lines l
    join readable_documents d on d.id=l.document_id
    where l.care_recipient_id=p_patient and (l.id=p_line or l.product_id=p_product)
  ), decisions as (
    select e.id::text id,e.created_at,e.action type,
      coalesce(nullif(e.body->>'actorName',''),actor.full_name) author,
      case e.action
        when 'req.issued' then s.snapshot->>'current_stock'
        when 'com.arrival_coverage' then selected.line->>'planningQuantity'
        when 'ent.receive' then s.snapshot->>'accepted_quantity'
        else selected.line->>'quantity'
      end quantity,
      l.unit,case when e.action='ent.receive' then selected.line->>'reviewReason'
                  else e.body->'event'->>'reason' end reason,
      case when e.action='req.issued' then s.snapshot->>'stock_observation'
           when e.action='ent.resolve' then e.body->'event'->>'resolution' end detail,
      e.document_id,null::uuid arrival_id
    from lines l
    join public.document_events e on e.document_id=l.document_id and e.care_recipient_id=p_patient
      and e.action in (
        'req.issued','req.item_resolved','com.approve','com.purchase','com.receive','com.validate_receipt',
        'com.reject_receipt','com.request_receipt_correction','com.resubmit_receipt','com.arrival_coverage',
        'ent.receive','ent.resolve','ent.request_fulfillment_review'
      )
    left join public.profiles actor on actor.id=e.actor_id
    left join lateral (
      select snap.value snapshot from jsonb_array_elements(
        case when jsonb_typeof(e.body->'lines')='array' then e.body->'lines' else '[]'::jsonb end
      ) snap where snap.value->>'id'=l.id::text limit 1
    ) s on e.action in ('req.issued','ent.receive')
    left join lateral (
      select r.value receipt from jsonb_array_elements(
        case when jsonb_typeof(e.body->'purchaseReceipts')='array' then e.body->'purchaseReceipts' else '[]'::jsonb end
      ) r where r.value->>'id'=e.body->'event'->>'receiptId' limit 1
    ) r on e.action in ('com.validate_receipt','com.reject_receipt','com.request_receipt_correction')
    left join lateral (
      select item.value line from jsonb_array_elements(
        case e.action
          when 'com.arrival_coverage' then
            case when jsonb_typeof(e.body->'event'->'materials')='array' then e.body->'event'->'materials' else jsonb_build_array(e.body->'event') end
          when 'com.validate_receipt' then coalesce(nullif(r.receipt->'lines','null'),nullif(e.body->'purchaseReceipt'->'lines','null'),'[]'::jsonb)
          when 'com.reject_receipt' then coalesce(nullif(r.receipt->'lines','null'),nullif(e.body->'purchaseReceipt'->'lines','null'),'[]'::jsonb)
          when 'com.request_receipt_correction' then coalesce(nullif(r.receipt->'lines','null'),'[]'::jsonb)
          when 'ent.receive' then nullif(e.body->'event'->'countedReceipt'->'lines','null')
          when 'ent.resolve' then jsonb_build_array(e.body->'event')
          else case when jsonb_typeof(e.body->'event'->'lines')='array' then e.body->'event'->'lines' else '[]'::jsonb end
        end
      ) item where item.value->>'lineId'=l.id::text limit 1
    ) selected on true
    where selected.line is not null
      or e.action in ('req.issued','ent.receive') and s.snapshot is not null
      or e.action='req.item_resolved' and e.body->'event'->>'itemId'=l.id::text
      or e.action='ent.request_fulfillment_review' and e.body->'event'->>'lineId'=l.id::text

    union all
    select review.id::text,review.recorded_at,'ent.fulfillment_reviewed',
      review.actor_name,trim_scale(review.accepted_quantity)::text,l.unit,review.reason,review.decision,
      review.document_id,null::uuid
    from lines l
    join private.requisition_fulfillment_reviews review on review.line_id=l.id and review.document_id=l.document_id

    union all
    select h.arrival_id::text||':'||h.version::text,h.occurred_at,
      case h.state
        when 'approved' then 'arrival.approved'
        when 'rejected' then 'arrival.rejected'
        when 'correction_requested' then 'arrival.correction'
        when 'pending' then case when h.version=1 then 'arrival.reported' else 'arrival.resubmitted' end
      end,
      h.actor_name,item.value->>'quantity',item.value->>'unit',h.reason,null,null::uuid,h.arrival_id
    from access a
    join private.unlinked_arrivals arr on arr.care_recipient_id=p_patient
    join private.unlinked_arrival_events h on h.arrival_id=arr.id
    cross join lateral jsonb_array_elements(h.lines) item
    where a.com and a.family_arrivals and item.value->>'productId'=p_product
  ), records as (
    select d.id,d.created_at,'decision' variety,d.type,d.author,d.quantity,d.unit,d.reason,d.detail,
      null::text source,null::text destination,null::text source_after,null::text destination_after,
      d.document_id,d.arrival_id
    from decisions d
    union all
    select m.id::text,m.created_at,'movement',
      case when m.reference_type='consumption' then 'consumption' else m.movement_type::text end,
      actor.full_name,trim_scale(m.quantity)::text,null,null,null,
      m.source_location::text,m.destination_location::text,
      case when a.family_stock or m.source_location<>'FAMILY' then trim_scale(m.source_balance_after)::text end,
      case when a.family_stock or m.destination_location<>'FAMILY' then trim_scale(m.destination_balance_after)::text end,
      coalesce(receipt.document_id,regularization.document_id,m.reference_id),
      case when m.reference_type='unlinked_arrival' then m.reference_id end
    from public.stock_movements m cross join access a
    left join public.profiles actor on actor.id=m.performed_by
    left join public.purchase_receipts receipt on m.reference_type='purchase_receipt' and receipt.id=m.reference_id
    left join public.delivery_regularizations regularization on m.reference_type='delivery_regularization'
      and regularization.id=m.reference_id and regularization.care_recipient_id=p_patient
    where m.care_recipient_id=p_patient and m.product_id=p_product
      -- Same custody boundary as stock_history
      and (a.family_stock or a.team_stock and (m.source_location in ('CARE_TEAM','TRANSIT') or m.destination_location in ('CARE_TEAM','TRANSIT')))
  ), page as (
    select * from records order by created_at desc,id desc limit 20 offset ((p_page-1)*20)
  )
  select jsonb_build_object('available',(select family_stock or team_stock from access),
    'total',(select count(*) from records),
    'rows',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'kind',r.variety,'type',r.type,'createdAt',r.created_at,'author',r.author,
      'quantity',case when r.quantity ~ '^-?[0-9]+([.][0-9]+)?$' then r.quantity end,
      'unit',r.unit,'reason',r.reason,'detail',r.detail,
      'source',r.source,'destination',r.destination,'sourceAfter',r.source_after,'destinationAfter',r.destination_after,
      'document',case when d.id is not null then jsonb_build_object('id',d.id,'code',d.code,'type',d.type,
        'kind',d.kind,'status',d.status,'createdAt',d.created_at) end,
      'arrival',case when ar.id is not null then jsonb_build_object('id',ar.id,'code',ar.code) end
    ) order by r.created_at desc,r.id desc)
    from page r
    left join readable_documents d on d.id=r.document_id
    left join private.unlinked_arrivals ar on ar.id=r.arrival_id and ar.care_recipient_id=p_patient
      and (select com and family_arrivals from access)
    ),'[]'::jsonb));
$$;
revoke all on function private.material_decision_history(uuid,text,uuid,integer)
  from public,anon,authenticated,service_role;

create function public.document_material_context(
  p_document uuid,p_line uuid default null,p_section text default 'stock',p_page integer default 1,
  p_include_decisions boolean default false
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  d public.operational_documents;
  product text;
begin
  if p_line is null or p_section is distinct from 'history' or p_include_decisions is not true then
    return private.document_material_overview(p_document,p_line,p_section,p_page);
  end if;
  if p_page is null or p_page not between 1 and 1000000 then
    raise exception 'invalid material consultation' using errcode='22023';
  end if;
  select * into d from public.operational_documents where id=p_document;
  if auth.uid() is null or not found then
    raise exception 'material unavailable' using errcode='42501';
  end if;
  perform private.require_cap(d.care_recipient_id,lower(d.type::text)||'.read');
  if d.status='draft' and d.created_by is distinct from auth.uid()
    and not public.can_manage_recipient(d.care_recipient_id) then
    raise exception 'material unavailable' using errcode='42501';
  end if;
  select l.product_id into product
    from private.document_material_lines(d.id,d.type::text) l where l.line_id=p_line;
  if not found then raise exception 'material unavailable' using errcode='42501'; end if;
  return jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id,'lineId',p_line,
    'productId',product,'section','history','page',p_page)
    ||private.material_decision_history(d.care_recipient_id,product,p_line,p_page);
end;
$$;
revoke all on function public.document_material_context(uuid,uuid,text,integer,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.document_material_context(uuid,uuid,text,integer,boolean) to authenticated;
notify pgrst,'reload schema';
