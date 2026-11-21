-- P05: administrative facts have their own authors; personal receipts stay intact.
insert into public.capability_definitions(code,default_roles,critical)
 values('ent.regularize',array['admin','family'],true),('ent.follow_up',array['admin','family','professional','supervisor'],false);

create table public.delivery_regularizations (
 id uuid primary key default gen_random_uuid(),document_id uuid not null,care_recipient_id uuid not null,
 proposed_by uuid not null references public.profiles(id),reviewer_id uuid not null references public.profiles(id),
 follow_up_owner_id uuid references public.profiles(id),proposed_at timestamptz not null default clock_timestamp(),
 reference_version integer not null,state text not null default 'pending' check(state in ('pending','approved','rejected','withdrawn','obsolete')),
 before_snapshot jsonb not null,proposal jsonb not null,decision jsonb,
 foreign key(document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
 check(proposed_by<>reviewer_id),check((state='pending')=(decision is null)),unique(id,document_id,care_recipient_id)
);
create unique index delivery_one_pending_regularization on public.delivery_regularizations(document_id) where state='pending';
create index delivery_regularization_history on public.delivery_regularizations(document_id,proposed_at desc,id);
create table public.delivery_regularization_findings (
 id uuid primary key default gen_random_uuid(),regularization_id uuid not null,
 document_id uuid not null,care_recipient_id uuid not null,actor_id uuid not null references public.profiles(id),
 actor_name text,recorded_at timestamptz not null default clock_timestamp(),body text not null check(length(btrim(body)) between 3 and 2000),
 foreign key(document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
 foreign key(regularization_id,document_id,care_recipient_id) references public.delivery_regularizations(id,document_id,care_recipient_id)
);
create index delivery_finding_case on public.delivery_regularization_findings(regularization_id,recorded_at,id);
alter table public.delivery_regularizations enable row level security;
alter table public.delivery_regularization_findings enable row level security;
revoke all on public.delivery_regularizations,public.delivery_regularization_findings from public,anon,authenticated,service_role;
grant select on public.delivery_regularizations,public.delivery_regularization_findings to authenticated;
create policy delivery_regularization_read on public.delivery_regularizations for select to authenticated using(private.can(care_recipient_id,'ent.read'));
create policy delivery_finding_read on public.delivery_regularization_findings for select to authenticated using(private.can(care_recipient_id,'ent.read'));
create function private.protect_delivery_regularization() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' then raise exception 'regularization history is immutable' using errcode='23514';end if;
 if (to_jsonb(new)-'state'-'decision') is distinct from (to_jsonb(old)-'state'-'decision') or old.state<>'pending' and new is distinct from old then
  raise exception 'regularization proposal and final decision are immutable' using errcode='23514';end if;
 return new;
end;$$;
create trigger delivery_regularization_preserved before update or delete on public.delivery_regularizations for each row execute function private.protect_delivery_regularization();
create trigger delivery_finding_preserved before update or delete on public.delivery_regularization_findings for each row execute function private.immutable_event();

create function private.regularization_authority(p_patient uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.member_can(p_patient,p_user,'ent.read') and private.member_can(p_patient,p_user,'ent.regularize') and exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and m.role::text in ('admin','family')),false);
$$;
create function private.require_regularization_authority(p_patient uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform private.require_cap(p_patient,'ent.regularize');
 if not private.regularization_authority(p_patient,auth.uid()) then raise exception 'local family regularization authority required' using errcode='42501';end if;
end;$$;
create function private.regularization_follow_up_eligible(p_patient uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.member_can(p_patient,p_user,'ent.follow_up') and private.member_can(p_patient,p_user,'ent.read') and exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and m.role::text in ('admin','family','professional','supervisor')),false);
$$;
create function private.delivery_regularization_context(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;c public.delivery_regularizations;history jsonb;people jsonb:='[]';reviewers jsonb:='[]';available boolean;pending numeric;source_lines jsonb;source_ready boolean;begin
 select * into d from public.operational_documents where id=p_id;if not found or d.type<>'ENT' then return null;end if;
 available:=coalesce(private.member_can(d.care_recipient_id,d.recipient_id,'ent.receive'),false);
 select coalesce(sum(greatest(quantity-accepted_quantity-reconciled_quantity,0)),0) into pending from public.document_lines where document_id=p_id;
 select coalesce(jsonb_agg(jsonb_build_object('lineId',l.id,'quantityDecimals',p.quantity_decimals,'sourceReady',p.product_id is not null) order by l.id),'[]'),coalesce(bool_and(p.product_id is not null),false) into source_lines,source_ready from public.document_lines l left join public.care_recipient_products p on p.care_recipient_id=l.care_recipient_id and p.product_id=l.product_id and p.unit=l.unit_snapshot where l.document_id=p_id;
 select * into c from public.delivery_regularizations where document_id=p_id order by proposed_at desc,id desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('findings',coalesce((select jsonb_agg(to_jsonb(f) order by recorded_at,id) from public.delivery_regularization_findings f where f.regularization_id=x.id),'[]')) order by x.proposed_at,x.id),'[]') into history from public.delivery_regularizations x where x.document_id=p_id;
 if private.regularization_authority(d.care_recipient_id,auth.uid()) then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role) order by p.full_name,m.user_id),'[]') into people
  from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=d.care_recipient_id and m.status='active' and p.status='active' and private.member_can(d.care_recipient_id,m.user_id,'ent.read');
  select coalesce(jsonb_agg(value order by value->>'name',value->>'id'),'[]') into reviewers from jsonb_array_elements(people) where value->>'id'<>auth.uid()::text and private.regularization_authority(d.care_recipient_id,(value->>'id')::uuid);
  select coalesce(jsonb_agg(value order by value->>'name',value->>'id'),'[]') into people from jsonb_array_elements(people) where private.regularization_follow_up_eligible(d.care_recipient_id,(value->>'id')::uuid);
 end if;
 return jsonb_build_object('recipientAvailable',available,'pendingTransit',pending::text,'sourceLines',source_lines,'sourceReady',source_ready,'cases',history,'currentId',c.id,
  'canPropose',source_ready and private.regularization_authority(d.care_recipient_id,auth.uid()) and not available and d.status in ('pending_receipt','disputed','confirmed','cancellation_pending','administratively_closed') and (pending>0 or d.status='cancellation_pending') and coalesce(c.state<>'pending',true),
  'reviewers',reviewers,'followUpPeople',people,
  'canReview',coalesce(c.state='pending' and c.reviewer_id=auth.uid() and private.regularization_authority(d.care_recipient_id,auth.uid()),false),
  'canApprove',coalesce(c.state='pending' and c.reference_version=d.version and c.reviewer_id=auth.uid() and not available and source_ready and private.regularization_authority(d.care_recipient_id,auth.uid()) and private.regularization_authority(d.care_recipient_id,c.proposed_by) and ((c.proposal->>'unknownQuantity')::numeric=0 or private.regularization_follow_up_eligible(d.care_recipient_id,c.follow_up_owner_id)),false),
  'canRecordFinding',coalesce(c.state='approved' and c.follow_up_owner_id=auth.uid() and (c.proposal->>'unknownQuantity')::numeric>0 and private.regularization_follow_up_eligible(d.care_recipient_id,auth.uid()),false),
  'canClose',c.state='pending' and private.regularization_authority(d.care_recipient_id,auth.uid()) and (c.proposed_by=auth.uid() or c.reference_version<>d.version or not private.regularization_authority(d.care_recipient_id,c.proposed_by) or not private.regularization_authority(d.care_recipient_id,c.reviewer_id)));
