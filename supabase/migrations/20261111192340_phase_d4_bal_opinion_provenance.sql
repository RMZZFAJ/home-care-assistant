-- Do not reinterpret old opinions which could themselves have applied stock.
-- Only new opinion-only records receive this explicit provenance marker.
do $$declare definition text;needle text;begin
 definition:=replace(pg_get_functiondef('private.command_bal_review(uuid,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 needle:='''appliedBeforeReview'',d.status=''approved'')';
 if length(definition)-length(replace(definition,needle,''))<>length(needle) then
  raise exception 'unexpected BAL review provenance boundary';end if;
 execute replace(definition,needle,'''appliedBeforeReview'',d.status=''approved'',''opinionOnly'',true)');
end;$$;
