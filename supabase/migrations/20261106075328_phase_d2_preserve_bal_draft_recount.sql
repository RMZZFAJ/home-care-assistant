-- Refreshing the ledger reference of a draft is not a physical count submission.
-- Retain the 114 recount path for submitted/approved BALs without applying drafts.
do $$declare d text;needle text;begin
 d:=replace(pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure),E'\r\n',E'\n');
 needle:='if d.type=''BAL'' and p_recount then';
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected BAL recount application boundary';end if;
 d:=replace(d,needle,'if d.type=''BAL'' and p_recount and d.status<>''draft'' then');
 execute d;
end;$$;
