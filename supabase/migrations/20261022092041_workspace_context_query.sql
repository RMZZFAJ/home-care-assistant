-- Fetch the authorized workspace in one RPC instead of one HTTP pair per patient.
create function public.my_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare person public.profiles;is_global boolean;patients jsonb;begin
 select * into person from public.profiles where id=auth.uid() and status='active';
 if not found then raise exception 'active profile required' using errcode='42501';end if;
 is_global:=public.is_global_administrator();
 with authorized as materialized (
 select c.id,c.display_name,c.is_active,c.is_development,
 case when is_global then 'admin' else public.recipient_role(c.id)::text end role,
 public.patient_capabilities(c.id) capabilities
 from public.care_recipients c where public.can_access_recipient(c.id))
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('permissions',jsonb_build_object(
 'canManage',coalesce((a.capabilities->>'access.manage')::boolean,false),
 'canRequest',coalesce((a.capabilities->>'req.create')::boolean,false),
 'canManageStock',coalesce((a.capabilities->>'stock.family.manage')::boolean,false),
 'canCountStock',coalesce((a.capabilities->>'bal.count')::boolean,false))) order by a.display_name,a.id),'[]') into patients from authorized a;
 return jsonb_build_object('userId',person.id,'fullName',person.full_name,'isGlobalAdmin',is_global,'patients',patients,'avatarPath',person.avatar_path);
end;$$;
grant execute on function public.my_workspace() to authenticated;
