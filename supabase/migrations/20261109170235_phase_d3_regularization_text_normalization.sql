-- Match ECMAScript trim at the sealed text boundary while preserving every raw draft character.
create or replace function private.require_regularization_draft_intent(p_purpose text,p_content jsonb,p_body jsonb) returns void
language plpgsql set search_path='' as $$
declare item jsonb;raw text;field text;trim_chars constant text:=U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';begin
 if p_purpose='record_regularization_finding' then
  if p_body->>'text' is distinct from btrim(p_content#>>'{fields,reason}',trim_chars) then raise exception 'private finding differs from confirmation' using errcode='22023';end if;
 elsif p_body->>'reason' is distinct from btrim(p_content#>>'{fields,reason}',trim_chars) then
  raise exception 'private regularization reason differs from confirmation' using errcode='22023';end if;
 if p_purpose<>'propose_regularization' then
  if p_content#>>'{fields,caseId}' is null or p_body->>'caseId' is distinct from p_content#>>'{fields,caseId}' then raise exception 'private regularization case differs from confirmation' using errcode='22023';end if;
  if p_purpose in ('approve_regularization','reject_regularization') and p_body->'accept' is distinct from to_jsonb(p_purpose='approve_regularization') then raise exception 'private regularization decision differs from confirmation' using errcode='22023';end if;
 else
  if p_body->>'basis' is distinct from btrim(p_content#>>'{fields,basis}',trim_chars)
   or p_body->>'reviewerId' is distinct from p_content#>>'{fields,reviewerId}'
   or p_body ? 'followUpOwnerId' and p_body->>'followUpOwnerId' is distinct from p_content#>>'{fields,followUpOwnerId}'
   or jsonb_typeof(p_body->'lines') is distinct from 'array'
   or jsonb_typeof(p_content->'materials') is distinct from 'array' then raise exception 'private regularization proposal differs from confirmation' using errcode='22023';end if;
  if jsonb_array_length(p_body->'lines')<>jsonb_array_length(p_content->'materials')
   or (select count(distinct x->>'lineId') from jsonb_array_elements(p_body->'lines') x)<>jsonb_array_length(p_body->'lines') then raise exception 'private regularization lines differ from confirmation' using errcode='22023';end if;
  for item in select * from jsonb_array_elements(p_body->'lines') loop
   if not exists(select 1 from jsonb_array_elements(p_content->'materials') m where m->>'id'=item->>'lineId') then raise exception 'private regularization line differs from confirmation' using errcode='22023';end if;
   foreach field in array array['receivedQuantity','returnedQuantity','missingQuantity'] loop
    raw:=p_content->'fields'->>((item->>'lineId')||':'||field);
    if coalesce(raw,'')!~'^[0-9]+([.,][0-9]{1,6})?$' or coalesce(item->>field,'')!~'^[0-9]+([.][0-9]{1,6})?$' then raise exception 'private regularization quantity is incomplete' using errcode='22023';end if;
    if replace(raw,',','.')::numeric is distinct from (item->>field)::numeric then raise exception 'private regularization quantity differs from confirmation' using errcode='22023';end if;
   end loop;
  end loop;
 end if;
end;$$;

revoke all on function private.require_regularization_draft_intent(text,jsonb,jsonb) from public,anon,authenticated,service_role;
