do $migration$
declare
  definition text := pg_get_functiondef('private.delivery_cancellation_context(uuid)'::regprocedure);
  loop_anchor text := ' for l in select * from public.document_lines where document_id=p_id order by product_id,id loop';
  result_anchor text := ' result:=jsonb_build_object(';
  start_at integer := strpos(definition,loop_anchor);
  result_at integer := strpos(definition,result_anchor);
begin
  if start_at=0 or result_at<=start_at then
    raise exception 'delivery cancellation basis anchors missing';
  end if;
  execute $basis$
    create function private.delivery_cancellation_basis(p_id uuid) returns jsonb
    language plpgsql stable set search_path='' as $body$
    declare d public.operational_documents;l public.document_lines;legacy record;
      pool jsonb;entry jsonb;source_refs jsonb;lines jsonb:='[]';
      idx integer;decimals integer;need numeric;free numeric;used numeric;available numeric;cutoff timestamptz;
      has_unknown boolean:=false;line_unknown boolean;transit numeric:=0;
    begin
      select * into strict d from public.operational_documents where id=p_id;
      if not private.can(d.care_recipient_id,'ent.read')
        or not private.can(d.care_recipient_id,case when d.payload->>'destination'='FAMILY' then 'stock.family.read' else 'stock.team.read' end) then
        raise exception 'delivery stock custody read required' using errcode='42501';
      end if;
  $basis$ || substr(definition,start_at,result_at-start_at) || $basis$
      return jsonb_build_object('lines',lines,'sourceReady',not has_unknown,'unresolvedTransit',transit::text);
    end;$body$
  $basis$;

  execute substr(definition,1,start_at-1) || $context$
    result:=jsonb_build_object('request',request,'history',coalesce(d.workflow_data->'deliveryCancellationHistory','[]'::jsonb),
      'referenceVersion',d.version)||private.delivery_cancellation_basis(p_id);
    return result||jsonb_build_object('referenceHash',encode(extensions.digest(result::text,'sha256'),'hex'));
    end;$function$
  $context$;
end;
$migration$;

revoke all on function private.delivery_cancellation_basis(uuid) from public,anon,authenticated,service_role;

create function public.delivery_cancellation_preview(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $body$
declare
  d public.operational_documents;
  result jsonb;
begin
  select * into d from public.operational_documents where id=p_id and type='ENT';
  if not found then raise exception 'delivery not found' using errcode='42501';end if;
  perform private.require_cap(d.care_recipient_id,'ent.read');
  perform private.require_cap(d.care_recipient_id,'ent.cancel');
  if d.status not in ('confirmed','disputed') or not (
    d.workflow_data ? 'acceptedAt' or exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0)
  ) then
    raise exception 'delivery changed before cancellation preview' using errcode='PT409';
  end if;
  if private.can(d.care_recipient_id,case when d.payload->>'destination'='FAMILY' then 'stock.family.read' else 'stock.team.read' end) then
    result:=private.delivery_cancellation_basis(p_id);
    result:=jsonb_build_object('sourceReady',result->'sourceReady','lines',(
      select coalesce(jsonb_agg(item-'consumptionReferences' order by ord),'[]'::jsonb)
      from jsonb_array_elements(result->'lines') with ordinality as source(item,ord)
    ));
  else
    result:=jsonb_build_object('sourceReady',false,'lines','[]'::jsonb);
  end if;
  return result||jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id,'version',d.version);
end;
$body$;

revoke all on function public.delivery_cancellation_preview(uuid) from public,anon,authenticated,service_role;
grant execute on function public.delivery_cancellation_preview(uuid) to authenticated;
