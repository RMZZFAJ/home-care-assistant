-- Keep the confirmed position, open purchase quantities and transfer facts
-- separate. All reads are projected under the caller's custody capabilities.
create or replace function public.stock_overview(p_patient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  family boolean := coalesce(private.can(p_patient,'stock.family.read'),false);
  team boolean := coalesce(private.can(p_patient,'stock.team.read'),false);
  purchases boolean := family and coalesce(private.can(p_patient,'com.read'),false);
  deliveries boolean := coalesce(private.can(p_patient,'ent.read'),false);
begin
  if not(family or team) then raise exception 'stock permission required' using errcode='42501'; end if;

  return (
    with updated as (
      select movement.product_id,
        max(movement.created_at) filter(where family and 'FAMILY' in (movement.source_location,movement.destination_location)) as family_at,
        max(movement.created_at) filter(where team and 'CARE_TEAM' in (movement.source_location,movement.destination_location)) as team_at
      from public.stock_movements movement
      where movement.care_recipient_id=p_patient
      group by movement.product_id
    ), transfer as (
      select line.product_id, document.payload->>'destination' as location,
        sum(greatest(line.quantity-line.accepted_quantity-line.reconciled_quantity,0)) as pending,
        sum(greatest(line.quantity-line.accepted_quantity-line.reconciled_quantity,0))
          filter (where document.status in ('disputed','cancellation_pending')) as disputed
      from public.operational_documents document
      join public.document_lines line on line.document_id=document.id
      where deliveries and document.care_recipient_id=p_patient and document.type='ENT'
        and document.status in ('pending_receipt','disputed','cancellation_pending')
        and ((family and document.payload->>'destination'='FAMILY') or (team and document.payload->>'destination'='CARE_TEAM'))
      group by line.product_id, document.payload->>'destination'
    ), purchase_facts as (
      select line.product_id,
        sum((fact->>'remainingExpectation')::numeric) as expected,
        sum((fact->>'unarrivedQuantity')::numeric) as awaiting,
        sum((fact->>'pendingValidationQuantity')::numeric) as pending_validation
      from public.operational_documents document
      cross join lateral jsonb_array_elements(private.purchase_progress(document.id)->'lines') fact
      join public.document_lines line on line.id=(fact->>'lineId')::uuid and line.document_id=document.id
      where purchases and document.care_recipient_id=p_patient and document.type='COM'
        and document.status in ('approved','partially_approved','purchasing','purchased','partially_received')
      group by line.product_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'productId',catalog.product_id,'name',catalog.name,'unit',catalog.unit,
      'decimals',catalog.quantity_decimals,'active',catalog.is_active,
      'family',case when family then jsonb_build_object(
        'confirmed',private.stock_quantity(p_patient,catalog.product_id,'FAMILY')::text,
        'incoming',coalesce(ft.pending,0)::text,'disputed',coalesce(ft.disputed,0)::text,
        'purchasePending',coalesce(p.expected+p.awaiting,0)::text,
        'purchaseExpected',coalesce(p.expected,0)::text,'purchaseAwaiting',coalesce(p.awaiting,0)::text,
        'purchasePendingValidation',coalesce(p.pending_validation,0)::text,
        'minimum',family_rule.low_threshold,'updatedAt',updated.family_at) end,
      'team',case when team then jsonb_build_object(
        'confirmed',private.stock_quantity(p_patient,catalog.product_id,'CARE_TEAM')::text,
        'incoming',coalesce(tt.pending,0)::text,'disputed',coalesce(tt.disputed,0)::text,
        'minimum',team_rule.low_threshold,'updatedAt',updated.team_at) end,
      'disputed',(coalesce(ft.disputed,0)+coalesce(tt.disputed,0))::text
    ) order by catalog.category,catalog.sort_order,catalog.name),'[]'::jsonb)
    from public.care_recipient_products catalog
    left join updated on updated.product_id=catalog.product_id
    left join transfer ft on ft.product_id=catalog.product_id and ft.location='FAMILY'
    left join transfer tt on tt.product_id=catalog.product_id and tt.location='CARE_TEAM'
    left join purchase_facts p on p.product_id=catalog.product_id
    left join public.stock_alert_rules family_rule on family_rule.care_recipient_id=p_patient
      and family_rule.product_id=catalog.product_id and family_rule.location='FAMILY' and family_rule.is_enabled
    left join public.stock_alert_rules team_rule on team_rule.care_recipient_id=p_patient
      and team_rule.product_id=catalog.product_id and team_rule.location='CARE_TEAM' and team_rule.is_enabled
    where catalog.care_recipient_id=p_patient
  );
end;
$$;
