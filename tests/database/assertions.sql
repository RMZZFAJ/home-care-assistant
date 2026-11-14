-- Shared by the workflow assertions and the discriminating NULL controls.
create or replace function pg_temp.assert_quantity(actual numeric, expected numeric, label text)
returns void language plpgsql as $$
begin
  if expected is null or actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)',label,expected,actual;
  end if;
end;$$;
grant execute on function pg_temp.assert_quantity(numeric,numeric,text) to authenticated;