end;$$;

create function private.command_delivery_regularization(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;c public.delivery_regularizations;event_fact public.document_events;l public.document_lines;
 x jsonb;line_plan jsonb;lines jsonb:='[]';outcome_lines jsonb:='[]';movement_ids jsonb;before_facts jsonb;proposal jsonb;decision_fact jsonb;
 case_id uuid;reviewer uuid;owner_id uuid;decimals integer;received numeric;returned numeric;missing numeric;unknown_qty numeric;total_unknown numeric:=0;
 outstanding numeric;reason text;basis text;event_action text;accepted boolean;item record;action_state text;now_at timestamptz:=clock_timestamp();
begin
 select * into d from public.operational_documents where id=p_id;if not found or d.type<>'ENT' then raise exception 'delivery not found' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,'ent.read');
 if p_key is null or p_version is null or p_version<1 or jsonb_typeof(p_body) is distinct from 'object' or p_action is null or p_action not in ('propose_regularization','review_regularization','withdraw_regularization','record_regularization_finding') then raise exception 'invalid regularization command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id::text,0));
 select * into d from public.operational_documents where id=p_id for update;perform private.require_cap(d.care_recipient_id,'ent.read');
 select * into event_fact from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if event_fact.document_id<>p_id or event_fact.action<>'ent.'||p_action or event_fact.body->'event'<>p_body then raise exception 'idempotency conflict' using errcode='23505';end if;
  return public.operational_document(p_id)||jsonb_build_object('commandOutcome',jsonb_build_object('state','recovered','action',p_action,'requestId',event_fact.body->'deliveryRegularization'->'currentId','version',event_fact.version));
 end if;
 if p_action<>'propose_regularization' then
  if coalesce(p_body->>'caseId','')!~'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' then raise exception 'invalid regularization reference' using errcode='22023';end if;
  case_id:=(p_body->>'caseId')::uuid;select * into c from public.delivery_regularizations where id=case_id and document_id=p_id for update;
  if not found then raise exception 'regularization not found' using errcode='42501';end if;
  if c.state<>'pending' and p_action in ('review_regularization','withdraw_regularization') then
   if c.decision->>'actorId'=auth.uid()::text and c.decision->'intent'=p_body and c.decision->>'action'=p_action then return public.operational_document(p_id)||jsonb_build_object('commandOutcome',jsonb_build_object('state','recovered','action',p_action,'requestId',case_id,'version',c.decision->'version'));end if;
   raise exception 'regularization decision conflict' using errcode='P0001';
  end if;
 end if;
 if d.version<>p_version then raise exception 'stale regularization version' using errcode='P0001';end if;
 if p_action='propose_regularization' then
  perform private.require_regularization_authority(d.care_recipient_id);
  if (p_body-'reason'-'basis'-'reviewerId'-'followUpOwnerId'-'lines')<>'{}' or jsonb_typeof(p_body->'reason') is distinct from 'string' or jsonb_typeof(p_body->'basis') is distinct from 'string' then raise exception 'invalid regularization proposal' using errcode='22023';end if;
  reason:=btrim(p_body->>'reason');basis:=btrim(p_body->>'basis');
  if length(reason) not between 3 and 1000 or length(basis) not between 3 and 2000 or coalesce(p_body->>'reviewerId','')!~'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' then raise exception 'regularization reason and independent review required' using errcode='22023';end if;
  reviewer:=(p_body->>'reviewerId')::uuid;
  if reviewer=auth.uid() or not private.regularization_authority(d.care_recipient_id,reviewer) then raise exception 'distinct eligible regularization reviewer required' using errcode='42501';end if;
  if not coalesce((private.delivery_regularization_context(p_id)->>'canPropose')::boolean,false) then raise exception 'regularization proposal not eligible' using errcode='P0001';end if;
  if jsonb_typeof(p_body->'lines') is distinct from 'array' or jsonb_array_length(p_body->'lines')<>(select count(*) from public.document_lines where document_id=p_id) or (select count(distinct value->>'lineId') from jsonb_array_elements(p_body->'lines'))<>jsonb_array_length(p_body->'lines') then raise exception 'invalid regularization lines' using errcode='22023';end if;
  for l in select * from public.document_lines where document_id=p_id order by product_id,id loop
   select value into x from jsonb_array_elements(p_body->'lines') where value->>'lineId'=l.id::text;
   if x is null or (x-'lineId'-'receivedQuantity'-'returnedQuantity'-'missingQuantity')<>'{}' then raise exception 'invalid regularization line' using errcode='22023';end if;
   foreach reason in array array['receivedQuantity','returnedQuantity','missingQuantity'] loop
    if jsonb_typeof(x->reason) not in ('string','number') or coalesce(x->>reason,'')!~'^[0-9]+([.][0-9]+)?$' then raise exception 'invalid regularization quantity' using errcode='22023';end if;
   end loop;
   select quantity_decimals into decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id and unit=l.unit_snapshot;
   if not found then raise exception 'delivery unit reference changed' using errcode='P0001';end if;
   received:=(x->>'receivedQuantity')::numeric;returned:=(x->>'returnedQuantity')::numeric;missing:=(x->>'missingQuantity')::numeric;
   perform private.require_exact_quantity(received,decimals,true);perform private.require_exact_quantity(returned,decimals,true);perform private.require_exact_quantity(missing,decimals,true);
   outstanding:=greatest(l.quantity-l.accepted_quantity-l.reconciled_quantity,0);unknown_qty:=outstanding-received-returned-missing;
   if unknown_qty<0 then raise exception 'regularization exceeds pending transit' using errcode='22023';end if;total_unknown:=total_unknown+unknown_qty;
   lines:=lines||jsonb_build_array(jsonb_build_object('lineId',l.id,'productId',l.product_id,'name',l.name_snapshot,'unit',l.unit_snapshot,'quantityDecimals',decimals,
    'expeditedQuantity',l.quantity::text,'acceptedQuantity',l.accepted_quantity::text,'priorReconciledQuantity',l.reconciled_quantity::text,'pendingQuantity',outstanding::text,
    'receivedQuantity',received::text,'returnedQuantity',returned::text,'missingQuantity',missing::text,'unknownQuantity',unknown_qty::text));
  end loop;
  if p_body ? 'followUpOwnerId' then
   if coalesce(p_body->>'followUpOwnerId','')!~'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' then raise exception 'invalid regularization follow-up owner' using errcode='22023';end if;owner_id:=(p_body->>'followUpOwnerId')::uuid;
  end if;
  if total_unknown>0 and (owner_id is null or not private.regularization_follow_up_eligible(d.care_recipient_id,owner_id)) then raise exception 'unknown physical facts require an active follow-up owner' using errcode='22023';end if;
  if owner_id is not null and not private.regularization_follow_up_eligible(d.care_recipient_id,owner_id) then raise exception 'regularization follow-up owner unavailable' using errcode='42501';end if;
  proposal:=jsonb_build_object('reason',btrim(p_body->>'reason'),'basis',basis,'lines',lines,'unknownQuantity',total_unknown::text,
   'proposedName',(select full_name from public.profiles where id=auth.uid()),'reviewerName',(select full_name from public.profiles where id=reviewer),
   'followUpOwnerName',(select full_name from public.profiles where id=owner_id),'personalReceipt',false);
  before_facts:=jsonb_build_object('version',d.version,'status',d.status,'recipientId',d.recipient_id,'acceptedBy',d.workflow_data->'acceptedBy','acceptedAt',d.workflow_data->'acceptedAt',
   'receiptName',(select coalesce(actor_name,body->>'actorName') from public.document_events where document_id=p_id and action='ent.receive' order by version limit 1),
   'lines',coalesce((select jsonb_agg(to_jsonb(a) order by a.product_id,a.id) from public.document_lines a where a.document_id=p_id),'[]'));
  insert into public.delivery_regularizations(document_id,care_recipient_id,proposed_by,reviewer_id,follow_up_owner_id,reference_version,before_snapshot,proposal)
   values(p_id,d.care_recipient_id,auth.uid(),reviewer,owner_id,d.version+1,before_facts,proposal) returning id into case_id;
 elsif p_action='review_regularization' then
  perform private.require_regularization_authority(d.care_recipient_id);
  if auth.uid() is distinct from c.reviewer_id or auth.uid()=c.proposed_by then raise exception 'only designated independent reviewer may decide regularization' using errcode='42501';end if;
  if (p_body-'caseId'-'accept'-'reason')<>'{}' or jsonb_typeof(p_body->'accept') is distinct from 'boolean' or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(btrim(p_body->>'reason')) not between 3 and 1000 then raise exception 'invalid regularization decision' using errcode='22023';end if;
  accepted:=(p_body->>'accept')::boolean;
  if accepted then
   if not private.regularization_authority(d.care_recipient_id,c.proposed_by) then raise exception 'regularization proposer became unavailable' using errcode='42501';end if;
   if c.reference_version<>d.version or private.member_can(d.care_recipient_id,d.recipient_id,'ent.receive') then raise exception 'stale regularization facts' using errcode='P0001';end if;
   if (c.proposal->>'unknownQuantity')::numeric>0 and not private.regularization_follow_up_eligible(d.care_recipient_id,c.follow_up_owner_id) then raise exception 'regularization follow-up owner unavailable' using errcode='42501';end if;
   for line_plan in select value from jsonb_array_elements(c.proposal->'lines') loop
    select * into strict l from public.document_lines where id=(line_plan->>'lineId')::uuid and document_id=p_id;
    select quantity_decimals into decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id and unit=l.unit_snapshot;
    if not found or decimals is distinct from (line_plan->>'quantityDecimals')::integer then raise exception 'delivery unit reference changed' using errcode='P0001';end if;
    received:=(line_plan->>'receivedQuantity')::numeric;returned:=(line_plan->>'returnedQuantity')::numeric;missing:=(line_plan->>'missingQuantity')::numeric;
    perform private.require_exact_quantity(received,decimals,true);perform private.require_exact_quantity(returned,decimals,true);perform private.require_exact_quantity(missing,decimals,true);
    movement_ids:='[]';
    for item in select * from (values(received,d.payload->>'destination','Recebimento físico apurado em regularização administrativa'),(returned,d.payload->>'source','Devolução física apurada em regularização administrativa'),(missing,null::text,'Falta apurada em regularização administrativa')) movements(qty,destination,note) loop
     if item.qty>0 then
      perform private.move_stock(d.care_recipient_id,l.product_id,item.qty,'TRANSIT',item.destination,item.note||': '||(p_body->>'reason'),'delivery_regularization',case_id);
     end if;
    end loop;
    select coalesce(jsonb_agg(id order by movement_revision),'[]') into movement_ids from public.stock_movements where reference_type='delivery_regularization' and reference_id=case_id and product_id=l.product_id;
    update public.document_lines set reconciled_quantity=reconciled_quantity+received+returned+missing,metadata=metadata||jsonb_build_object('issueOpen',(line_plan->>'unknownQuantity')::numeric>0,'administrativeRegularizationId',case_id,'physicalUnknownQuantity',line_plan->>'unknownQuantity') where id=l.id;
    outcome_lines:=outcome_lines||jsonb_build_array(line_plan||jsonb_build_object('movementIds',movement_ids));
   end loop;
   action_state:='approved';update public.operational_documents set status='administratively_closed' where id=p_id;
  else action_state:='rejected';end if;
  decision_fact:=jsonb_build_object('action',p_action,'actorId',auth.uid(),'actorName',(select full_name from public.profiles where id=auth.uid()),'recordedAt',now_at,'reason',btrim(p_body->>'reason'),'version',d.version+1,'intent',p_body,'lines',outcome_lines);
  update public.delivery_regularizations set state=action_state,decision=decision_fact where id=case_id;
 elsif p_action='withdraw_regularization' then
  perform private.require_regularization_authority(d.care_recipient_id);
  if (p_body-'caseId'-'reason')<>'{}' or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(btrim(p_body->>'reason')) not between 3 and 1000 then raise exception 'invalid regularization closure' using errcode='22023';end if;
  if c.proposed_by=auth.uid() then action_state:='withdrawn';
  elsif c.reference_version<>d.version or not private.regularization_authority(d.care_recipient_id,c.proposed_by) or not private.regularization_authority(d.care_recipient_id,c.reviewer_id) then action_state:='obsolete';
  else raise exception 'only regularization proposer may withdraw' using errcode='42501';end if;
  decision_fact:=jsonb_build_object('action',p_action,'actorId',auth.uid(),'actorName',(select full_name from public.profiles where id=auth.uid()),'recordedAt',now_at,'reason',btrim(p_body->>'reason'),'version',d.version+1,'intent',p_body,'lines','[]'::jsonb);
  update public.delivery_regularizations set state=action_state,decision=decision_fact where id=case_id;
 else
  if (p_body-'caseId'-'text')<>'{}' or jsonb_typeof(p_body->'text') is distinct from 'string' or length(btrim(p_body->>'text')) not between 3 and 2000 then raise exception 'invalid regularization finding' using errcode='22023';end if;
  perform private.require_cap(d.care_recipient_id,'ent.follow_up');
  if auth.uid() is distinct from c.follow_up_owner_id or not private.regularization_follow_up_eligible(d.care_recipient_id,auth.uid()) or c.state<>'approved' or (c.proposal->>'unknownQuantity')::numeric<=0 or c.id is distinct from (private.delivery_regularization_context(p_id)->>'currentId')::uuid then raise exception 'only assigned follow-up owner may report current finding' using errcode='42501';end if;
  insert into public.delivery_regularization_findings(regularization_id,document_id,care_recipient_id,actor_id,actor_name,body) values(case_id,p_id,d.care_recipient_id,auth.uid(),(select full_name from public.profiles where id=auth.uid()),btrim(p_body->>'text'));
 end if;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'ent.'||p_action,p_body,p_key);
 perform private.require_cap(d.care_recipient_id,'ent.read');
 if p_action='record_regularization_finding' then perform private.require_cap(d.care_recipient_id,'ent.follow_up');if not private.regularization_follow_up_eligible(d.care_recipient_id,auth.uid()) then raise exception 'follow-up authority unavailable' using errcode='42501';end if;else perform private.require_regularization_authority(d.care_recipient_id);end if;
 if p_action='propose_regularization' and not private.regularization_authority(d.care_recipient_id,reviewer) then raise exception 'regularization reviewer became unavailable' using errcode='42501';end if;
 if p_action='propose_regularization' and total_unknown>0 and not private.regularization_follow_up_eligible(d.care_recipient_id,owner_id) then raise exception 'regularization follow-up owner unavailable' using errcode='42501';end if;
 if (p_action='propose_regularization' or p_action='review_regularization' and accepted) and private.member_can(d.care_recipient_id,d.recipient_id,'ent.receive') then raise exception 'stale regularization facts' using errcode='P0001';end if;
 if p_action='review_regularization' and accepted and (c.proposal->>'unknownQuantity')::numeric>0 and not private.regularization_follow_up_eligible(d.care_recipient_id,c.follow_up_owner_id) then raise exception 'regularization follow-up owner unavailable' using errcode='42501';end if;
 if p_action='review_regularization' and accepted and not private.regularization_authority(d.care_recipient_id,c.proposed_by) then raise exception 'regularization proposer became unavailable' using errcode='42501';end if;
 if p_action='propose_regularization' or p_action='review_regularization' and accepted then
  for line_plan in select value from jsonb_array_elements(case when p_action='propose_regularization' then lines else c.proposal->'lines' end) loop
   if not exists(select 1 from public.care_recipient_products p where p.care_recipient_id=d.care_recipient_id and p.product_id=line_plan->>'productId' and p.unit=line_plan->>'unit' and p.quantity_decimals=(line_plan->>'quantityDecimals')::integer) then raise exception 'delivery unit reference changed' using errcode='P0001';end if;
  end loop;
 end if;
 return public.operational_document(p_id)||jsonb_build_object('commandOutcome',jsonb_build_object('state','committed','action',p_action,'requestId',case_id,'version',d.version+1));
