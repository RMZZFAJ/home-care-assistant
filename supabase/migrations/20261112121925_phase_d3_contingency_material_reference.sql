begin;
-- Record only the exact unit/precision reviewed; reject a changed catalogue reference.
do $patch$ declare body text;begin
 body:=replace(pg_get_functiondef('private.contingency_content(uuid,jsonb)'::regprocedure),chr(13),'');
 if encode(extensions.digest(body,'sha256'),'hex')<>'2682931dec9dfeba058cb82d720c712fdc69dde1b6555f1226ab5b1b80f210df' then raise exception 'contingency content baseline drift';end if;
 body:=replace(body,$before$STABLE SECURITY DEFINER$before$,$after$VOLATILE SECURITY DEFINER$after$);
 body:=replace(body,$before$(line ?& array['productId','description','quantity','custody'])$before$,$after$(line ?& array['productId','description','quantity','custody','reviewedUnit','reviewedDecimals'])$after$);
 body:=replace(body,$before$x not in ('productId','description','quantity','custody')$before$,$after$x not in ('productId','description','quantity','custody','reviewedUnit','reviewedDecimals')$after$);
 body:=replace(body,$before$where care_recipient_id=p_patient and product_id=line->>'productId';$before$,$after$where care_recipient_id=p_patient and product_id=line->>'productId' for share;$after$);
 body:=replace(body,$before$else item:=null;end if;$before$,$after$else item:=null;end if;
  if line->'reviewedUnit' is distinct from coalesce(to_jsonb(item.unit),'null'::jsonb) or line->'reviewedDecimals' is distinct from coalesce(to_jsonb(item.quantity_decimals),'null'::jsonb) then raise exception 'contingency material reference changed' using errcode='PT409';end if;$after$);
 body:=replace(body,$before$jsonb_build_array(line||jsonb_build_object($before$,$after$jsonb_build_array((line-array['reviewedUnit','reviewedDecimals'])||jsonb_build_object($after$);
 execute body;
end;$patch$;
commit;
