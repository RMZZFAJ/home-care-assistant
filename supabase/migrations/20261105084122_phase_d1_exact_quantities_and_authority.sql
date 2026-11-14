-- D-A: reject precision loss at the untyped boundary, before numeric(18,6).
create or replace function private.require_exact_quantity(p_quantity numeric, p_decimals integer default 6, p_zero boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_quantity is null or p_quantity<0 or (not p_zero and p_quantity=0)
 or p_quantity>1000000000 or p_decimals is null or p_decimals not between 0 and 6
 or p_quantity<>round(p_quantity,p_decimals) then
  raise exception 'invalid exact product quantity' using errcode='22023';
 end if;
end;$$;
revoke all on function private.require_exact_quantity(numeric,integer,boolean) from public,anon,authenticated,service_role;

create or replace function private.move_stock(p_patient uuid,p_product text,p_quantity numeric,p_source text,p_destination text,p_reason text,p_reference text,p_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_decimals integer;
begin
 select quantity_decimals into v_decimals from public.care_recipient_products where care_recipient_id=p_patient and product_id=p_product;
 perform private.require_exact_quantity(p_quantity,v_decimals);
 insert into public.stock_movements(care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,destination_location,justification,reference_type,reference_id)
 values(p_patient,p_product,p_quantity,case when p_source is null then 'inbound'::public.stock_movement_type else 'outbound'::public.stock_movement_type end,
 auth.uid(),p_source,p_destination,p_reason,p_reference,p_id) returning id into v_id;
 return v_id;
end;$$;
revoke all on function private.move_stock(uuid,text,numeric,text,text,text,text,uuid) from public,anon,authenticated,service_role;

create or replace function public.family_stock_movement(p_patient uuid,p_product text,p_quantity numeric,p_action text,p_reason text,p_key uuid,p_reference uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.stock_movements;v_origin public.stock_movements;v_id uuid;h text;v_decimals integer;
begin
 perform private.require_cap(p_patient,'stock.family.manage');
 if p_action is null or p_action not in ('inbound','outbound','correction_in','correction_out')
 or length(trim(coalesce(p_reason,''))) not between 3 and 1000 or p_key is null then raise exception 'invalid family movement';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 -- Context/session or membership may have been revoked while waiting.
 perform private.require_cap(p_patient,'stock.family.manage');
 select quantity_decimals into v_decimals from public.care_recipient_products where care_recipient_id=p_patient and product_id=p_product;
 perform private.require_exact_quantity(p_quantity,v_decimals);
 h:=encode(extensions.digest(jsonb_build_array(p_patient,p_product,p_quantity,p_action,trim(p_reason),p_reference)::text,'sha256'),'hex');
 select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_key;
 if found then if v.payload_hash<>h then raise exception 'idempotency conflict' using errcode='23505';end if;return v.id;end if;
 if p_action in ('correction_in','correction_out') then
  select * into v_origin from public.stock_movements where id=p_reference and care_recipient_id=p_patient and product_id=p_product and reference_type='family_manual';
  if not found or not (
   p_action='correction_in' and v_origin.source_location='FAMILY' and v_origin.destination_location is null
   or p_action='correction_out' and v_origin.destination_location='FAMILY' and v_origin.source_location is null
  ) then raise exception 'invalid compensation reference' using errcode='22023';end if;
 elsif p_reference is not null then raise exception 'reference requires compensation action' using errcode='22023';
 end if;
 v_id:=private.move_stock(p_patient,p_product,p_quantity,case when p_action in ('outbound','correction_out') then 'FAMILY' end,case when p_action in ('inbound','correction_in') then 'FAMILY' end,trim(p_reason),'family_manual',p_reference);
 update public.stock_movements set idempotency_key=p_key,payload_hash=h where id=v_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.family.'||p_action,'stock_movement',v_id,jsonb_build_object('care_recipient_id',p_patient));
 return v_id;
end;$$;
revoke all on function public.family_stock_movement(uuid,text,numeric,text,text,uuid,uuid) from public,anon,service_role;
grant execute on function public.family_stock_movement(uuid,text,numeric,text,text,uuid,uuid) to authenticated;

-- A still signed JWT is not a live Auth session. Profile operations are global
-- identity operations and do not require selecting a patient.
create or replace function public.update_my_profile(p_name text,p_registration text,p_state text,p_category text,p_preferences jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if length(trim(coalesce(p_name,''))) not between 2 and 160 or length(coalesce(p_registration,''))>30
 or p_state is not null and p_state!~'^[A-Z]{2}$' or length(coalesce(p_category,''))>80
 or jsonb_typeof(p_preferences) is distinct from 'object' then raise exception 'invalid profile';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 update public.profiles set full_name=trim(p_name),professional_registration=nullif(trim(p_registration),''),professional_state=p_state,professional_category=p_category,notification_preferences=p_preferences where id=auth.uid() and status='active';
 if not found then raise exception 'profile unavailable' using errcode='42501';end if;
end;$$;
create or replace function public.set_my_avatar(p_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if private.auth_session() is null or p_path is null or p_path not like auth.uid()||'/%'
 or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=p_path) then raise exception 'invalid avatar' using errcode='42501';end if;
 update public.profiles set avatar_path=p_path where id=auth.uid() and status='active';
 if not found then raise exception 'profile unavailable' using errcode='42501';end if;
end;$$;
revoke all on function public.update_my_profile(text,text,text,text,jsonb),public.set_my_avatar(text) from public,anon,service_role;
grant execute on function public.update_my_profile(text,text,text,text,jsonb),public.set_my_avatar(text) to authenticated;
alter policy "users read own profile" on public.profiles using(id=auth.uid() and public.my_session_valid());
alter policy avatar_owner_insert on storage.objects with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.my_session_valid());
alter policy avatar_owner_read on storage.objects using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.my_session_valid());

-- Preserve existing workflow implementations and ACLs, with an exact anchor
-- for each additional authorization check after its blocking boundary.
do $migration$
declare target regprocedure;definition text;anchor text;guard text;item record;
begin
 for item in select * from (values
 ('public.submit_requisition(uuid,uuid,text,jsonb,jsonb,jsonb)',
  'perform pg_advisory_xact_lock(hashtextextended(''requisition-patient:''||p_care_recipient_id,0));',
  'perform private.require_cap(p_care_recipient_id,''req.create'');'),
 ('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)',
  'perform pg_advisory_xact_lock(hashtextextended(''document:''||auth.uid()||'':''||p_key,0));',
  'perform private.require_cap(p_patient,v_cap);'),
 ('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)',
  'select * into strict d from public.operational_documents where id=p_id for update;',
  'perform private.require_cap(p_patient,case d.type when ''BAL'' then ''bal.count'' else lower(d.type)||''.create'' end);'),
 ('public.confirm_extraordinary_consumption(uuid,boolean)',
  'select * into r from public.consumption_reports where id=p_id for update;',
  'perform private.require_cap(r.care_recipient_id,case r.location when ''FAMILY'' then ''stock.family.manage'' else ''consumption.confirm'' end);'),
 ('public.report_extraordinary_consumption(uuid,text,text,text,jsonb,uuid)',
  'perform pg_advisory_xact_lock(hashtextextended(''report:''||auth.uid()||p_key,0));',
  'perform private.require_cap(p_patient,''consumption.report'');'),
 ('public.acknowledge_requisition(uuid,text,integer)',
  'select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;',
  'perform private.require_cap(d.care_recipient_id,''req.science'');'),
 ('public.v4_review_archive_requisition(uuid,text)',
  'select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;',
  'perform private.require_cap(s.care_recipient_id,''req.archive'');')
 ) as changes(signature,after_text,permission_guard)
 loop
  target:=to_regprocedure(item.signature);
  if target is null then raise exception 'D1 authorization target missing: %',item.signature;end if;
  definition:=replace(replace(pg_get_functiondef(target),E'\r\n',E'\n'),E'\r',E'\n');
  anchor:=item.after_text;guard:=item.permission_guard;
  if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'D1 authorization anchor mismatch: %',item.signature;end if;
  execute replace(definition,anchor,anchor||E'\n '||guard);
 end loop;
end;$migration$;