end;$$;

create function private.delivery_task(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;c public.delivery_regularizations;request jsonb;pending numeric;begin
 select * into d from public.operational_documents where id=p_id;
 if not found or d.type<>'ENT' or not private.can(d.care_recipient_id,'ent.read') then return null;end if;
 select * into c from public.delivery_regularizations where document_id=p_id order by proposed_at desc,id desc limit 1;
 if c.state='pending' and c.reviewer_id=auth.uid() and private.regularization_authority(d.care_recipient_id,auth.uid()) then return jsonb_build_object('code','review_regularization','label','Conferir regularização administrativa');end if;
 if c.state='approved' and c.follow_up_owner_id=auth.uid() and (c.proposal->>'unknownQuantity')::numeric>0 and private.regularization_follow_up_eligible(d.care_recipient_id,auth.uid()) and not exists(select 1 from public.delivery_regularization_findings where regularization_id=c.id and actor_id=auth.uid()) then return jsonb_build_object('code','record_regularization_finding','label','Relatar apuração da pendência física');end if;
 request:=private.delivery_cancellation_request(p_id);
 if d.status='cancellation_pending' and d.recipient_id=auth.uid() and private.member_can(d.care_recipient_id,auth.uid(),'ent.receive') then return jsonb_build_object('code','cancellation','label','Decidir pedido de cancelamento');end if;
 if d.status='cancellation_pending' and request->>'requestedBy'=auth.uid()::text and private.member_can(d.care_recipient_id,auth.uid(),'ent.cancel') then return jsonb_build_object('code','withdraw_cancellation','label','Acompanhar ou retirar meu pedido de cancelamento');end if;
 if d.status in ('pending_receipt','disputed') and d.recipient_id=auth.uid() and private.member_can(d.care_recipient_id,auth.uid(),'ent.receive') then return jsonb_build_object('code',case d.status when 'pending_receipt' then 'receive' else 'resolve' end,'label',case d.status when 'pending_receipt' then 'Conferir meu recebimento' else 'Conciliar minha divergência' end);end if;
 if coalesce((private.delivery_regularization_context(p_id)->>'canPropose')::boolean,false) then return jsonb_build_object('code','propose_regularization','label','Encaminhar regularização de recebedor indisponível');end if;
 return null;
end;$$;

create function public.delivery_task_list(p_patient uuid,p_scope text default 'own',p_status text default 'tasks',p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 perform private.require_cap(p_patient,'ent.read');
 if p_scope is null or p_scope not in ('own','team') or p_status is null or p_status not in ('','tasks','pending_receipt','disputed','cancellation_pending','confirmed','cancelled','administratively_closed') or p_status='tasks' and p_scope<>'own' or p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 100 then raise exception 'invalid delivery filter' using errcode='22023';end if;
 with candidates as materialized(select d.id,d.type,d.code,d.protocol,d.status,d.created_at,d.recipient_id,d.version,
  case when p_status='tasks' then private.delivery_task(d.id) end task from public.operational_documents d
  where d.care_recipient_id=p_patient and d.type='ENT' and (p_status='tasks' or p_scope='team' or d.recipient_id=auth.uid())
  and (p_status in ('','tasks') or d.status=p_status)),
 filtered as materialized(select * from candidates where p_status<>'tasks' or task is not null),
 paged as(select * from filtered order by created_at desc,id offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('document_lines',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'fully_checked',l.fully_checked,'accepted_quantity',l.accepted_quantity::text,'quantity',l.quantity::text) order by l.id) from public.document_lines l where l.document_id=p.id),'[]')) order by p.created_at desc,p.id) from paged p),'[]'),'total',(select count(*) from filtered)) into result;
 return result;
