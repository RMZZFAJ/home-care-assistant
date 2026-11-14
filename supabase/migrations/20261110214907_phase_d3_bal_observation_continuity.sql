-- Preserve prior physical observations privately when adopting a new BAL reference.
-- Existing 200KB limit, target, CAS, Auth, RLS and native confirmation remain unchanged.
CREATE OR REPLACE FUNCTION private.validate_creation_draft(p_kind text, p_content jsonb, p_target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare x jsonb;k text;v jsonb;

begin

 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>200000 then raise exception 'invalid private draft content' using errcode='22023';end if;

 if p_kind='BAL' and p_content ? 'previousObservations' then
  if jsonb_typeof(p_content->'previousObservations') is distinct from 'array'
   or jsonb_array_length(p_content->'previousObservations')>10 then
   raise exception 'invalid previous BAL observations' using errcode='22023';
  end if;
  for x in select value from jsonb_array_elements(p_content->'previousObservations') loop
   if x ? 'previousObservations' then raise exception 'nested BAL observations are not allowed' using errcode='22023';end if;
   perform private.validate_creation_draft('BAL',x,p_target);
  end loop;
  p_content:=p_content-'previousObservations';
 end if;
 if p_kind='REQ' then

  if p_target is not null or (p_content-array['lines','extraItems','observations','remainingNeed'])<>'{}'::jsonb

   or jsonb_typeof(p_content->'lines') is distinct from 'array' or jsonb_array_length(p_content->'lines')>1000

   or jsonb_typeof(p_content->'extraItems') is distinct from 'array' or jsonb_array_length(p_content->'extraItems')>20

   or jsonb_typeof(p_content->'observations') is distinct from 'array' or jsonb_array_length(p_content->'observations')>50 then raise exception 'invalid REQ draft' using errcode='22023';end if;

  for x in select value from jsonb_array_elements(p_content->'lines') loop

   if jsonb_typeof(x) is distinct from 'object' or (x-array['productId','productName','category','unit','currentStock','stockObservation','stockObservationAt','urgent','repeatReason'])<>'{}'::jsonb

    or not private.creation_draft_text(x->'productId',120) or length(x->>'productId')=0

    or not private.creation_draft_text(x->'productName',200) or not private.creation_draft_text(x->'unit',80,true)

    or coalesce(x->>'category','') not in ('medicamentos','higiene','dieta') or jsonb_typeof(x->'urgent') is distinct from 'boolean'

    or not private.creation_draft_text(x->'repeatReason',1000,true) then raise exception 'invalid REQ draft line' using errcode='22023';end if;

  end loop;

  for x in select value from jsonb_array_elements(p_content->'extraItems') loop

   if jsonb_typeof(x) is distinct from 'object' or (x-array['id','name','currentStock','stockObservation','stockObservationAt','urgent'])<>'{}'::jsonb

    or not private.creation_draft_text(x->'id',120) or length(x->>'id')=0 or not private.creation_draft_text(x->'name',200)

    or jsonb_typeof(x->'urgent') is distinct from 'boolean' then raise exception 'invalid REQ draft extra' using errcode='22023';end if;

  end loop;

  for x in select value from jsonb_array_elements((p_content->'lines')||(p_content->'extraItems')) loop

   if x ? 'currentStock' and jsonb_typeof(x->'currentStock') not in ('null','number','string')

    or jsonb_typeof(x->'currentStock')='string' and not private.creation_draft_text(x->'currentStock',64)

    or x ? 'stockObservation' and coalesce(x->>'stockObservation','') not in ('observed','unknown','unfilled','legacy_unclassified')

    or not private.creation_draft_time(x->'stockObservationAt') then raise exception 'invalid draft stock observation' using errcode='22023';end if;

  end loop;

  if exists(select 1 from jsonb_array_elements(p_content->'observations') z where not private.creation_draft_text(z,1000)) then raise exception 'invalid REQ draft observation' using errcode='22023';end if;

  if p_content ? 'remainingNeed' then

   x:=p_content->'remainingNeed';

   if jsonb_typeof(x) is distinct from 'object' or (x-array['requisitionId','version','reason'])<>'{}'::jsonb

    or not private.creation_draft_text(x->'requisitionId',36) or not private.creation_draft_uuid(x->'requisitionId') or jsonb_typeof(x->'version') is distinct from 'number'

    or (x->>'version')!~'^[1-9][0-9]{0,9}$' or not private.creation_draft_text(x->'reason',1000) then raise exception 'invalid remaining need draft' using errcode='22023';end if;

  end if;

 elsif p_kind='BAL' then

  if (p_content-array['counts','observationTimes','notes','materials','context'])<>'{}'::jsonb

   or jsonb_typeof(p_content->'counts') is distinct from 'object' or (select count(*) from jsonb_object_keys(p_content->'counts'))>1000

   or jsonb_typeof(p_content->'observationTimes') is distinct from 'object' or not private.creation_draft_text(p_content->'notes',3000)

   or jsonb_typeof(p_content->'materials') is distinct from 'array' or jsonb_array_length(p_content->'materials')>1000 then raise exception 'invalid BAL draft' using errcode='22023';end if;

  for k,v in select * from jsonb_each(p_content->'counts') loop

   if length(k) not between 1 and 120 or not private.creation_draft_text(v,64) then raise exception 'invalid draft physical count' using errcode='22023';end if;

  end loop;

  for k,v in select * from jsonb_each(p_content->'observationTimes') loop

   if not (p_content->'counts' ? k) or not private.creation_draft_time(v) then raise exception 'invalid draft count time' using errcode='22023';end if;

  end loop;

  for x in select value from jsonb_array_elements(p_content->'materials') loop

   if jsonb_typeof(x) is distinct from 'object' or (x-array['id','name','unit','quantityDecimals'])<>'{}'::jsonb

    or not private.creation_draft_text(x->'id',120) or not private.creation_draft_text(x->'name',200)

    or not private.creation_draft_text(x->'unit',80) or jsonb_typeof(x->'quantityDecimals') is distinct from 'number'

    or (x->>'quantityDecimals')!~'^[0-6]$' then raise exception 'invalid draft catalogue reference' using errcode='22023';end if;

  end loop;

  x:=p_content->'context';

  if jsonb_typeof(x) is distinct from 'object' or (x-array['mode','documentId','documentVersion','assignmentId','assignmentVersion','referenceRevision'])<>'{}'::jsonb

   or coalesce(x->>'mode','') not in ('legacy','scheduled') or (x->>'documentId')::uuid is distinct from p_target

   or not private.creation_draft_text(x->'assignmentId',36,true) or not private.creation_draft_uuid(x->'assignmentId') or not private.creation_draft_text(x->'referenceRevision',20,true)

   or x->'documentVersion'<>'null'::jsonb and (jsonb_typeof(x->'documentVersion') is distinct from 'number' or (x->>'documentVersion')!~'^[1-9][0-9]{0,9}$')

   or x->'assignmentVersion'<>'null'::jsonb and (jsonb_typeof(x->'assignmentVersion') is distinct from 'number' or (x->>'assignmentVersion')!~'^[1-9][0-9]{0,9}$') then raise exception 'invalid BAL draft context' using errcode='22023';end if;

 else raise exception 'unsupported private draft kind' using errcode='22023';end if;

end;$function$;
