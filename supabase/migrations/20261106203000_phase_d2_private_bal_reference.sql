-- Private BAL entry no longer creates an operational draft merely to hold a
-- stock reference. Read the same ledger revision/quantities atomically instead.
create function public.balance_count_reference(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_access_recipient(p_patient) or not coalesce(private.can(p_patient,'bal.read'),false) then
  raise exception 'balance read required' using errcode='42501';end if;
 return jsonb_build_object('revision',private.team_revision(p_patient)::text,
  'quantities',coalesce((select jsonb_object_agg(c.product_id,private.stock_quantity(p_patient,c.product_id,'CARE_TEAM')::text)
   from public.care_recipient_products c where c.care_recipient_id=p_patient and c.is_active),'{}'::jsonb));
end;$$;
revoke all on function public.balance_count_reference(uuid) from public,anon,authenticated,service_role;
grant execute on function public.balance_count_reference(uuid) to authenticated;

-- Preserve the existing wrapper, signature, own-key comparisons and scheduled
-- assignment path. Only new legacy callers opt into this reviewed revision.
do $$declare body text;marker text:=' return public.fluent_pre_shift_create(p_patient,p_type,p_payload-''balanceContext''-''balanceAssignment'',p_key,p_draft);';begin
 body:=pg_get_functiondef('public.create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 if position(marker in body)=0 then raise exception 'legacy BAL creation marker missing';end if;
 body:=replace(body,marker,$guard$
 if p_type='BAL' and p_payload ? 'balanceReferenceRevision' then
  if not public.can_access_recipient(p_patient) or not coalesce(private.can(p_patient,'bal.read'),false) then
   raise exception 'balance read required' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  if not public.can_access_recipient(p_patient) or not coalesce(private.can(p_patient,'bal.read'),false) then
   raise exception 'balance read required' using errcode='42501';end if;
  if not exists(select 1 from public.operational_documents where care_recipient_id=p_patient and type='BAL' and created_by=auth.uid() and idempotency_key=p_key) then
   if jsonb_typeof(p_payload->'balanceReferenceRevision') is distinct from 'string'
    or coalesce(p_payload->>'balanceReferenceRevision','')!~'^[0-9]{1,20}$' then
    raise exception 'invalid balance reference' using errcode='22023';end if;
   if p_payload->>'balanceReferenceRevision' is distinct from private.team_revision(p_patient)::text then
    raise exception 'inventory reference changed' using errcode='PT409';end if;
  end if;
 end if;
$guard$||marker);
 execute body;
end;$$;
