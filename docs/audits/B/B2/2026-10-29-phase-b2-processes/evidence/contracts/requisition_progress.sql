CREATE OR REPLACE FUNCTION public.requisition_progress(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 if not private.can(d.care_recipient_id,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 return jsonb_build_object('version',d.version,'preferences',(select notification_preferences from public.profiles where id=auth.uid()),'science',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=p_id),'[]'),
 'scienceSatisfied',coalesce(private.science_satisfied(p_id),false),'eligible',auth.uid()=any(s.eligible_users),
 'policy',s.policy,'completedAt',s.completed_at,'manualArchiveRequired',s.manual_archive_required,'archivedAt',s.archived_at,'archiveReason',s.archive_reason,
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'createdAt',e.created_at,'actorId',e.actor_id,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade do registro legado' end),'version',e.version) order by e.version)
 from public.document_events e left join public.profiles p on p.id=e.actor_id where e.document_id=p_id),'[]'));
end;$function$
