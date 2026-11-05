CREATE OR REPLACE FUNCTION private.science_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;begin
 select * into strict d from public.operational_documents where id=new.document_id;
 new.actor_name:=(select full_name from public.profiles where id=new.actor_id);
 new.authority_context:=case when new.actor_id is null then jsonb_build_object('mode','system') else coalesce(public.my_active_context(),(select jsonb_build_object('mode','verified_external','purpose',w.purpose) from private.worker_authority w where w.backend_pid=pg_backend_pid() and w.transaction_id=txid_current() and w.user_id=new.actor_id)) end;
 new.body:=new.body||jsonb_build_object('actorName',new.actor_name,'authority',new.authority_context,
 'history',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade registrada no evento legado' end),'createdAt',e.created_at,'version',e.version) order by e.version) from public.document_events e where document_id=new.document_id),'[]')||jsonb_build_array(jsonb_build_object('action',new.action,'actorName',coalesce(new.actor_name,'Sistema'),'createdAt',new.created_at,'version',new.version)));
 if d.type='REQ' then
 if new.action='req.issued' then perform private.init_requisition_science(new.document_id);end if;
 new.body:=new.body||jsonb_build_object('isHistorical',coalesce((select r.is_historical from public.requisitions r where r.id=d.id),false),'sciencePolicy',(select to_jsonb(s) from public.requisition_lifecycle s where requisition_id=new.document_id),
 'scienceEvents',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=new.document_id),'[]'),
 'fulfillmentLines',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'attended',exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents x on x.id=l.document_id where k.requisition_item_id=i.id and x.type='ENT' and x.status<>'cancelled' and l.accepted_quantity>0))) from public.requisition_items i where i.requisition_id=d.id),'[]'));
 end if;
 new.content_hash:=encode(extensions.digest(new.body::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=new.body,content_hash=new.content_hash where id=new.document_id;
 return new;
end;$function$
