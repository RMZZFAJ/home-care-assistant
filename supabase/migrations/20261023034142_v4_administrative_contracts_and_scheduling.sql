alter table public.access_change_requests drop constraint access_change_requests_kind_check;
alter table public.access_change_requests add constraint access_change_requests_kind_check check(kind in ('capability','settings','membership','notification_rule','administration'));
alter function private.apply_access_change(uuid) rename to v3_apply_access_change;
create function private.apply_access_change(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.access_change_requests;x jsonb;a jsonb;begin
 select * into strict c from public.access_change_requests where id=p_id;
 x:=c.proposed;a:=x->'args';
 if not public.can_manage_recipient(c.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 if c.kind='notification_rule' then
 perform public.configure_notification_rule(c.care_recipient_id,x->>'event',x->>'role',array(select jsonb_array_elements_text(x->'channels')),coalesce((x->>'includePdf')::boolean,true),coalesce((x->>'cooldownMinutes')::integer,0),(x->>'quietStart')::integer,(x->>'quietEnd')::integer);
 update public.notification_event_rules set mode=coalesce(x->>'mode','optional') where care_recipient_id=c.care_recipient_id and event=x->>'event' and subject_role=x->>'role';
 elsif c.kind='capability' and x->'enabled'='null'::jsonb then
 delete from public.capability_overrides where care_recipient_id=c.care_recipient_id and capability=x->>'capability' and (subject_role=x->>'subjectRole' or subject_user=(x->>'subjectUser')::uuid);
 elsif c.kind='administration' then
 case x->>'operation'
 when 'recipient' then perform public.admin_upsert_recipient(c.care_recipient_id,a->>'displayName',(a->>'isActive')::boolean,(a->>'isDevelopment')::boolean);
 when 'product' then perform public.admin_upsert_recipient_product(c.care_recipient_id,a->>'id',a->>'name',(a->>'category')::public.product_category,a->>'unit',array(select jsonb_array_elements_text(a->'aliases')),(a->>'isActive')::boolean,a->>'description',coalesce((a->>'sortOrder')::integer,0));
 when 'adoptProduct' then perform public.admin_adopt_product(c.care_recipient_id,a->>'productId');
 when 'membershipStatus' then perform public.admin_set_membership_status(c.care_recipient_id,(a->>'userId')::uuid,a->>'status');
 when 'alertRule' then perform public.configure_stock_alert(c.care_recipient_id,a->>'productId',a->>'location',(a->>'lowThreshold')::numeric,(a->>'criticalThreshold')::numeric,(a->>'isEnabled')::boolean);
 when 'notificationRecipient' then perform public.configure_recipient_notification(c.care_recipient_id,(a->>'recipientUserId')::uuid,a->>'recipientGroup',a->>'channel',a->>'destination',(a->>'isEnabled')::boolean,coalesce((a->>'includeTeamAlerts')::boolean,false));
 else raise exception 'invalid administration operation';end case;
 else perform private.v3_apply_access_change(p_id);return;end if;
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 update public.access_change_requests set status='applied',decided_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'access.applied','access_change',p_id,jsonb_build_object('care_recipient_id',c.care_recipient_id,'kind',c.kind));
end;$$;
revoke all on function private.v3_apply_access_change(uuid),private.apply_access_change(uuid) from public,anon,authenticated,service_role;

alter function public.admin_upsert_recipient(uuid,text,boolean,boolean) rename to v3_admin_upsert_recipient;
revoke all on function public.v3_admin_upsert_recipient(uuid,text,boolean,boolean) from public,anon,authenticated,service_role;
create function public.admin_upsert_recipient(p_id uuid,p_display_name text,p_is_active boolean,p_is_development boolean) returns public.care_recipients
language plpgsql security definer set search_path='' as $$begin
 if p_id is not null and not public.can_manage_recipient(p_id) then raise exception 'global patient changes require local approval' using errcode='42501';end if;
 return public.v3_admin_upsert_recipient(p_id,p_display_name,p_is_active,p_is_development);
end;$$;
grant execute on function public.admin_upsert_recipient(uuid,text,boolean,boolean) to authenticated;

-- Exact decimal thresholds follow the catalogue precision, just like ledger quantities.
alter table public.stock_alert_rules alter column low_threshold type numeric(18,6),alter column critical_threshold type numeric(18,6);
revoke all on function public.configure_stock_alert(uuid,text,text,bigint,bigint,boolean) from public,anon,authenticated,service_role;
alter function public.configure_stock_alert(uuid,text,text,bigint,bigint,boolean) rename to v3_configure_stock_alert;
create function public.configure_stock_alert(p_care_recipient_id uuid,p_product_id text,p_location text,p_low_threshold numeric,p_critical_threshold numeric,p_is_enabled boolean)
returns public.stock_alert_rules language plpgsql security definer set search_path='' as $$
declare v public.stock_alert_rules;precision_limit integer;begin
 perform private.require_cap(p_care_recipient_id,'access.manage');
 select quantity_decimals into precision_limit from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p_product_id;
 if precision_limit is null or p_low_threshold is null or p_critical_threshold is null or p_low_threshold<0 or p_low_threshold>1000000000 or p_critical_threshold<0 or p_critical_threshold>p_low_threshold
 or p_low_threshold<>round(p_low_threshold,precision_limit) or p_critical_threshold<>round(p_critical_threshold,precision_limit) then raise exception 'invalid product threshold precision';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
 insert into public.stock_alert_rules(care_recipient_id,product_id,location,low_threshold,critical_threshold,is_enabled) values(p_care_recipient_id,p_product_id,p_location,p_low_threshold,p_critical_threshold,p_is_enabled)
 on conflict(care_recipient_id,product_id,location) do update set low_threshold=excluded.low_threshold,critical_threshold=excluded.critical_threshold,is_enabled=excluded.is_enabled returning * into v;
 perform public.evaluate_stock_alert(p_care_recipient_id,p_product_id,p_location);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.alert.configured','stock_alert_rule',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id));return v;
end;$$;
grant execute on function public.configure_stock_alert(uuid,text,text,numeric,numeric,boolean) to authenticated;

create function public.requisition_fulfillments(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if cardinality(p_ids)>100 then raise exception 'invalid batch';end if;
 if exists(select 1 from public.requisitions where id=any(p_ids) and not private.can(care_recipient_id,'req.read')) then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_object_agg(id,public.requisition_fulfillment(id)) from public.requisitions where id=any(p_ids)),'{}');
end;$$;
grant execute on function public.requisition_fulfillments(uuid[]) to authenticated;

create function public.patient_notification_rules(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.can(p_patient,'notifications.manage') and not public.is_global_administrator() then raise exception 'notification administration required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by event,subject_role) from public.notification_event_rules r where care_recipient_id=p_patient),'[]');
end;$$;
grant execute on function public.patient_notification_rules(uuid) to authenticated;

-- Automatic archive runs inside PostgreSQL even when no browser or HTTP worker is open.
-- External delivery is separately enabled through a Vault-backed, scoped HTTP schedule.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create function private.scheduled_operations() returns void language plpgsql security definer set search_path='' as $$
declare prior text:=current_setting('request.jwt.claims',true);begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.run_operational_schedule();
 perform set_config('request.jwt.claims',coalesce(prior,''),true);
exception when others then perform set_config('request.jwt.claims',coalesce(prior,''),true);raise;
end;$$;
select cron.schedule('hca-operational-lifecycle','* * * * *','select private.scheduled_operations()');
revoke all on function private.scheduled_operations() from public,anon,authenticated,service_role;
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all sequences in schema net from public,anon,authenticated;
