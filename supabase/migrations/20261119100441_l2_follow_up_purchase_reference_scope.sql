do $migration$
declare
  definition text := pg_get_functiondef('private.document_follow_up_reference(uuid)'::regprocedure);
  anchor text := $old$exists(select 1 from public.purchase_receipts where document_id=p_id and state in ('pending','correction_requested'))$old$;
begin
  if strpos(definition,anchor)=0 then raise exception 'purchase receipt scope anchor missing'; end if;
  execute replace(definition,anchor,$new$exists(select 1 from public.purchase_receipts receipt
    where receipt.document_id=p_id and receipt.state in ('pending','correction_requested'))$new$);
end;
$migration$;
