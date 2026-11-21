-- Qualify the validator aggregate alias;preserve the applied authoring migration.
create or replace function private.validate_consumption_preparation(p_content jsonb,p_navigation jsonb,p_purpose text)
returns void language plpgsql set search_path='' as $$
declare f record;x jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or p_content-array['consumption','reference','referenceHash']<>'{}'::jsonb
 or not(p_content ?& array['consumption','reference','referenceHash']) or jsonb_typeof(p_content->'consumption') is distinct from 'object'
 or (p_content->'consumption')-array['kind','location','text','reason','lines','reminderId']<>'{}'::jsonb
 or not(p_content->'reference'='null'::jsonb or jsonb_typeof(p_content->'reference')='object')
 or not(p_content->'referenceHash'='null'::jsonb or jsonb_typeof(p_content->'referenceHash')='string' and p_content->>'referenceHash'~'^[0-9a-f]{64}$')
 or p_navigation is distinct from jsonb_build_object('version',1,'stage','consumption_preparation') then raise exception 'invalid consumption preparation' using errcode='22023';end if;
 for f in select * from jsonb_each((p_content->'consumption')-'lines') loop
  if jsonb_typeof(f.value) is distinct from 'string' or private.bal_comment_units(f.value#>>'{}')>(case when f.key='text' then 2000 when f.key='reason' then 1000 else 120 end) then raise exception 'invalid consumption field' using errcode='22023';end if;
 end loop;
 if jsonb_typeof(p_content->'consumption'->'lines') is distinct from 'array' or jsonb_array_length(p_content->'consumption'->'lines')>100 then raise exception 'invalid consumption private lines' using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_content->'consumption'->'lines') loop
  if jsonb_typeof(x) is distinct from 'object' or x-array['productId','name','unit','quantity']<>'{}'::jsonb or not(x ?& array['productId','name','unit','quantity']) then raise exception 'invalid consumption private line' using errcode='22023';end if;
  for f in select * from jsonb_each(x) loop
   if jsonb_typeof(f.value) is distinct from 'string' or private.bal_comment_units(f.value#>>'{}')>(case f.key when 'productId' then 120 when 'quantity' then 64 when 'unit' then 80 else 300 end) then raise exception 'invalid consumption private value' using errcode='22023';end if;
  end loop;
 end loop;
 if (select count(distinct entry->>'productId') from jsonb_array_elements(p_content->'consumption'->'lines') entry)<>jsonb_array_length(p_content->'consumption'->'lines') then raise exception 'duplicate consumption product' using errcode='22023';end if;
end;$$;
