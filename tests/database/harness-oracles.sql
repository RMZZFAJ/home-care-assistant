begin;
create temporary table oracle_quantities(product text primary key, quantity numeric);
insert into oracle_quantities values('correct',3),('wrong',2),('null',null),('zero',0);
do $$declare candidate text; rejected boolean;
begin
  perform pg_temp.assert_quantity((select quantity from oracle_quantities where product='correct'),3,'positive control');
  perform pg_temp.assert_quantity((select quantity from oracle_quantities where product='zero'),0,'explicit zero control');
  foreach candidate in array array['wrong','null','missing'] loop
    rejected:=false;
    begin
      perform pg_temp.assert_quantity((select quantity from oracle_quantities where product=candidate),3,'invalid positive balance');
    exception when raise_exception then rejected:=true;end;
    if not rejected then raise exception 'quantity oracle accepted %',candidate;end if;
  end loop;
  -- The original predicate is deliberately retained here as the negative
  -- control: SQL NULL must demonstrate why it cannot guard the real workflow.
  if ((select quantity from oracle_quantities where product='missing')<>3) is not null then
    raise exception 'legacy NULL counterexample is no longer discriminating';
  end if;
end;$$;
select 'harness NULL oracles passed';
rollback;
