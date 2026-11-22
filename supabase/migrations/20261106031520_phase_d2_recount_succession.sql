-- A schedule replacement preserves the recount's exact window and prior count.
do $$declare d text;needle text:='if v_c.state=''counted'' then exit;end if;';begin
 d:=replace(pg_get_functiondef('private.process_bal_patient(uuid,timestamptz)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected counted-cycle succession contract';end if;
 d:=replace(d,needle,$patch$
 if v_c.state='counted' then
   if v_a.id is not null and v_a.kind='recount'
     and exists(select 1 from public.bal_assignments where id=v_a.id and status='invalidated')
     and v_s.status='published' and v_s.starts_at=v_a.starts_at and v_s.ends_at=v_a.ends_at and v_s.ends_at>p_now
     and private.schedule_worker(p_patient,v_s.professional_id) and private.member_can(p_patient,v_s.professional_id,'bal.count')
     and not exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then
     v_sid:=private.bal_assign(p_patient,v_c.id,v_s.id,'recount');
     perform private.bal_event(p_patient,v_c.id,v_sid,'bal.cycle.recount_transferred',
       'Responsabilidade do reconto transferida pela substituição na escala, sem alterar a janela ou a contagem anterior',
       jsonb_build_object('previousAssignmentId',v_a.id,'previousProfessionalId',v_a.professional_id,'professionalId',v_s.professional_id,
         'startsAt',v_a.starts_at,'endsAt',v_a.ends_at,'shiftId',v_s.id,'shiftVersion',v_s.version,'documentId',v_c.document_id),
       'recount_transfer:'||v_a.id||':'||v_s.version);
   elsif v_a.id is not null and v_a.kind='recount' then
     perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.recount_unassigned',
       'Reconto sem profissional elegível; família ou supervisão habilitada precisa designar nova responsabilidade',
       jsonb_build_object('documentId',v_c.document_id,'previousAssignmentId',v_a.id),'recount_unassigned:'||v_a.id);
   end if;
   exit;
 end if;
 $patch$);execute d;
end;$$;

create function private.bal_recount_context(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;c public.bal_cycles;a public.bal_assignments;last_a public.bal_assignments;
 v_counter jsonb;v_authority boolean;v_active_valid boolean;v_can boolean;v_recovery boolean;v_hash text;begin
 select * into d from public.operational_documents where id=p_id;
 if not found then raise exception 'balance document not found' using errcode='P0002';end if;
 if d.type<>'BAL' then raise exception 'BAL document required' using errcode='22023';end if;
 if not coalesce(private.can(d.care_recipient_id,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 select * into c from public.bal_cycles where document_id=p_id and care_recipient_id=d.care_recipient_id order by created_at,id limit 1;
 select * into a from public.bal_assignments where care_recipient_id=d.care_recipient_id and status='active';
 select * into last_a from public.bal_assignments where cycle_id=c.id order by created_at desc,id desc limit 1;
 v_counter:=private.bal_effective_counter(p_id);
 v_authority:=coalesce(private.bal_review_authorized(d.care_recipient_id,'family') or private.bal_review_authorized(d.care_recipient_id,'supervisor'),false);
 v_active_valid:=coalesce(a.id is not null and a.ends_at>clock_timestamp()
   and private.schedule_worker(d.care_recipient_id,a.professional_id) and private.member_can(d.care_recipient_id,a.professional_id,'bal.count')
   and exists(select 1 from public.scheduled_shifts s where s.id=a.shift_id and s.status='published' and s.version=a.shift_version),false);
 v_recovery:=coalesce(c.state='counted' and d.status='submitted' and last_a.kind='recount' and last_a.status<>'counted'
   and (a.cycle_id is distinct from c.id or not v_active_valid),false);
 v_can:=coalesce(d.status='submitted' and c.state='counted' and v_authority
   and (a.id is null or a.cycle_id=c.id and a.kind='recount' and not v_active_valid)
   and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active),false);
 v_hash:=encode(extensions.digest(jsonb_build_object('documentId',p_id,'version',d.version,'counter',v_counter->>'id',
   'countVersion',d.workflow_data->'countVersion','cycleId',c.id,'lastAssignment',last_a.id,'lastVersion',last_a.version,
   'activeAssignment',a.id,'activeVersion',a.version,'canAssign',v_can,'actor',auth.uid())::text,'sha256'),'hex');
 return jsonb_build_object('documentId',p_id,'patientId',d.care_recipient_id,'code',d.code,'documentVersion',d.version,'status',d.status,
   'counter',v_counter,'countVersion',d.workflow_data->'countVersion','notes',coalesce(d.payload->>'notes',''),
   'countWindow',d.payload->'balanceContext','isScheduled',c.id is not null,'canAssign',v_can,'requiresDesignation',v_recovery,
   'activeAssignment',case when a.id is not null then to_jsonb(a)||jsonb_build_object('professionalName',(select full_name from public.profiles where id=a.professional_id),'timezone',(select timezone from public.scheduled_shifts where id=a.shift_id)) end,
   'lastAssignment',case when last_a.id is not null then to_jsonb(last_a) end,'referenceHash',v_hash);
end;$$;


revoke execute on function private.bal_recount_context(uuid) from public,anon,authenticated,service_role;

create function private.bal_recount_recovery(p_patient uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with candidates as (
   select d.id,d.created_at,private.bal_recount_context(d.id) facts
   from public.bal_cycles c join public.operational_documents d on d.id=c.document_id
   where c.care_recipient_id=p_patient and c.state='counted' and d.status='submitted'
 ), pending as (select * from candidates where coalesce((facts->>'requiresDesignation')::boolean,false)),
 page as (select * from pending order by created_at,id limit 100)
 select jsonb_build_object('total',(select count(*) from pending),'items',coalesce((select jsonb_agg(facts order by created_at,id) from page),'[]'));
$$;
revoke execute on function private.bal_recount_recovery(uuid) from public,anon,authenticated,service_role;

create function public.balance_recount_context(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;begin
 ctx:=private.bal_recount_context(p_id);
 return ctx||jsonb_build_object('targets',public.balance_workspace((ctx->>'patientId')::uuid)->'targets');
end;$$;
revoke execute on function public.balance_recount_context(uuid) from public,anon,authenticated,service_role;
grant execute on function public.balance_recount_context(uuid) to authenticated;

create function private.assign_balance_recount(p_patient uuid,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old private.bal_commands;d public.operational_documents;c public.bal_cycles;a public.bal_assignments;s public.scheduled_shifts;
 v_request jsonb;ctx jsonb;v_reason text;v_id uuid;v_result jsonb;v_name text;begin
 if not coalesce(private.can(p_patient,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 if p_key is null then raise exception 'recount key required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 if not coalesce(private.can(p_patient,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 v_request:=jsonb_build_object('action','assign_recount','body',p_body,'version',p_version);
 select * into old from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then
   if old.request is distinct from v_request then raise exception 'recount assignment idempotency conflict' using errcode='23505';end if;
   return old.result;
 end if;
 if jsonb_typeof(p_body) is distinct from 'object'
   or exists(select 1 from jsonb_object_keys(p_body) k where k not in ('documentId','targetShiftId','targetShiftVersion','referenceHash','reason'))
   or jsonb_typeof(p_body->'documentId') is distinct from 'string'
   or coalesce(p_body->>'documentId','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   or jsonb_typeof(p_body->'targetShiftId') is distinct from 'string'
   or coalesce(p_body->>'targetShiftId','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   or jsonb_typeof(p_body->'targetShiftVersion') is distinct from 'number'
   or not (case when coalesce(p_body->>'targetShiftVersion','')~'^[1-9][0-9]{0,9}$'
     then (p_body->>'targetShiftVersion')::numeric<=2147483647 else false end)
   or jsonb_typeof(p_body->'referenceHash') is distinct from 'string'
   or coalesce(p_body->>'referenceHash','')!~'^[0-9a-f]{64}$'
   or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(trim(p_body->>'reason'))<3
   or private.bal_comment_units(p_body->>'reason')>1000 then raise exception 'invalid recount assignment body' using errcode='22023';end if;
 if not coalesce(private.bal_review_authorized(p_patient,'family') or private.bal_review_authorized(p_patient,'supervisor'),false)
   or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'recount assignment authorization required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=(p_body->>'documentId')::uuid and care_recipient_id=p_patient and type='BAL' for update;
 if not found then raise exception 'balance document not found' using errcode='P0002';end if;
 ctx:=private.bal_recount_context(d.id);
 if p_version is null or p_version<>d.version or not coalesce((ctx->>'canAssign')::boolean,false)
   or p_body->>'referenceHash' is distinct from ctx->>'referenceHash' then raise exception 'stale recount assignment reference' using errcode='PT409';end if;
 select * into strict c from public.bal_cycles where document_id=d.id and care_recipient_id=p_patient order by created_at,id limit 1 for update;
 select * into s from public.scheduled_shifts where id=(p_body->>'targetShiftId')::uuid and care_recipient_id=p_patient for share;
 if not found or s.version is distinct from (p_body->>'targetShiftVersion')::integer or s.status<>'published'
   or s.ends_at<=clock_timestamp() or not private.schedule_worker(p_patient,s.professional_id)
   or not private.member_can(p_patient,s.professional_id,'bal.count') then raise exception 'stale recount target shift' using errcode='PT409';end if;
 select * into a from public.bal_assignments where care_recipient_id=p_patient and status='active' for update;
 if found then
   if a.cycle_id<>c.id or a.kind<>'recount' then raise exception 'another recount assignment is active' using errcode='PT409';end if;
   update public.bal_assignments set status=case when ends_at<=clock_timestamp() then 'missed' else 'invalidated' end,
     missed_at=case when ends_at<=clock_timestamp() then ends_at else missed_at end,version=version+1 where id=a.id;
   perform private.bal_event(p_patient,c.id,a.id,'bal.cycle.invalidated','Atribuição anterior indisponível, preservada antes da nova designação',to_jsonb(a),'recount_replace:'||a.id||':'||a.version);
 end if;
 v_id:=private.bal_assign(p_patient,c.id,s.id,'recount');v_reason:=trim(p_body->>'reason');
 select full_name into strict v_name from public.profiles where id=auth.uid();
 v_result:=jsonb_build_object('assignmentId',v_id,'documentId',d.id,'documentVersion',d.version,'code',d.code,
   'counter',ctx->'counter','countVersion',ctx->'countVersion','professionalId',s.professional_id,
   'professionalName',(select full_name from public.profiles where id=s.professional_id),'startsAt',s.starts_at,'endsAt',s.ends_at,
   'timezone',s.timezone,'shiftId',s.id,'shiftVersion',s.version,'reason',v_reason,'designerId',auth.uid(),'designerName',v_name,'recordedAt',statement_timestamp());
 perform private.bal_event(p_patient,c.id,v_id,'bal.cycle.recount_assigned',v_reason,v_result,'recount:'||v_id);
 insert into private.bal_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,v_request,v_result);
 if not coalesce(private.can(p_patient,'bal.read'),false)
   or not coalesce(private.bal_review_authorized(p_patient,'family') or private.bal_review_authorized(p_patient,'supervisor'),false)
   or not private.schedule_worker(p_patient,s.professional_id) or not private.member_can(p_patient,s.professional_id,'bal.count')
   or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
   raise exception 'recount assignment authority changed' using errcode='42501';end if;
 return v_result;
end;$$;
revoke execute on function private.assign_balance_recount(uuid,jsonb,uuid,integer) from public,anon,authenticated,service_role;

do $$declare d text;needle text:=E'begin\n';begin
 d:=replace(pg_get_functiondef('public.balance_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 if position(needle in d)=0 then raise exception 'unexpected recount command dispatcher';end if;
 d:=overlay(d placing needle||' if p_action=''assign_recount'' then return private.assign_balance_recount(p_patient,p_body,p_key,p_version);end if;'||E'\n' from position(needle in d) for length(needle));execute d;
 d:=replace(pg_get_functiondef('public.balance_workspace(uuid)'::regprocedure),E'\r\n',E'\n');
 needle:=' return jsonb_build_object(''referenceRevision''';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount recovery read model';end if;
 d:=replace(d,needle,' return jsonb_build_object(''recountRecovery'',private.bal_recount_recovery(p_patient))||jsonb_build_object(''referenceRevision''');execute d;
 d:=replace(pg_get_functiondef('public.operational_document(uuid)'::regprocedure),E'\r\n',E'\n');
 needle:='jsonb_build_object(''balanceReview'',private.bal_review_context(p_id))';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount document projection';end if;
 d:=replace(d,needle,'jsonb_build_object(''balanceReview'',private.bal_review_context(p_id),''balanceRecount'',private.bal_recount_context(p_id))');execute d;
end;$$;

-- A recount records a new physical act, not another satisfaction of old weeks.
do $$declare d text;needle text:='''bal.cycle.counted'',''Contagem física atual registrada; atrasos anteriores preservados''';begin
 d:=replace(pg_get_functiondef('private.finish_bal_count(uuid,jsonb)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected recount completion event contract';end if;
 d:=replace(d,needle,$patch$case when p_context->>'kind'='recount' then 'bal.cycle.recount_recorded' else 'bal.cycle.counted' end,
   case when p_context->>'kind'='recount' then 'Nova contagem física registrada; histórico e prazos originais preservados'
   else 'Contagem física atual registrada; atrasos anteriores preservados' end$patch$);execute d;
end;$$;
