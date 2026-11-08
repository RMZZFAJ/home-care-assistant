-- Catalogue identities are text, including historical and patient-prefixed IDs.
-- Correct the unpublished local prototype incrementally; no existing153 RPC or
-- official data changes. UUID array members retain their exact text identity.
do $migration$
declare src text;old text;
begin
 src:=pg_get_functiondef('public.save_requisition_selection(uuid,text,uuid[],uuid)'::regprocedure);
 old:='p_products uuid[]';
 if strpos(src,old)=0 or strpos(src,'ids uuid[]')=0 then raise exception 'selection prototype signature drift';end if;
 src:=replace(replace(src,old,'p_products text[]'),'ids uuid[]','ids text[]');
 old:='select array_agg(id order by id) into ids';
 if strpos(src,old)=0 then raise exception 'selection product validation drift';end if;
 src:=replace(src,old,'if exists(select 1 from unnest(p_products) member(id) where not private.creation_draft_text(to_jsonb(id),120) or id='''') then raise exception ''invalid selection material identity'' using errcode=''22023'';end if; '||old);
 alter table private.requisition_selections drop constraint requisition_selections_product_ids_check;
 alter table private.requisition_selections alter column product_ids type text[] using product_ids::text[];
 alter table private.requisition_selections add constraint requisition_selections_product_ids_check
  check(array_ndims(product_ids)=1 and cardinality(product_ids) between 1 and 1000 and array_position(product_ids,null::text) is null);
 drop function public.save_requisition_selection(uuid,text,uuid[],uuid);
 execute src;
end;
$migration$;
revoke all on function public.save_requisition_selection(uuid,text,text[],uuid) from public,anon,authenticated,service_role;
grant execute on function public.save_requisition_selection(uuid,text,text[],uuid) to authenticated;
notify pgrst,'reload schema';
