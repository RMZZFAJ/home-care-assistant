-- Match String.prototype.trim() while retaining the original text in private drafts.
create function private.schedule_balance_reason(p_reason text)
returns text language sql immutable strict set search_path='' as $$
  select btrim(p_reason,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;

revoke all on function private.schedule_balance_reason(text) from public,anon,authenticated,service_role;

do $migration$
declare
  edit record;
  definition text;
begin
  for edit in select * from (values
    ('private.schedule_balance_impact(uuid,text,jsonb)',
     $before$'canDecide',manage,'canDefer',defer,'targets',targets$before$,
     $after$'canDecide',manage,'canDefer',defer,'targets',targets,
    'obligationStart',case when manage then reference_start end$after$),
    ('private.schedule_resource_intent(private.schedule_resource_preparations)',
     $before$btrim(f#>>'{balanceImpact,reason}')$before$,
     $after$private.schedule_balance_reason(f#>>'{balanceImpact,reason}')$after$),
    ('private.prepare_schedule_balance_impact(uuid,text,public.scheduled_shifts,uuid,date,uuid,timestamptz,timestamptz,jsonb)',
     $before$btrim(p_impact->>'reason')$before$,
     $after$private.schedule_balance_reason(p_impact->>'reason')$after$),
    ('private.record_schedule_balance_impact(uuid,public.bal_assignments,jsonb,uuid)',
     $before$btrim(p_impact->>'reason')$before$,
     $after$private.schedule_balance_reason(p_impact->>'reason')$after$)
  ) as edits(signature,anchor,replacement)
  loop
    definition:=pg_get_functiondef(edit.signature::regprocedure);
    if length(definition)-length(replace(definition,edit.anchor,''))<>length(edit.anchor) then
      raise exception 'schedule balance contract changed for %',edit.signature;
    end if;
    execute replace(definition,edit.anchor,edit.replacement);
  end loop;
end;
$migration$;
