-- Original statements remain immutable. Supplements and decisions are separate facts.
alter table public.consumption_reports add column version integer not null default 1 check(version>0),
 add column reported_name text, add column submitted_intent jsonb;
alter table public.consumption_reports alter column created_at set default clock_timestamp();
create index consumption_patient_page on public.consumption_reports(care_recipient_id,created_at desc,id desc);

create table public.consumption_report_revisions (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.consumption_reports(id),
 version integer not null check(version>1), actor_id uuid not null references public.profiles(id), actor_name text,
 body text not null, lines jsonb not null, submitted_intent jsonb not null, idempotency_key uuid not null,
 created_at timestamptz not null default clock_timestamp(), unique(report_id,version), unique(actor_id,idempotency_key)
);
create table public.consumption_report_decisions (
 id uuid primary key default gen_random_uuid(), report_id uuid not null unique references public.consumption_reports(id),
 version integer not null check(version>0), actor_id uuid not null references public.profiles(id), actor_name text,
 accepted boolean not null, reason text, snapshot jsonb not null, idempotency_key uuid not null,
 created_at timestamptz not null default clock_timestamp(), unique(actor_id,idempotency_key)
);
alter table public.consumption_report_revisions enable row level security;
alter table public.consumption_report_decisions enable row level security;
revoke all on public.consumption_report_revisions,public.consumption_report_decisions from public,anon,authenticated,service_role;
grant select on public.consumption_report_revisions,public.consumption_report_decisions to authenticated;
create policy consumption_revision_read on public.consumption_report_revisions for select to authenticated
 using(exists(select 1 from public.consumption_reports r where r.id=report_id));
create policy consumption_decision_read on public.consumption_report_decisions for select to authenticated
 using(exists(select 1 from public.consumption_reports r where r.id=report_id));
create trigger immutable_consumption_revision before update or delete on public.consumption_report_revisions for each row execute function private.immutable_event();
create trigger immutable_consumption_decision before update or delete on public.consumption_report_decisions for each row execute function private.immutable_event();

create function private.consumption_input(p_lines jsonb) returns jsonb language plpgsql set search_path='' as $$
declare x jsonb;q numeric;result jsonb:='[]';begin
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines)>100 then raise exception 'invalid consumption lines' using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_lines) loop
  if jsonb_typeof(x) is distinct from 'object' or (x-'productId'-'quantity'-'unit')<>'{}'::jsonb
   or jsonb_typeof(x->'productId') is distinct from 'string' or length(x->>'productId') not between 1 and 120
   or coalesce(x->>'quantity','') !~ '^[0-9]+([.][0-9]+)?$'
   or (x ? 'unit' and jsonb_typeof(x->'unit') is distinct from 'string') then raise exception 'invalid consumption line' using errcode='22023';end if;
  q:=(x->>'quantity')::numeric; perform private.require_exact_quantity(q,6);
  result:=result||jsonb_build_array(jsonb_build_object('productId',x->>'productId','quantity',q)||case when x ? 'unit' then jsonb_build_object('unit',x->>'unit') else '{}'::jsonb end);
 end loop;
 if (select count(distinct z->>'productId') from jsonb_array_elements(result) z)<>jsonb_array_length(result) then raise exception 'duplicate consumption product' using errcode='22023';end if;
 return coalesce((select jsonb_agg(z order by z->>'productId') from jsonb_array_elements(result) z),'[]'::jsonb);
end;$$;

create function private.consumption_lines(p_patient uuid,p_location text,p_lines jsonb) returns jsonb language plpgsql set search_path='' as $$
declare x jsonb;c public.care_recipient_products;q numeric;result jsonb:='[]';begin
 for x in select value from jsonb_array_elements(p_lines) loop
  select * into c from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId';
  if not found or (not c.is_active and not exists(select 1 from public.current_stock_balances b where b.care_recipient_id=p_patient and b.product_id=c.product_id and b.location=p_location and b.balance>0))
   or (x ? 'unit' and x->>'unit'<>c.unit) then raise exception 'invalid structured consumption' using errcode='22023';end if;
  q:=(x->>'quantity')::numeric;perform private.require_exact_quantity(q,c.quantity_decimals);
  result:=result||jsonb_build_array(jsonb_build_object('productId',c.product_id,'quantity',q::text,'unit',c.unit,'name',c.name));
 end loop;return result;
