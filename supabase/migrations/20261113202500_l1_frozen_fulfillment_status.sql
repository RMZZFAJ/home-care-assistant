-- Freeze the family's current service state independently of physical quantity.
do $l1$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('private.science_snapshot()'::regprocedure);
 anchor:='''attended'',(private.requisition_item_service(i.id)=''fulfilled'')';
 if position(anchor in definition)=0 then raise exception 'L1 frozen fulfillment source drift'; end if;
 execute replace(definition,anchor,'''serviceStatus'',private.requisition_item_service(i.id),'||anchor);
end;$l1$;
