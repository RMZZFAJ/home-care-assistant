CREATE OR REPLACE FUNCTION private.apply_access_change(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.access_change_requests;x jsonb;a jsonb;invitation public.care_recipient_invitations;v_hash text;v_email text;begin
 select * into strict c from public.access_change_requests where id=p_id;
 x:=c.proposed;a:=x->'args';
 if not public.can_manage_recipient(c.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 if c.kind='membership' and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=c.care_recipient_id and user_id=(x->>'userId')::uuid and status='active') then
 select token_hash into v_hash from private.membership_invitation_intents where backend_pid=pg_backend_pid() and transaction_id=txid_current() and request_id=c.id;
 if v_hash is null then raise exception 'recipient invitation acceptance required' using errcode='23514';end if;
 select email into v_email from auth.users where id=(x->>'userId')::uuid and email_confirmed_at is not null;
 if v_email is null then raise exception 'confirmed intended identity required' using errcode='23514';end if;
 invitation:=public.admin_create_invitation(c.care_recipient_id,lower(v_email),(x->>'role')::public.profile_role,false,false,v_hash,now()+interval '7 days');
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 update public.access_change_requests set status='awaiting_acceptance',decided_at=now(),resolution=jsonb_build_object('invitationId',invitation.id,'invitationHash',v_hash) where id=c.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.approved.awaiting_acceptance','access_change',c.id,jsonb_build_object('care_recipient_id',c.care_recipient_id,'invitationId',invitation.id));return;
 elsif c.kind='notification_rule' then
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
end;$function$
