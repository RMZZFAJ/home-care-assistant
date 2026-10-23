create function public.operational_document_list(p_patient uuid,p_type text default null,p_status text default null,p_search text default null,p_from timestamptz default null,p_to timestamptz default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 if p_page not between 1 and 100000 or p_size not between 1 and 100 or p_type is not null and p_type not in ('REQ','COM','ENT','BAL') then raise exception 'invalid document filter';end if;
 with counts as materialized (
 select i.requisition_id,count(*) total,count(*) filter(where exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)) fulfilled
 from public.requisition_items i where i.care_recipient_id=p_patient group by i.requisition_id),
 visible as materialized (
 select d.id,d.type,d.code,d.protocol,d.recipient_id,d.created_at,d.version,
 case when d.type<>'REQ' or d.status in ('cancelled','draft') then d.status when s.archived_at is not null then 'archived'
 when s.completed_at is not null then case when private.science_satisfied(d.id) then 'completed' else 'completed_science_pending' end
 when coalesce(c.fulfilled,0)>0 then 'fulfillment_partial' when not coalesce(private.science_satisfied(d.id),false) then 'science_pending' else 'awaiting_fulfillment' end status,
 case when d.type='REQ' then jsonb_build_object('fulfilled',coalesce(c.fulfilled,0),'total',coalesce(c.total,0)) end fulfillment,
 case when d.type='REQ' then jsonb_build_object('scienceSatisfied',coalesce(private.science_satisfied(d.id),false),'completedAt',s.completed_at,'archivedAt',s.archived_at,'manualArchiveRequired',s.manual_archive_required) end progress,
 case when d.type='ENT' then coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'fully_checked',l.fully_checked,'accepted_quantity',l.accepted_quantity::text,'quantity',l.quantity::text)) from public.document_lines l where l.document_id=d.id),'[]') end document_lines
 from public.operational_documents d left join counts c on c.requisition_id=d.id left join public.requisition_lifecycle s on s.requisition_id=d.id
 where d.care_recipient_id=p_patient and private.can(p_patient,lower(d.type)||'.read') and (p_type is null or d.type=p_type)
 and (p_from is null or d.created_at>=p_from) and (p_to is null or d.created_at<p_to)
 and (p_search is null or d.code ilike '%'||p_search||'%' or d.protocol ilike '%'||p_search||'%')),
 filtered as materialized(select * from visible where p_status is null or status=p_status),
 paged as(select * from filtered order by created_at desc,id offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from paged p),'[]'),'total',(select count(*) from filtered),'page',p_page,'pageSize',p_size) into result;
 return result;
end;$$;
grant execute on function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer) to authenticated;

alter function public.operational_tasks(uuid) rename to v3_operational_tasks;
revoke all on function public.v3_operational_tasks(uuid) from public,anon,authenticated,service_role;
create function public.operational_tasks(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;open_count integer;science_count integer;archive_count integer;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 result:=public.v3_operational_tasks(p_patient);
 select count(*) filter(where s.completed_at is null),count(*) filter(where auth.uid()=any(s.eligible_users) and not exists(select 1 from public.requisition_science_events e where e.requisition_id=d.id and e.user_id=auth.uid())),
 count(*) filter(where s.completed_at is not null and public.can_manage_recipient(p_patient)) into open_count,science_count,archive_count
 from public.operational_documents d join public.requisition_lifecycle s on s.requisition_id=d.id where d.care_recipient_id=p_patient and d.type='REQ' and d.status not in ('draft','cancelled') and s.archived_at is null and private.can(p_patient,'req.read');
 return result||jsonb_build_object('requests',open_count,'sciencePending',science_count,'archivePending',archive_count);
end;$$;
grant execute on function public.operational_tasks(uuid) to authenticated;

create function private.deliver_internal_notifications() returns void language plpgsql security definer set search_path='' as $$begin
 update public.requisition_notifications n set state='delivered',delivered_at=now(),attempted_at=now(),attempts=attempts+1,provider_reference='internal'
 where n.id in(select x.id from public.requisition_notifications x join public.operational_documents d on d.id=x.document_id
 where x.channel='internal' and x.state='pending' and private.member_can(x.care_recipient_id,x.recipient_user_id,lower(d.type)||'.read') order by x.created_at for update of x skip locked limit 100);
end;$$;
create or replace function private.scheduled_operations() returns void language plpgsql security definer set search_path='' as $$
declare prior text:=current_setting('request.jwt.claims',true);begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.run_operational_schedule();perform private.deliver_internal_notifications();
 perform set_config('request.jwt.claims',coalesce(prior,''),true);
exception when others then perform set_config('request.jwt.claims',coalesce(prior,''),true);raise;
end;$$;
create extension if not exists supabase_vault with schema vault;
create function private.invoke_notification_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text;bearer text;begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='hca_worker_url';
 select decrypted_secret into bearer from vault.decrypted_secrets where name='hca_worker_bearer';
 if endpoint is distinct from 'https://home-care-assistant.vercel.app/api/notifications/worker' or length(coalesce(bearer,''))<32 then return;end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('content-type','application/json','authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=120000);
end;$$;
create function public.configure_worker_schedule(p_token text) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or length(p_token) not between 32 and 512 then raise exception 'scoped worker secret required' using errcode='42501';end if;
 select id into sid from vault.secrets where name='hca_worker_url';
 if sid is null then perform vault.create_secret('https://home-care-assistant.vercel.app/api/notifications/worker','hca_worker_url');
 else perform vault.update_secret(sid,'https://home-care-assistant.vercel.app/api/notifications/worker');end if;
 select id into sid from vault.secrets where name='hca_worker_bearer';
 if sid is null then perform vault.create_secret(p_token,'hca_worker_bearer');else perform vault.update_secret(sid,p_token);end if;
end;$$;
select cron.schedule('hca-notification-worker','* * * * *','select private.invoke_notification_worker()');
revoke all on function private.deliver_internal_notifications(),private.invoke_notification_worker() from public,anon,authenticated,service_role;
grant execute on function public.configure_worker_schedule(text) to service_role;
revoke usage on schema net from public,anon,authenticated;
