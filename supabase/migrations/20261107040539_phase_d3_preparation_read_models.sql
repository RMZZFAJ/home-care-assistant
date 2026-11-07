-- Metadata of the owner's preparation, not access to clinical quantities.
create function public.residence_preparation_page(p_page integer default 1,p_size integer default 20,p_query text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 50 or p_query is null or length(p_query)>160 then raise exception 'invalid preparation query' using errcode='22023';end if;
 with matching as materialized(select * from private.residence_preparations where owner_id=auth.uid() and state<>'discarded' and strpos(lower(coalesce(content->>'displayName','')),lower(btrim(p_query)))>0),
 page_rows as(select * from matching order by saved_at desc,id limit p_size offset((p_page::bigint-1)*p_size))
 select jsonb_build_object('total',(select count(*) from matching),'page',p_page,'pageSize',p_size,'data',coalesce((select jsonb_agg(private.residence_preparation_view(d) order by d.saved_at desc,d.id) from page_rows d),'[]'::jsonb)) into result;
 return result;
end;$$;
create function public.residence_preparation_status(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare d private.residence_preparations;result jsonb;begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 select * into d from private.residence_preparations where id=p_id and owner_id=auth.uid();
 if not found then raise exception 'preparation unavailable' using errcode='42501';end if;
 select jsonb_build_object('patientCreated',d.care_recipient_id is not null,'activeMemberships',(select count(*) from public.care_recipient_memberships where care_recipient_id=d.care_recipient_id and status='active'),
 'activeProducts',(select count(*) from public.care_recipient_products where care_recipient_id=d.care_recipient_id and is_active),
 'stockRecordsExist',exists(select 1 from public.stock_movements where care_recipient_id=d.care_recipient_id),
 'scheduleRecordsExist',exists(select 1 from public.scheduled_shifts where care_recipient_id=d.care_recipient_id),
 'balanceEnabled',exists(select 1 from public.bal_regimes where care_recipient_id=d.care_recipient_id and enabled),
 'guideConfigured',exists(select 1 from private.patient_guide_settings where care_recipient_id=d.care_recipient_id),
 'physicalVerification','PENDING_LOCAL_RESPONSIBLE','externalHomologation','PENDING_D_C','productionApproved',false) into result;
 return result;
end;$$;
alter function public.residence_preparation_command(uuid,integer,text,jsonb,integer,uuid) set schema private;
alter function private.residence_preparation_command(uuid,integer,text,jsonb,integer,uuid) rename to phase_d3_initial_preparation_command;
revoke all on function private.phase_d3_initial_preparation_command(uuid,integer,text,jsonb,integer,uuid) from public,anon,authenticated,service_role;
create function public.residence_preparation_command(p_id uuid,p_expected integer,p_action text,p_content jsonb,p_step integer,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 result:=private.phase_d3_initial_preparation_command(p_id,p_expected,p_action,p_content,p_step,p_key);
 if result->>'state'<>'discarded' then
  if p_content ? 'ownerId' and not exists(select 1 from public.profiles where id=(p_content->>'ownerId')::uuid and status='active')
   or p_content ? 'substituteId' and not exists(select 1 from public.profiles where id=(p_content->>'substituteId')::uuid and status='active')
   or p_content ?& array['ownerId','substituteId'] and p_content->>'ownerId'=p_content->>'substituteId' then
   raise exception 'active distinct owner and substitute required' using errcode='22023';end if;
 end if;
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 return result;
end;$$;
revoke all on function public.residence_preparation_page(integer,integer,text),public.residence_preparation_status(uuid),public.residence_preparation_command(uuid,integer,text,jsonb,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.residence_preparation_page(integer,integer,text),public.residence_preparation_status(uuid),public.residence_preparation_command(uuid,integer,text,jsonb,integer,uuid) to authenticated;
