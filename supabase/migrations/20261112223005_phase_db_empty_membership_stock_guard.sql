-- recipient_role(), and therefore every private.can(), requires an active
-- membership of the real user. For a user with none, avoid evaluating the
-- unchanged row-sensitive custody checks for every historical ledger row.
-- The scalar subquery is an initplan, not an authority cache between requests.
create or replace view public.current_stock_balances
with (security_invoker = true) as
select care_recipient_id, product_id, location, sum(delta) as balance
from (
  select care_recipient_id, product_id, destination_location as location,
    quantity as delta
  from public.stock_movements
  where destination_location is not null
  union all
  select care_recipient_id, product_id, source_location as location,
    -quantity as delta
  from public.stock_movements
  where source_location is not null
) x
where care_recipient_id is not null
  and (select exists (
    select 1 from public.care_recipient_memberships m
    where m.user_id = (select auth.uid()) and m.status = 'active'
  ))
  and case location
    when 'FAMILY' then private.can(care_recipient_id, 'stock.family.read')
    when 'CARE_TEAM' then private.can(care_recipient_id, 'stock.team.read')
    else private.can(care_recipient_id, 'ent.read')
  end
group by care_recipient_id, product_id, location;
