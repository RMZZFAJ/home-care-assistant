-- A family service evaluation is independent of permission/designation for SCI.
-- The caller must still have a live session and ent.create in the active patient.
create function private.family_fulfillment_authorized(p_patient uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.care_recipient_memberships m
  join public.profiles p on p.id=m.user_id
  join public.care_recipients c on c.id=m.care_recipient_id
  where m.care_recipient_id=p_patient and m.user_id=p_user
   and m.role::text in ('admin','family') and m.status='active'
   and p.status='active' and c.is_active
   and private.member_can(p_patient,p_user,'ent.create')
 );
$$;
revoke all on function private.family_fulfillment_authorized(uuid,uuid)
 from public,anon,authenticated,service_role;

do $repair$
declare signature text;definition text;
 old_guard text:='private.requisition_family_representative(d.care_recipient_id,auth.uid())';
 new_guard text:='private.family_fulfillment_authorized(d.care_recipient_id,auth.uid())';
begin
 foreach signature in array array[
  'private.capture_family_fulfillment()',
  'public.review_request_fulfillment(uuid,uuid,text,text,uuid,integer)'
 ] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if position(old_guard in definition)=0 then
   raise exception 'L1 family fulfillment authority guard drift';
  end if;
  execute replace(definition,old_guard,new_guard);
 end loop;
end;$repair$;
notify pgrst,'reload schema';
