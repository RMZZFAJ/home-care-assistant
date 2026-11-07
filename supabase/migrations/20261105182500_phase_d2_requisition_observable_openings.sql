-- An application display report is independent of SCI and never proves reading.
-- No backfill: old GETs, downloads and tacit SCI do not fabricate openings.
create table public.requisition_openings (
 id uuid primary key default gen_random_uuid(),
 requisition_id uuid not null references public.requisitions(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 user_id uuid not null references public.profiles(id),
 actor_name text,
 material_identity text not null check(material_identity ~ '^[0-9a-f]{64}$'),
 reference_version integer not null check(reference_version>0),
 opening_key uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 origin text not null default 'application_foreground_display_report' check(origin='application_foreground_display_report'),
 unique(user_id,opening_key)
);
create index requisition_openings_document_cursor on public.requisition_openings(requisition_id,recorded_at desc,id desc);
alter table public.requisition_openings enable row level security;
create policy requisition_openings_read on public.requisition_openings for select to authenticated
 using(private.auth_session() is not null and private.can(care_recipient_id,'req.read'));
revoke all on public.requisition_openings from public,anon,authenticated,service_role;
grant select on public.requisition_openings to authenticated;
create function private.keep_requisition_opening()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'requisition opening is immutable' using errcode='23514';end;$$;
create trigger requisition_opening_immutable before update or delete on public.requisition_openings
 for each row execute function private.keep_requisition_opening();

create function public.record_requisition_opening(p_id uuid,p_material_identity text,p_version integer,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r public.requisitions;opening public.requisition_openings;
begin
 if p_id is null or p_key is null or p_version is null or p_version<1 or p_material_identity is null or p_material_identity !~ '^[0-9a-f]{64}$' then
  raise exception 'invalid opening reference' using errcode='22023';end if;
 if private.auth_session() is null then raise exception 'required permission' using errcode='42501';end if;
 -- Serialize only this person's intention; another person's opening is independent.
 perform pg_advisory_xact_lock(hashtextextended('req-opening:'||auth.uid()::text||':'||p_key::text,0));
 select * into d from public.operational_documents where id=p_id and type='REQ';
 if not found or not coalesce(private.can(d.care_recipient_id,'req.read'),false) then raise exception 'required permission' using errcode='42501';end if;
 select * into strict r from public.requisitions where id=p_id;
 if r.material_identity is distinct from p_material_identity or p_version>d.version then raise exception 'stale document material' using errcode='PT409';end if;
 select * into opening from public.requisition_openings where user_id=auth.uid() and opening_key=p_key;
 if found then
  if opening.requisition_id is distinct from p_id or opening.material_identity is distinct from p_material_identity or opening.reference_version is distinct from p_version then raise exception 'idempotency conflict' using errcode='23505';end if;
  return to_jsonb(opening)||jsonb_build_object('recovered',true);
 end if;
 insert into public.requisition_openings(requisition_id,care_recipient_id,user_id,actor_name,material_identity,reference_version,opening_key)
 values(p_id,d.care_recipient_id,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_material_identity,p_version,p_key) returning * into opening;
 return to_jsonb(opening)||jsonb_build_object('recovered',false);
end;$$;
revoke all on function private.keep_requisition_opening(),public.record_requisition_opening(uuid,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_requisition_opening(uuid,text,integer,uuid) to authenticated;
