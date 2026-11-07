-- A legacy recount is an explicit current task, without invented old deadlines.
alter table public.bal_cycles add column origin text not null default 'scheduled'
  check(origin in ('scheduled','legacy_recount'));
do $$declare v_name text;begin
 select conname into strict v_name from pg_constraint where conrelid='public.bal_cycles'::regclass and contype='c'
   and pg_get_constraintdef(oid) like '%counted_at%';
 execute format('alter table public.bal_cycles drop constraint %I',v_name);
end;$$;
alter table public.bal_cycles add constraint bal_cycle_count_time_known
  check((state='open' and counted_at is null) or (state='counted' and (counted_at is not null or origin='legacy_recount')));

do $$declare d text;needle text;begin
 d:=replace(pg_get_functiondef('private.bal_recount_context(uuid)'::regprocedure),E'\r\n',E'\n');
 needle:='c.state=''counted'' and d.status=''submitted''';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount recovery status';end if;
 d:=replace(d,needle,'c.state=''counted'' and d.status in (''submitted'',''approved'')');
 needle:='d.status=''submitted'' and c.state=''counted'' and v_authority';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount designation status';end if;
 d:=replace(d,needle,'d.status in (''submitted'',''approved'') and (c.id is null or c.state=''counted'') and v_authority');
 needle:='''isScheduled'',c.id is not null';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount origin projection';end if;
 d:=replace(d,needle,'''isScheduled'',c.id is not null and c.origin=''scheduled'',''hasRecountCycle'',c.id is not null');execute d;
 d:=replace(pg_get_functiondef('private.assign_balance_recount(uuid,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 needle:=' select * into strict c from public.bal_cycles where document_id=d.id and care_recipient_id=p_patient order by created_at,id limit 1 for update;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected legacy recount cycle creation';end if;
 d:=replace(d,needle,$patch$
 select * into c from public.bal_cycles where document_id=d.id and care_recipient_id=p_patient for update;
 if not found then
   insert into public.bal_cycles(care_recipient_id,state,document_id,counted_at,origin)
   values(p_patient,'counted',d.id,(ctx->'counter'->>'recordedAt')::timestamptz,'legacy_recount') returning * into c;
 end if;
 $patch$);execute d;
end;$$;

-- Materialize the authorized BAL identities before calling a projection that
-- rejects other types. A WHERE predicate alone does not constrain evaluation
-- order of a function predicate under every valid PostgreSQL join plan.
create or replace function private.bal_recount_recovery(p_patient uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with eligible as materialized (
   select d.id,d.created_at from public.bal_cycles c join public.operational_documents d on d.id=c.document_id
   where c.care_recipient_id=p_patient and d.care_recipient_id=p_patient and d.type='BAL'
     and c.state='counted' and d.status in ('submitted','approved')
 ), projected as materialized (
   select e.id,e.created_at,private.bal_recount_context(e.id) facts from eligible e
 ), pending as (select * from projected where coalesce((facts->>'requiresDesignation')::boolean,false)),
 page as (select * from pending order by created_at,id limit 100)
 select jsonb_build_object('total',(select count(*) from pending),'items',coalesce((select jsonb_agg(facts order by created_at,id) from page),'[]'));
$$;
revoke execute on function private.bal_recount_recovery(uuid) from public,anon,authenticated,service_role;

-- Physical recount submission is a new version against the live ledger. An
-- optional policy applies only its new delta; the first applied fact is intact.
do $$declare d text;needle text;begin
 d:=replace(pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure),E'\r\n',E'\n');
 needle:='p_recount and d.type=''BAL'' and d.status=''submitted''';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected approved recount guard';end if;
 d:=replace(d,needle,'p_recount and d.type=''BAL'' and (d.status=''submitted'' or d.status=''approved'' and exists(select 1 from public.bal_cycles where document_id=p_id))');
 needle:=' perform private.record_document_event(p_id,lower(d.type)||case when p_recount then ''.recount'' else ''.draft_updated'' end,p_payload,p_key);';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount application boundary';end if;
 d:=replace(d,needle,$patch$
 if d.type='BAL' and p_recount then
   update public.operational_documents set status='submitted',workflow_data=workflow_data-'appliedAt'-'appliedRevision'-'appliedBy' where id=p_id;
   if d.workflow_data->'reviewPolicy'->>'balReview'='optional' then perform private.apply_bal(p_id);end if;
 end if;
 $patch$||needle);execute d;
 d:=replace(pg_get_functiondef('public.revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure),E'\r\n',E'\n');
 needle:='if p_recount then perform private.finish_bal_count(p_id,v_context);end if;return v_result;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected final recount authority boundary';end if;
 d:=replace(d,needle,$patch$
 if p_recount then perform private.finish_bal_count(p_id,v_context);end if;
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 perform private.require_cap(v_d.care_recipient_id,'bal.count');
 if not private.schedule_worker(v_d.care_recipient_id,auth.uid()) or (v_context->>'endsAt')::timestamptz<=clock_timestamp() then raise exception 'balance counter authority changed' using errcode='42501';end if;
 return public.operational_document(p_id);
 $patch$);execute d;
 d:=replace(pg_get_functiondef('private.bal_count_context(uuid,uuid,jsonb)'::regprocedure),E'\r\n',E'\n');
 needle:='''weeks'',(select jsonb_agg(week_start order by week_start) from public.bal_obligations where cycle_id=v_c.id)';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected legacy recount empty weeks';end if;
 d:=replace(d,needle,'''weeks'',coalesce((select jsonb_agg(week_start order by week_start) from public.bal_obligations where cycle_id=v_c.id),''[]''::jsonb)');execute d;
end;$$;

-- Recount responsibility continues even when the weekly regime is disabled or
-- has never been activated. No weekly obligation is invented for a legacy BAL.
create function private.process_bal_recounts(p_patient uuid,p_now timestamptz) returns integer
language plpgsql security definer set search_path='' as $$
declare a public.bal_assignments;s public.scheduled_shifts;v_id uuid;begin
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then return 0;end if;
 select x.* into a from public.bal_assignments x join public.bal_cycles c on c.id=x.cycle_id
   where x.care_recipient_id=p_patient and x.kind='recount' and x.status='active' and c.state='counted' for update of x;
 if not found then return 0;end if;
 select * into s from public.scheduled_shifts where id=a.shift_id for share;
 if a.ends_at>p_now and s.status='published' and s.version=a.shift_version
   and private.schedule_worker(p_patient,a.professional_id) and private.member_can(p_patient,a.professional_id,'bal.count') then return 0;end if;
 update public.bal_assignments set status=case when a.ends_at<=p_now then 'missed' else 'invalidated' end,
   missed_at=case when a.ends_at<=p_now then a.ends_at else missed_at end,version=version+1 where id=a.id;
 update public.bal_deferrals set status='stale',decided_at=p_now where cycle_id=a.cycle_id and status='pending';
 perform private.bal_event(p_patient,a.cycle_id,a.id,case when a.ends_at<=p_now then 'bal.cycle.missed' else 'bal.cycle.invalidated' end,
   'Reconto sem conclusão nesta atribuição; contagem e obrigações anteriores preservadas',to_jsonb(a),'recount_unavailable:'||a.id);
 if a.ends_at>p_now and s.status='published' and s.starts_at=a.starts_at and s.ends_at=a.ends_at
   and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count') then
   v_id:=private.bal_assign(p_patient,a.cycle_id,s.id,'recount');
   if not private.schedule_worker(p_patient,s.professional_id) or not private.member_can(p_patient,s.professional_id,'bal.count') then
     update public.bal_assignments set status='invalidated',version=version+1 where id=v_id;
     perform private.bal_event(p_patient,a.cycle_id,v_id,'bal.cycle.recount_unassigned',
       'Elegibilidade alterada durante a sucessão; reconto aguarda nova designação',jsonb_build_object('previousAssignmentId',a.id),'recount_unassigned:'||v_id);
     return 0;
   end if;
   perform private.bal_event(p_patient,a.cycle_id,v_id,'bal.cycle.recount_transferred',
     'Responsabilidade do reconto transferida no mesmo plantão, preservando contagens anteriores',
     jsonb_build_object('previousAssignmentId',a.id,'previousProfessionalId',a.professional_id,'professionalId',s.professional_id,
       'startsAt',a.starts_at,'endsAt',a.ends_at,'shiftId',s.id,'shiftVersion',s.version),'recount_transfer:'||a.id||':'||s.version);
   return 1;
 end if;
 perform private.bal_event(p_patient,a.cycle_id,a.id,'bal.cycle.recount_unassigned',
   'Reconto aguarda nova designação da família ou supervisão habilitada',jsonb_build_object('previousAssignmentId',a.id),'recount_unassigned:'||a.id);
 return 0;
end;$$;
revoke execute on function private.process_bal_recounts(uuid,timestamptz) from public,anon,authenticated,service_role;

create function private.balance_scheduler_candidates() returns table(care_recipient_id uuid,enabled boolean)
language sql stable security definer set search_path='' as $$
 select x.care_recipient_id,true from (
   select r.care_recipient_id from public.bal_regimes r where r.enabled
   union select a.care_recipient_id from public.bal_assignments a where a.status='active' and a.kind='recount'
 ) x;
$$;
revoke execute on function private.balance_scheduler_candidates() from public,anon,authenticated,service_role;
create index bal_active_recount_patient on public.bal_assignments(care_recipient_id) where status='active' and kind='recount';

do $$declare d text;needle text;v_start integer;v_end integer;begin
 d:=replace(pg_get_functiondef('private.process_bal_patient(uuid,timestamptz)'::regprocedure),E'\r\n',E'\n');
 needle:=' select * into v_r from public.bal_regimes where care_recipient_id=p_patient and enabled;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected independent recount processor entry';end if;
 d:=replace(d,needle,' v_cycles:=private.process_bal_recounts(p_patient,p_now);'||E'\n'||needle);
 needle:='then return 0;end if;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected disabled regime return';end if;
 d:=replace(d,needle,'then return v_cycles;end if;');
 needle:='(state=''open'' or exists(select 1 from public.bal_assignments a where a.cycle_id=c.id and a.status=''active''))';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected counted cycle processor';end if;
 d:=replace(d,needle,'state=''open''');
 -- The counted branch from 113 has moved to the independent processor above.
 v_start:=position(' if v_c.state=''counted'' then' in d);v_end:=position(' if exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status=''active'') then exit;end if;' in d);
 if v_start=0 or v_end<=v_start then raise exception 'unexpected counted branch boundaries';end if;
 d:=overlay(d placing '' from v_start for v_end-v_start);execute d;
 d:=replace(pg_get_functiondef('public.run_operational_schedule()'::regprocedure),E'\r\n',E'\n');
 needle:='from public.bal_regimes';
 if length(d)-length(replace(d,needle,''))<>3*length(needle) then raise exception 'unexpected fair BAL scheduler candidate queries';end if;
 d:=replace(d,needle,'from private.balance_scheduler_candidates()');execute d;
end;$$;
