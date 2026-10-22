-- Receipt provenance is derived from the verified server path, never from client JSON.
alter function public.supply_document_command(uuid,text,jsonb,uuid,integer) rename to audited_legacy_supply_command;
revoke all on function public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
create function public.supply_document_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare provider text:=nullif(current_setting('hca.verified_whatsapp_provider',true),'');begin
 if p_action='receive' and exists(select 1 from public.operational_documents where id=p_id and type='ENT') then
 p_body:=(p_body-'securityLevel'-'providerId')||case when provider is null then jsonb_build_object('securityLevel','authenticated_session')
 else jsonb_build_object('securityLevel','verified_phone_one_time_challenge','providerId',provider) end;
 end if;
 return public.audited_legacy_supply_command(p_id,p_action,p_body,p_key,p_version);
end;$$;
grant execute on function public.supply_document_command(uuid,text,jsonb,uuid,integer) to authenticated;

alter function public.accept_whatsapp_receipt(text,text,text) rename to verified_legacy_whatsapp_receipt;
revoke all on function public.verified_legacy_whatsapp_receipt(text,text,text) from public,anon,authenticated,service_role;
create function public.accept_whatsapp_receipt(p_provider_id text,p_phone text,p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous text:=current_setting('hca.verified_whatsapp_provider',true);result jsonb;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'signed webhook worker required' using errcode='42501';end if;
 perform set_config('hca.verified_whatsapp_provider',p_provider_id,true);
 begin
 result:=public.verified_legacy_whatsapp_receipt(p_provider_id,p_phone,p_hash);
 exception when others then perform set_config('hca.verified_whatsapp_provider',coalesce(previous,''),true);raise;end;
 perform set_config('hca.verified_whatsapp_provider',coalesce(previous,''),true);
 return result;
end;$$;
grant execute on function public.accept_whatsapp_receipt(text,text,text) to service_role;