end;$$;

create function private.require_consumption_read(p_patient uuid,p_location text) returns void language plpgsql set search_path='' as $$
begin perform private.require_cap(p_patient,case p_location when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end);end;$$;
create function private.require_consumption_report(p_patient uuid,p_location text) returns void language plpgsql set search_path='' as $$
begin
 perform private.require_cap(p_patient,'consumption.report'); perform private.require_consumption_read(p_patient,p_location);
 if p_location='FAMILY' and public.recipient_role(p_patient) not in ('admin','family') then raise exception 'family scope required' using errcode='42501';end if;
end;$$;

create function private.consumption_current_lines(p_id uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce((select v.lines from public.consumption_report_revisions v where v.report_id=p_id order by v.version desc limit 1),(select r.lines from public.consumption_reports r where r.id=p_id));
$$;
create function public.consumption_report(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.consumption_reports;result jsonb;begin
 select * into r from public.consumption_reports where id=p_id;if not found then raise exception 'report not found';end if;
 perform private.require_consumption_read(r.care_recipient_id,r.location);
 result:=(to_jsonb(r)-'idempotency_key'-'submitted_intent')||jsonb_build_object(
  'current_lines',private.consumption_current_lines(p_id),
  'revisions',coalesce((select jsonb_agg(to_jsonb(v)-'idempotency_key'-'submitted_intent' order by v.version) from public.consumption_report_revisions v where v.report_id=p_id),'[]'::jsonb),
  'decision',(select to_jsonb(d)-'idempotency_key' from public.consumption_report_decisions d where d.report_id=p_id),
  'movements',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'productId',m.product_id,'quantity',m.quantity::text,'source',m.source_location,'destination',m.destination_location,'createdAt',m.created_at) order by m.created_at,m.id) from public.stock_movements m where m.reference_type='consumption' and m.reference_id=p_id and m.care_recipient_id=r.care_recipient_id),'[]'::jsonb));
 perform private.require_consumption_read(r.care_recipient_id,r.location);return result;
end;$$;