end;$$;
revoke all on function private.delivery_task(uuid),public.delivery_task_list(uuid,text,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.delivery_task_list(uuid,text,text,integer,integer) to authenticated;

revoke all on function private.protect_delivery_regularization(),private.regularization_authority(uuid,uuid),private.require_regularization_authority(uuid),private.regularization_follow_up_eligible(uuid,uuid),private.delivery_regularization_context(uuid),private.command_delivery_regularization(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
do $migration$
declare definition text;anchor text;begin
 definition:=pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='select * into v_d from public.operational_documents where id=p_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'regularization entry anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if v_d.type=''ENT'' and p_action in (''propose_regularization'',''review_regularization'',''withdraw_regularization'',''record_regularization_finding'') then return private.command_delivery_regularization(p_id,p_action,p_body,p_key,p_version);end if;');
 definition:=pg_get_functiondef('public.operational_document(uuid)'::regprocedure);anchor:='return to_jsonb(d)||';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'regularization read anchor mismatch';end if;
 execute replace(definition,anchor,'return to_jsonb(d)||case when d.type=''ENT'' then jsonb_build_object(''deliveryRegularization'',private.delivery_regularization_context(p_id)) else ''{}''::jsonb end||');
 definition:=pg_get_functiondef('private.science_snapshot()'::regprocedure);anchor:='new.content_hash:=encode(extensions.digest(new.body::text,''sha256''),''hex'');';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'regularization snapshot anchor mismatch';end if;
 execute replace(definition,anchor,'if d.type=''ENT'' then new.body:=new.body||jsonb_build_object(''deliveryRegularization'',private.delivery_regularization_context(d.id));end if;'||E'\n '||anchor);
 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='elsif d.type=''ENT'' and p_action=''resolve'' then';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'regularization legacy boundary anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if not coalesce(private.member_can(d.care_recipient_id,d.recipient_id,''ent.receive''),false) then raise exception ''administrative regularization required'' using errcode=''22023'';end if;');
 definition:=pg_get_functiondef('private.delivery_cancellation_context(uuid)'::regprocedure);
 anchor:='request:=private.delivery_cancellation_request(p_id);if request is null then return null;end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'administrative cancellation history anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if d.status=''administratively_closed'' and request->>''status''=''pending'' then return jsonb_build_object(''request'',request,''history'',coalesce(d.workflow_data->''deliveryCancellationHistory'',''[]''::jsonb),''lines'',''[]''::jsonb,''sourceReady'',false,''historical'',true,''referenceHash'',null);end if;');
 definition:=pg_get_functiondef('public.stock_history(uuid,text,timestamptz,timestamptz,text,integer,integer)'::regprocedure);
 anchor:='s.reference_type,s.reference_id,';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'regularization stock trace anchor mismatch';end if;
 execute replace(definition,anchor,anchor||'case when s.reference_type=''delivery_regularization'' and private.can(p_patient,''ent.read'') then (select r.document_id from public.delivery_regularizations r where r.id=s.reference_id and r.care_recipient_id=p_patient) end reference_document_id,');
end;$migration$;
notify pgrst,'reload schema';
