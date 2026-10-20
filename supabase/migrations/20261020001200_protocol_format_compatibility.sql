-- Preserve historical protocols while accepting the new sequential format.
alter table public.requisitions
  drop constraint if exists requisitions_protocol_check;

alter table public.requisitions
  add constraint requisitions_protocol_format_check
  check (
    protocol ~ '^HC-[0-9]{8}-[A-Z0-9]{8}$'
    or protocol ~ '^HC-[0-9]{6}$'
  );
