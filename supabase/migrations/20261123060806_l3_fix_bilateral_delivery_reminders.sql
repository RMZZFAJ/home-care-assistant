-- The system journal needs the frozen transfer facts, independently of the
-- viewer permissions and available actions on the interactive transfer page.
create function private.transfer_snapshot(t public.ent_transfers)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'state',t.state,'declaration',t.declaration,'agreement',t.agreement,
    'withdrawal',t.withdrawal,'dispatchedAt',t.dispatched_at,
    'originDocumentId',t.origin_document_id
  );
$$;
revoke all on function private.transfer_snapshot(public.ent_transfers)
  from public,anon,authenticated,service_role;

do $migration$
declare
  definition text;
  marker text;
begin
  definition:=pg_get_functiondef('private.transfer_facts(uuid)'::regprocedure);
  marker:=$before$return jsonb_build_object('state',t.state,'declaration',t.declaration,'agreement',t.agreement,'withdrawal',t.withdrawal,
   'dispatchedAt',t.dispatched_at,'originDocumentId',t.origin_document_id,$before$;
  if (length(definition)-length(replace(definition,marker,'')))<>length(marker) then
    raise exception 'transfer display contract drift';
  end if;
  execute replace(definition,marker,'return private.transfer_snapshot(t)||jsonb_build_object(');

  definition:=pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure);
  marker:=$before$if d.type='ENT' and exists(select 1 from public.ent_transfers where document_id=p_id) then s:=s||jsonb_build_object('transfer',private.transfer_facts(p_id)-array['canAgree','canDispatch','canWithdraw']);end if;$before$;
  if (length(definition)-length(replace(definition,marker,'')))<>length(marker) then
    raise exception 'transfer event contract drift';
  end if;
  execute replace(definition,marker,$after$
    if d.type='ENT' then
      s:=s||coalesce((
        select jsonb_build_object('transfer',private.transfer_snapshot(t))
        from public.ent_transfers t where t.document_id=p_id
      ),'{}'::jsonb);
    end if;
  $after$);
end;
$migration$;