create or replace function public.report_extraordinary_consumption(p_patient uuid,p_kind text,p_location text,p_text text,p_lines jsonb,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.consumption_reports;input jsonb;intent jsonb;canonical jsonb;legacy_lines jsonb;begin
 perform private.require_consumption_report(p_patient,p_location);
 if p_kind is null or p_kind not in ('consumption','shortage') or p_location is null or p_location not in ('FAMILY','CARE_TEAM')
  or p_text is null or length(trim(p_text)) not between 3 and 2000 or p_key is null then raise exception 'invalid consumption report' using errcode='22023';end if;
 input:=private.consumption_input(p_lines);intent:=jsonb_build_object('kind',p_kind,'location',p_location,'text',p_text,'lines',input);
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 perform private.require_consumption_report(p_patient,p_location);
 select * into r from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;
 if found then
  if r.submitted_intent is null then
   select coalesce(jsonb_agg(jsonb_build_object('productId',z->>'productId','quantity',(z->>'quantity')::numeric) order by z->>'productId'),'[]'::jsonb) into legacy_lines from jsonb_array_elements(r.lines) z;
   if r.care_recipient_id<>p_patient or r.kind<>p_kind or r.location<>p_location or r.body<>p_text
    or (select coalesce(jsonb_agg(z-'unit' order by z->>'productId'),'[]'::jsonb) from jsonb_array_elements(input) z)<>legacy_lines
    or exists(select 1 from jsonb_array_elements(input) z where z ? 'unit' and not exists(select 1 from jsonb_array_elements(r.lines) old where old->>'productId'=z->>'productId' and old->>'unit'=z->>'unit')) then raise exception 'idempotency conflict' using errcode='23505';end if;
  elsif r.care_recipient_id<>p_patient or r.submitted_intent<>intent then raise exception 'idempotency conflict' using errcode='23505';end if;
  return r.id;
 end if;
 canonical:=private.consumption_lines(p_patient,p_location,input);
 insert into public.consumption_reports(care_recipient_id,reported_by,reported_name,kind,location,body,lines,idempotency_key,submitted_intent)
 values(p_patient,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_kind,p_location,p_text,canonical,p_key,intent) returning * into r;
 perform private.require_consumption_report(p_patient,p_location);return r.id;
end;$$;

create function public.supplement_consumption_report(p_id uuid,p_text text,p_lines jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.consumption_reports;previous public.consumption_report_revisions;input jsonb;intent jsonb;canonical jsonb;begin
 select * into r from public.consumption_reports where id=p_id;if not found then raise exception 'report not found';end if;
 perform private.require_consumption_report(r.care_recipient_id,r.location);
 if p_text is null or length(trim(p_text)) not between 3 and 2000 or p_key is null or p_version is null or p_version<1 then raise exception 'invalid consumption supplement' using errcode='22023';end if;
 input:=private.consumption_input(p_lines);intent:=jsonb_build_object('reportId',p_id,'text',p_text,'lines',input,'version',p_version);
 perform pg_advisory_xact_lock(hashtextextended('stock:'||r.care_recipient_id,0));
 select * into strict r from public.consumption_reports where id=p_id for update;perform private.require_consumption_report(r.care_recipient_id,r.location);
 select * into previous from public.consumption_report_revisions where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.submitted_intent<>intent then raise exception 'idempotency conflict' using errcode='23505';end if;
  return public.consumption_report(p_id)||jsonb_build_object('replayed',true);
 end if;
 if r.status<>'reported' then raise exception 'consumption decision conflict' using errcode='P0001';end if;
 if r.version<>p_version then raise exception 'stale consumption report' using errcode='P0001';end if;
 canonical:=private.consumption_lines(r.care_recipient_id,r.location,input);
 insert into public.consumption_report_revisions(report_id,version,actor_id,actor_name,body,lines,submitted_intent,idempotency_key)
 values(p_id,r.version+1,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_text,canonical,intent,p_key);
 update public.consumption_reports set version=version+1 where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'consumption.supplemented','consumption',p_id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'version',r.version+1));
 perform private.require_consumption_report(r.care_recipient_id,r.location);return public.consumption_report(p_id);
end;$$;

