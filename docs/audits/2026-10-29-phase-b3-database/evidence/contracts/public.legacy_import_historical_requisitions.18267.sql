CREATE OR REPLACE FUNCTION public.legacy_import_historical_requisitions(p_source_hash text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  b public.requisition_import_batches;x jsonb;v_lines jsonb;v_extras jsonb;v_observations jsonb;
  v_hash text;v_row_hash text;v_id uuid;v_recipient uuid;v_protocol text;
  v_report jsonb:='[]';v_imported integer:=0;v_rejected integer:=0;
begin
  if auth.uid() is null or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'invalid import';end if;
  -- Authorize every patient before replaying any report or processing rows.
  for x in select value from jsonb_array_elements(p_rows) loop
    v_recipient:=(x->>'careRecipientId')::uuid;
    if v_recipient is null or not public.recipient_can(v_recipient,'admin') then raise exception 'import authorization required' using errcode='42501';end if;
  end loop;
  v_hash:=encode(digest(p_rows::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('historical-import',0));
  select * into b from public.requisition_import_batches where source_hash=v_hash;
  if found then return jsonb_build_object('batchId',b.id,'total',b.total_rows,'imported',b.imported_rows,'rejected',b.rejected_rows,'report',b.report,'replayed',true);end if;
  insert into public.requisition_import_batches(source_hash,imported_by,total_rows) values(v_hash,auth.uid(),jsonb_array_length(p_rows)) returning * into b;
  for x in select value from jsonb_array_elements(p_rows) loop
    begin
      v_lines:=coalesce(x->'lines','[]'::jsonb);v_extras:=coalesce(x->'extraItems','[]'::jsonb);v_observations:=coalesce(x->'observations','[]'::jsonb);
      if jsonb_typeof(x) is distinct from 'object' or jsonb_typeof(x->'physicalProtocol') is distinct from 'number'
        or (x->>'physicalProtocol')!~'^[1-9]$|^1[01]$'
        or jsonb_typeof(v_lines) is distinct from 'array' or jsonb_array_length(v_lines)>1000
        or jsonb_typeof(v_extras) is distinct from 'array' or jsonb_array_length(v_extras)>20
        or jsonb_array_length(v_lines)+jsonb_array_length(v_extras)=0
        or jsonb_typeof(v_observations) is distinct from 'array' or jsonb_array_length(v_observations)>50
        or exists(select 1 from jsonb_object_keys(x) k where k not in ('physicalProtocol','careRecipientId','createdAt','requesterName','status','lines','extraItems','observations')) then raise exception 'invalid row';end if;
      v_recipient:=(x->>'careRecipientId')::uuid;v_protocol:='HC-'||lpad(x->>'physicalProtocol',6,'0');v_row_hash:=encode(digest(x::text,'sha256'),'hex');
      if exists(select 1 from public.requisitions where protocol=v_protocol) then raise exception 'duplicate protocol';end if;
      if exists(select 1 from jsonb_array_elements(v_lines) l where jsonb_typeof(l) is distinct from 'object'
        or jsonb_typeof(l->'productId') is distinct from 'string'
        or not exists(select 1 from public.care_recipient_products c where c.care_recipient_id=v_recipient and c.product_id=l->>'productId')
        or exists(select 1 from jsonb_object_keys(l) k where k not in ('productId','currentStock','urgent')))
        or exists(select 1 from jsonb_array_elements(v_lines) l group by l->>'productId' having count(*)>1) then raise exception 'invalid patient product';end if;
      if exists(select 1 from jsonb_array_elements(v_extras) e where jsonb_typeof(e) is distinct from 'object'
        or jsonb_typeof(e->'customName') is distinct from 'string' or length(trim(e->>'customName')) not between 1 and 200
        or exists(select 1 from jsonb_object_keys(e) k where k not in ('customName','currentStock','urgent'))) then raise exception 'invalid historical extra item';end if;
      if exists(select 1 from jsonb_array_elements(v_lines||v_extras) i where
        case when coalesce(jsonb_typeof(i->'currentStock'),'null')='null' then false
          when jsonb_typeof(i->'currentStock')='number' then (i->>'currentStock')!~'^[0-9]+$' or (i->>'currentStock')::numeric>100000
          else true end
        or (i ? 'urgent' and jsonb_typeof(i->'urgent') is distinct from 'boolean')) then raise exception 'invalid historical count';end if;
      if (x ? 'requesterName' and coalesce(jsonb_typeof(x->'requesterName'),'null') not in ('string','null'))
        or (x->>'requesterName' is not null and length(trim(x->>'requesterName')) not between 1 and 160)
        or (x ? 'createdAt' and coalesce(jsonb_typeof(x->'createdAt'),'null') not in ('string','null'))
        or (x ? 'status' and coalesce(jsonb_typeof(x->'status'),'null') not in ('string','null')) then raise exception 'invalid historical source facts';end if;
      if exists(select 1 from jsonb_array_elements(v_observations) o where jsonb_typeof(o) is distinct from 'string' or length(trim(o#>>'{}')) not between 1 and 1000) then raise exception 'invalid observation';end if;
      insert into public.requisitions(protocol,created_by,care_recipient_id,status,idempotency_key,payload_hash,is_historical,created_at,updated_at,requester_name_snapshot,recipient_name_snapshot)
      values(v_protocol,null,v_recipient,(x->>'status')::public.requisition_status,gen_random_uuid(),v_row_hash,true,(x->>'createdAt')::timestamptz,now(),nullif(trim(x->>'requesterName'),''),(select display_name from public.care_recipients where id=v_recipient)) returning id into v_id;
      insert into public.requisition_items(requisition_id,product_id,current_stock,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)
      select v_id,c.product_id,(l->>'currentStock')::integer,coalesce((l->>'urgent')::boolean,false),c.name,c.category::text,c.unit,'legacy_reconstructed'
      from jsonb_array_elements(v_lines) l join public.care_recipient_products c on c.care_recipient_id=v_recipient and c.product_id=l->>'productId';
      -- Preserve custom names literally. A coinciding catalogue name is not proof
      -- of a product identity and must never become an automatic association.
      insert into public.requisition_items(requisition_id,custom_name,current_stock,urgent,product_name_snapshot,snapshot_source)
      select v_id,trim(e->>'customName'),(e->>'currentStock')::integer,coalesce((e->>'urgent')::boolean,false),trim(e->>'customName'),'legacy_reconstructed'
      from jsonb_array_elements(v_extras) e;
      insert into public.requisition_observations(requisition_id,created_by,body) select v_id,auth.uid(),trim(value) from jsonb_array_elements_text(v_observations);
      insert into public.historical_requisition_imports(batch_id,physical_protocol,requisition_id,row_hash) values(b.id,(x->>'physicalProtocol')::integer,v_id,v_row_hash);
      v_imported:=v_imported+1;v_report:=v_report||jsonb_build_array(jsonb_build_object('row',x->>'physicalProtocol','status','imported'));
    exception when others then
      v_rejected:=v_rejected+1;v_report:=v_report||jsonb_build_array(jsonb_build_object('row',x->>'physicalProtocol','status','rejected','reason','invalid or duplicate record'));
    end;
  end loop;
  update public.requisition_import_batches set imported_rows=v_imported,rejected_rows=v_rejected,report=v_report where id=b.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'requisition.import.completed','requisition_import_batch',b.id,jsonb_build_object('imported',v_imported,'rejected',v_rejected));
  return jsonb_build_object('batchId',b.id,'total',jsonb_array_length(p_rows),'imported',v_imported,'rejected',v_rejected,'report',v_report,'replayed',false);
end; $function$
