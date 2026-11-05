CREATE OR REPLACE FUNCTION public.record_requisition_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
