-- Historical private recovery uses live read authority;new native writes remain active-only.
create or replace function private.require_consumption_preparation_scope(p_patient uuid,p_purpose text,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare location text;begin
 if p_purpose in ('consumption_report_family','consumption_report_team') then
  if p_target is distinct from p_patient then raise exception 'invalid consumption target' using errcode='22023';end if;
  location:=case p_purpose when 'consumption_report_family' then 'FAMILY' else 'CARE_TEAM' end;
 elsif p_purpose in ('consumption_supplement','consumption_accept','consumption_reject') then
  select r.location into location from public.consumption_reports r where r.id=p_target and r.care_recipient_id=p_patient;
  if not found then raise exception 'consumption reference unavailable' using errcode='42501';end if;
 else raise exception 'invalid consumption purpose' using errcode='22023';end if;
 if not private.can(p_patient,case location when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end) then raise exception 'consumption preparation read required' using errcode='42501';end if;
 if p_write then
  if p_purpose in ('consumption_report_family','consumption_report_team','consumption_supplement') then perform private.require_consumption_report(p_patient,location);
  else perform private.require_cap(p_patient,case location when 'FAMILY' then 'stock.family.manage' else 'consumption.confirm' end);end if;
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient' using errcode='42501';end if;
 end if;
end;$$;

create or replace function private.consumption_preparation_snapshot(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare report jsonb;catalog jsonb;reminder jsonb;location text;ledger text;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 if p_purpose in ('consumption_report_family','consumption_report_team') then location:=case p_purpose when 'consumption_report_family' then 'FAMILY' else 'CARE_TEAM' end;
 else
  select jsonb_build_object('id',r.id,'version',r.version,'kind',r.kind,'location',r.location,'status',r.status,'body',r.body,'reportedBy',r.reported_by,'reportedName',r.reported_name,'createdAt',r.created_at,'lines',private.consumption_current_lines(r.id),'lastSupplement',(select to_jsonb(v)-'idempotency_key'-'submitted_intent' from public.consumption_report_revisions v where v.report_id=r.id order by v.version desc limit 1)) into report from public.consumption_reports r where r.id=p_target and r.care_recipient_id=p_patient;
  location:=report->>'location';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active) order by c.product_id),'[]'::jsonb) into catalog
 from public.care_recipient_products c where c.care_recipient_id=p_patient and (exists(select 1 from jsonb_array_elements(p_fields->'lines') x where x->>'productId'=c.product_id)
 or exists(select 1 from jsonb_array_elements(coalesce(report->'lines','[]'::jsonb)) x where x->>'productId'=c.product_id));
 if nullif(p_fields->>'reminderId','') is not null then
  if p_purpose<>'consumption_report_team' then raise exception 'invalid reminder scope' using errcode='42501';end if;
  reminder:=public.notification_reference(p_patient,(p_fields->>'reminderId')::uuid,'consumption','reminder');
  if reminder->>'kind' is distinct from 'shift_reminder' then raise exception 'invalid reminder reference' using errcode='42501';end if;
 end if;
 if p_purpose='consumption_accept' then
  select encode(extensions.digest(coalesce(jsonb_agg(m.id order by m.id),'[]'::jsonb)::text,'sha256'),'hex') into ledger from public.stock_movements m where m.care_recipient_id=p_patient and (m.source_location=location or m.destination_location=location) and exists(select 1 from jsonb_array_elements(report->'lines') x where x->>'productId'=m.product_id);
 end if;
 return jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'location',location,'report',report,'catalog',catalog,'reminder',reminder,'ledgerHash',ledger);
end;$$;
