-- A scoped read model informs revocation; it never gates or performs revocation.
create function public.membership_impact(p_patient uuid,p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member public.care_recipient_memberships;result jsonb;deliveries jsonb;regularizations jsonb;balances jsonb;deferrals jsonb;shifts jsonb;changes jsonb;
 ent_visible boolean;bal_visible boolean;schedule_visible boolean;
begin
 perform private.require_cap(p_patient,'access.manage');
 select * into member from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=p_user;
 if not found then raise exception 'patient membership unavailable' using errcode='42501';end if;
 ent_visible:=private.can(p_patient,'ent.read');bal_visible:=private.can(p_patient,'bal.read');schedule_visible:=private.can(p_patient,'schedule.read.team');
 if ent_visible then
  with scoped as materialized(select d.id,d.code,d.status,d.created_at from public.operational_documents d where d.care_recipient_id=p_patient and d.recipient_id=p_user and d.type='ENT' and d.status in ('pending_receipt','disputed','cancellation_pending')),
  paged as(select * from scoped order by created_at desc,id limit 20)
  select jsonb_build_object('available',true,'total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'status',d.status,
   'lineCount',(select count(*) from public.document_lines where document_id=d.id),
   'lines',coalesce((select jsonb_agg(to_jsonb(l) order by name,id) from (select l.id,l.name_snapshot name,l.unit_snapshot unit,l.accepted_quantity::text "acceptedQuantity",greatest(l.quantity-l.accepted_quantity-l.reconciled_quantity,0)::text "pendingQuantity" from public.document_lines l where l.document_id=d.id order by l.name_snapshot,l.id limit 20) l),'[]')) order by d.created_at desc,d.id) from paged d),'[]')) into deliveries;
  with scoped as materialized(select r.id,r.document_id "documentId",d.code,r.state,
   array_remove(array[case when r.proposed_by=p_user then 'proposal' end,case when r.reviewer_id=p_user then 'review' end,case when r.follow_up_owner_id=p_user then 'follow_up' end],null) responsibilities
   from public.delivery_regularizations r join public.operational_documents d on d.id=r.document_id where r.care_recipient_id=p_patient and
   (r.state='pending' and p_user in (r.proposed_by,r.reviewer_id) or r.state='approved' and r.follow_up_owner_id=p_user and (r.proposal->>'unknownQuantity')::numeric>0
    and not exists(select 1 from public.delivery_regularizations later where later.document_id=r.document_id and (later.proposed_at,later.id)>(r.proposed_at,r.id)))),
  paged as(select * from scoped order by id limit 20)
  select jsonb_build_object('available',true,'total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(to_jsonb(p) order by id) from paged p),'[]')) into regularizations;
 end if;
 if bal_visible then
  with scoped as materialized(select a.id,a.shift_id "shiftId",a.status,a.kind,a.starts_at "startsAt",a.ends_at "endsAt" from public.bal_assignments a join public.bal_cycles c on c.id=a.cycle_id and c.care_recipient_id=a.care_recipient_id
   where a.care_recipient_id=p_patient and a.professional_id=p_user and c.state='open' and a.status in ('active','missed','deferred')
   and not exists(select 1 from public.bal_assignments newer where newer.cycle_id=a.cycle_id and (newer.created_at,newer.id)>(a.created_at,a.id))),
  paged as(select * from scoped order by "startsAt",id limit 20)
  select jsonb_build_object('available',true,'total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(to_jsonb(p) order by "startsAt",id) from paged p),'[]')) into balances;
  with scoped as materialized(select r.id,r.assignment_id "assignmentId",r.status,s.starts_at "startsAt",s.ends_at "endsAt" from public.bal_deferrals r join public.scheduled_shifts s on s.id=r.target_shift_id and s.care_recipient_id=r.care_recipient_id
   where r.care_recipient_id=p_patient and r.status='pending' and s.professional_id=p_user),
  paged as(select * from scoped order by "startsAt",id limit 20)
  select jsonb_build_object('available',true,'total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(to_jsonb(p) order by "startsAt",id) from paged p),'[]')) into deferrals;
 end if;
 if schedule_visible then
  with scoped as materialized(select s.id,s.status,s.starts_at "startsAt",s.ends_at "endsAt",s.timezone from public.scheduled_shifts s
   where s.care_recipient_id=p_patient and s.professional_id=p_user and s.status in ('proposed','published') and s.ends_at>statement_timestamp()),
  paged as(select * from scoped order by "startsAt",id limit 20)
  select jsonb_build_object('available',true,'total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(to_jsonb(p) order by "startsAt",id) from paged p),'[]')) into shifts;
  with scoped as materialized(select r.id,r.shift_id "shiftId",r.status,r.starts_at "startsAt",r.ends_at "endsAt" from public.shift_change_requests r
   where r.care_recipient_id=p_patient and r.status='pending' and p_user in (r.professional_id,r.proposed_professional_id,r.created_by)),
  paged as(select * from scoped order by "startsAt",id limit 20)
  select jsonb_build_object('available',true,'total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(to_jsonb(p) order by "startsAt",id) from paged p),'[]')) into changes;
 end if;
 result:=jsonb_build_object('careRecipientId',p_patient,'userId',p_user,'checkedAt',statement_timestamp(),
  'member',jsonb_build_object('name',(select full_name from public.profiles where id=p_user),'role',member.role,'status',member.status),
  'deliveries',coalesce(deliveries,jsonb_build_object('available',false,'total',null,'items','[]'::jsonb)),
  'regularizations',coalesce(regularizations,jsonb_build_object('available',false,'total',null,'items','[]'::jsonb)),
  'balances',coalesce(balances,jsonb_build_object('available',false,'total',null,'items','[]'::jsonb)),
  'deferrals',coalesce(deferrals,jsonb_build_object('available',false,'total',null,'items','[]'::jsonb)),
  'shifts',coalesce(shifts,jsonb_build_object('available',false,'total',null,'items','[]'::jsonb)),
  'shiftChanges',coalesce(changes,jsonb_build_object('available',false,'total',null,'items','[]'::jsonb)));
 perform private.require_cap(p_patient,'access.manage');return result;
end;$$;
revoke all on function public.membership_impact(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.membership_impact(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