create function public.decide_consumption_report(p_id uuid,p_accept boolean,p_reason text,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.consumption_reports;previous public.consumption_report_decisions;cap text;lines jsonb;x jsonb;c public.care_recipient_products;q numeric;begin
 select * into r from public.consumption_reports where id=p_id;if not found then raise exception 'report not found';end if;
 cap:=case r.location when 'FAMILY' then 'stock.family.manage' else 'consumption.confirm' end;
 perform private.require_cap(r.care_recipient_id,cap);perform private.require_consumption_read(r.care_recipient_id,r.location);
 if p_accept is null or p_version is null or p_version<1 or p_key is null then raise exception 'invalid explicit consumption decision' using errcode='22023';end if;
 p_reason:=nullif(trim(p_reason),'');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||r.care_recipient_id,0));
 select * into strict r from public.consumption_reports where id=p_id for update;perform private.require_cap(r.care_recipient_id,cap);
 select * into previous from public.consumption_report_decisions where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.report_id<>p_id or previous.version<>p_version or previous.accepted<>p_accept or previous.reason is distinct from p_reason then raise exception 'idempotency conflict' using errcode='23505';end if;
  return public.consumption_report(p_id)||jsonb_build_object('replayed',true);
 end if;
 if r.status<>'reported' then
  select * into previous from public.consumption_report_decisions where report_id=p_id;
  if r.version<>p_version or (r.status='confirmed')<>p_accept or (previous.id is not null and previous.reason is distinct from p_reason) then raise exception 'consumption decision conflict' using errcode='P0001';end if;
  return public.consumption_report(p_id)||jsonb_build_object('replayed',true);
 end if;
 if r.version<>p_version then raise exception 'stale consumption report' using errcode='P0001';end if;
 if (not p_accept and (p_reason is null or length(p_reason) not between 3 and 1000)) or (p_accept and p_reason is not null) then raise exception 'invalid consumption decision reason' using errcode='22023';end if;
 lines:=private.consumption_current_lines(p_id);
 if p_accept and r.kind='consumption' then
  if jsonb_array_length(lines)=0 then raise exception 'structured consumption supplement required' using errcode='22023';end if;
  for x in select value from jsonb_array_elements(lines) loop
   select * into c from public.care_recipient_products where care_recipient_id=r.care_recipient_id and product_id=x->>'productId';
   if not found or c.unit<>x->>'unit' then raise exception 'invalid consumption unit reference' using errcode='22023';end if;
   q:=(x->>'quantity')::numeric;perform private.require_exact_quantity(q,c.quantity_decimals);
   perform private.move_stock(r.care_recipient_id,c.product_id,q,r.location,null,'Consumo extraordinário confirmado','consumption',p_id);
  end loop;
 end if;
 insert into public.consumption_report_decisions(report_id,version,actor_id,actor_name,accepted,reason,snapshot,idempotency_key)
 values(p_id,r.version,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_accept,p_reason,
  jsonb_build_object('original',to_jsonb(r)-'submitted_intent'-'idempotency_key','lines',lines,'revision',(select to_jsonb(v)-'submitted_intent'-'idempotency_key' from public.consumption_report_revisions v where v.report_id=p_id and v.version=r.version)),p_key);
 update public.consumption_reports set status=case when p_accept then 'confirmed' else 'rejected' end,confirmed_by=auth.uid(),confirmed_at=clock_timestamp() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'consumption.reviewed','consumption',p_id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'accepted',p_accept,'kind',r.kind,'version',r.version));
 perform private.require_cap(r.care_recipient_id,cap);return public.consumption_report(p_id);
end;$$;

-- Old direct callers may recover/confirm an untouched v1; supplements require a versioned decision.
create or replace function public.confirm_extraordinary_consumption(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.consumption_reports;begin
 select * into r from public.consumption_reports where id=p_id;if not found then raise exception 'report not found';end if;
 perform private.require_cap(r.care_recipient_id,case r.location when 'FAMILY' then 'stock.family.manage' else 'consumption.confirm' end);
 if p_accept is not null and r.status<>'reported' and (r.status='confirmed')<>p_accept then raise exception 'consumption decision conflict' using errcode='P0001';end if;
 if r.version<>1 then raise exception 'explicit consumption version required' using errcode='22023';end if;
 perform public.decide_consumption_report(p_id,p_accept,null,p_id,1);
end;$$;

create function private.preserve_consumption_original() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.care_recipient_id,new.reported_by,new.reported_name,new.kind,new.location,new.body,new.lines,new.idempotency_key,new.created_at,new.submitted_intent)
  is distinct from row(old.care_recipient_id,old.reported_by,old.reported_name,old.kind,old.location,old.body,old.lines,old.idempotency_key,old.created_at,old.submitted_intent) then raise exception 'consumption original is immutable';end if;
 return new;
end;$$;
create trigger preserve_consumption_original before update on public.consumption_reports for each row execute function private.preserve_consumption_original();

revoke all on function private.consumption_input(jsonb),private.consumption_lines(uuid,text,jsonb),private.require_consumption_read(uuid,text),private.require_consumption_report(uuid,text),private.consumption_current_lines(uuid),private.preserve_consumption_original() from public,anon,authenticated,service_role;
revoke all on function public.consumption_report(uuid),public.supplement_consumption_report(uuid,text,jsonb,uuid,integer),public.decide_consumption_report(uuid,boolean,text,uuid,integer),public.report_extraordinary_consumption(uuid,text,text,text,jsonb,uuid),public.confirm_extraordinary_consumption(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.consumption_report(uuid),public.supplement_consumption_report(uuid,text,jsonb,uuid,integer),public.decide_consumption_report(uuid,boolean,text,uuid,integer),public.report_extraordinary_consumption(uuid,text,text,text,jsonb,uuid),public.confirm_extraordinary_consumption(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
