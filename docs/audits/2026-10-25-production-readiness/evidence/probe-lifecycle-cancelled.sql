-- NOT EXECUTED: rollback-only regression candidate for root to coordinate.
-- Uses existing official Auth sessions; no network/provider dispatch.
begin;
-- INCLUDE_AUTH_HELPER
-- Isolate other due work transactionally, then restore it with ROLLBACK.
update public.requisition_lifecycle set next_reminder_at='infinity',manual_archive_required=true;
update public.operational_documents set updated_at=now() where type='ENT' and status='pending_receipt';
create temporary table audit_lifecycle_fixture(n integer primary key,patient uuid,request_id uuid);
insert into audit_lifecycle_fixture(n,patient) select n,gen_random_uuid() from generate_series(1,26) n;
grant all on audit_lifecycle_fixture to authenticated;
insert into public.care_recipients(id,display_name,is_development) select patient,'Auditoria ciclo '||n,true from audit_lifecycle_fixture;
insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases)
select f.patient,p.id,p.name,p.category,p.unit,p.aliases from audit_lifecycle_fixture f cross join public.products p where p.id='fralda';
insert into public.care_recipient_memberships(care_recipient_id,user_id,role)
select f.patient,p.id,'admin' from audit_lifecycle_fixture f cross join public.profiles p where p.full_name='Teste adminA';
set local role authenticated;
do $$declare f record;r record;begin
 for f in select * from audit_lifecycle_fixture order by n loop
  perform pg_temp.assume_context('adminA',f.patient);
  select * into r from public.submit_requisition(f.patient,gen_random_uuid(),'ignored','[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]');
  update audit_lifecycle_fixture set request_id=r.requisition_id where n=f.n;
  if f.n<=25 then perform public.transition_requisition_status(r.requisition_id,'cancelled','Solicitação cancelada pelo responsável');end if;
 end loop;
end;$$;
reset role;
update public.requisition_lifecycle s set next_reminder_at=now()-case when f.n<=25 then interval '2 days' else interval '1 day' end from audit_lifecycle_fixture f where s.requisition_id=f.request_id;
set local request.jwt.claim.sub='';
set local request.jwt.claim.role='service_role';
set local request.jwt.claims='{"role":"service_role"}';
select public.run_operational_schedule();
select public.run_operational_schedule();
select public.run_operational_schedule();
select 'after_three_runs_live_reminders='||s.reminders from public.requisition_lifecycle s join audit_lifecycle_fixture f on f.request_id=s.requisition_id where f.n=26;
select 'cancelled_still_due='||count(*) from public.requisition_lifecycle s join audit_lifecycle_fixture f on f.request_id=s.requisition_id join public.operational_documents d on d.id=s.requisition_id where f.n<=25 and d.status='cancelled' and s.next_reminder_at<=now();
-- Diagnostic positive control only: remove finished fixtures from candidate set.
update public.requisition_lifecycle s set archived_at=now() from audit_lifecycle_fixture f where s.requisition_id=f.request_id and f.n<=25;
select public.run_operational_schedule();
select 'control_live_reminders='||s.reminders from public.requisition_lifecycle s join audit_lifecycle_fixture f on f.request_id=s.requisition_id where f.n=26;
rollback;
