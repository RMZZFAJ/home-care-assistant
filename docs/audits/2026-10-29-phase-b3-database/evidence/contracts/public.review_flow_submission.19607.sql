CREATE OR REPLACE FUNCTION public.review_flow_submission(p_id uuid, p_accept boolean, p_kind text, p_text text, p_lines jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.flow_submissions;v uuid;begin
 select * into strict s from public.flow_submissions where id=p_id for update;
 perform private.require_cap(s.care_recipient_id,'consumption.report');
 if s.user_id<>auth.uid() or p_accept is null then raise exception 'flow owner required' using errcode='42501';end if;
 if s.status<>'pending_confirmation' then return jsonb_build_object('status',s.status,'reportId',s.report_id);end if;
 if p_accept then
 v:=public.report_extraordinary_consumption(s.care_recipient_id,p_kind,'CARE_TEAM',p_text,p_lines,s.id);
 update public.flow_submissions set status='confirmed',report_id=v,reviewed_at=now() where id=s.id;
 else update public.flow_submissions set status='rejected',reviewed_at=now() where id=s.id;end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),case when p_accept then 'flow.confirmed' else 'flow.rejected' end,'flow_submission',s.id,
 jsonb_build_object('care_recipient_id',s.care_recipient_id,'report_id',v));
 return jsonb_build_object('status',case when p_accept then 'confirmed' else 'rejected' end,'reportId',v);
end;$function$
