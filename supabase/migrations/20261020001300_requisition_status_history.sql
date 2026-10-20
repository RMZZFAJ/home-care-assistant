-- Auditable status transitions and durable internal notification work items.
create table if not exists public.requisition_status_history (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions(id) on delete cascade,
  from_status public.requisition_status,
  to_status public.requisition_status not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  reason text check (reason is null or length(trim(reason)) between 1 and 1000)
);

create index if not exists requisition_status_history_requisition_idx
  on public.requisition_status_history(requisition_id, changed_at desc);

create or replace function public.record_requisition_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.requisition_status_history (
      requisition_id, from_status, to_status, changed_by
    ) values (
      new.id, old.status, new.status, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists requisition_status_transition_trigger on public.requisitions;
create trigger requisition_status_transition_trigger
after update of status on public.requisitions
for each row execute function public.record_requisition_status_transition();

insert into public.requisition_status_history (
  requisition_id, from_status, to_status, changed_by, changed_at
)
select r.id, null, r.status, r.created_by, r.created_at
from public.requisitions r
where not exists (
  select 1
  from public.requisition_status_history h
  where h.requisition_id = r.id
);

create or replace function public.enqueue_requisition_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.requisition_notifications (
    requisition_id, recipient_group, recipient_label, channel
  ) values (
    new.id, 'supervision', 'supervisão', 'internal'
  )
  on conflict (requisition_id, recipient_group, recipient_label, channel) do nothing;
  return new;
end;
$$;

drop trigger if exists requisition_notification_enqueue_trigger on public.requisitions;
create trigger requisition_notification_enqueue_trigger
after insert on public.requisitions
for each row execute function public.enqueue_requisition_notifications();

alter table public.requisition_status_history enable row level security;
create policy "users read scoped requisition status history"
  on public.requisition_status_history
  for select using (exists (
    select 1
    from public.requisitions r
    where r.id = requisition_id
      and public.can_access_recipient(r.care_recipient_id)
  ));

revoke all on public.requisition_status_history from public, anon;
grant select on public.requisition_status_history to authenticated;
