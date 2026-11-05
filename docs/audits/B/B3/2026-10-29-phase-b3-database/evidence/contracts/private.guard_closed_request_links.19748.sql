CREATE OR REPLACE FUNCTION private.guard_closed_request_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if tg_table_name='document_request_links' then
 if exists(select 1 from public.requisition_items i join public.operational_documents d on d.id=i.requisition_id left join public.requisition_lifecycle s on s.requisition_id=d.id where i.id=new.requisition_item_id and (d.status='cancelled' or s.archived_at is not null)) then raise exception 'closed requisition cannot receive new links';end if;
 elsif new.type in ('COM','ENT') and new.status<>'draft' and old.status='draft' then
 if exists(select 1 from public.document_lines l join public.document_request_links k on k.document_line_id=l.id join public.requisition_items i on i.id=k.requisition_item_id join public.operational_documents d on d.id=i.requisition_id left join public.requisition_lifecycle s on s.requisition_id=d.id where l.document_id=new.id and (d.status='cancelled' or s.archived_at is not null)) then raise exception 'closed requisition cannot be dispatched';end if;
 end if;return new;
end;$function$
