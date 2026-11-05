-- Historical REQ is a preserved read-only source, not a new operational need.
-- Existing links/physical facts remain untouched; a draft must remove such a
-- link or reference a new current REQ before its official transition.
create or replace function private.guard_closed_request_links()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='document_request_links' then
  if exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=new.requisition_item_id and r.is_historical)
   then raise exception 'historical requisition is read only' using errcode='23514';end if;
  if exists(select 1 from public.requisition_items i join public.operational_documents d on d.id=i.requisition_id left join public.requisition_lifecycle s on s.requisition_id=d.id where i.id=new.requisition_item_id and (d.status='cancelled' or s.archived_at is not null)) then raise exception 'closed requisition cannot receive new links';end if;
 elsif new.type in ('COM','ENT') and new.status<>'draft' and old.status='draft' then
  if exists(select 1 from public.document_lines l join public.document_request_links k on k.document_line_id=l.id join public.requisition_items i on i.id=k.requisition_item_id join public.requisitions r on r.id=i.requisition_id where l.document_id=new.id and r.is_historical)
   then raise exception 'historical requisition is read only' using errcode='23514';end if;
  if exists(select 1 from public.document_lines l join public.document_request_links k on k.document_line_id=l.id join public.requisition_items i on i.id=k.requisition_item_id join public.operational_documents d on d.id=i.requisition_id left join public.requisition_lifecycle s on s.requisition_id=d.id where l.document_id=new.id and (d.status='cancelled' or s.archived_at is not null)) then raise exception 'closed requisition cannot be dispatched';end if;
 end if;return new;
end;$$;
revoke all on function private.guard_closed_request_links() from public,anon,authenticated,service_role;
