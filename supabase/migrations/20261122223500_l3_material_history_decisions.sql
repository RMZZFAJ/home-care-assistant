-- The material panel reads movements by their native operation and keeps
-- documentary decisions on their own paginated projection.
do $migration$
declare
  definition text:=pg_get_functiondef('private.material_decision_history(uuid,text,uuid,integer)'::regprocedure);
  signature text:='private.material_decision_history(p_patient uuid, p_product text, p_line uuid, p_page integer)';
  movement_condition text:='where m.care_recipient_id=p_patient and m.product_id=p_product';
begin
  if (length(definition)-length(replace(definition,signature,'')))/length(signature)<>1
    or (length(definition)-length(replace(definition,movement_condition,'')))/length(movement_condition)<>1 then
    raise exception 'L3 material decision history contract drift';
  end if;
  definition:=replace(definition,signature,
    'private.material_history_slice(p_patient uuid, p_product text, p_line uuid, p_page integer, p_include_movements boolean)');
  execute replace(definition,movement_condition,
    'where p_include_movements and m.care_recipient_id=p_patient and m.product_id=p_product');
end
$migration$;

create or replace function private.material_decision_history(p_patient uuid,p_product text,p_line uuid,p_page integer)
returns jsonb language sql stable set search_path='' as $$
  select private.material_history_slice(p_patient,p_product,p_line,p_page,true)
$$;

create function public.material_documentary_history(
  p_patient uuid,p_product text,p_document uuid,p_line uuid,p_page integer
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  subject jsonb;
begin
  if p_page is null or p_page not between 1 and 1000000 then
    raise exception 'invalid material consultation' using errcode='22023';
  end if;
  if p_document is not null then
    if p_line is null or p_patient is not null or p_product is not null then
      raise exception 'invalid document material scope' using errcode='22023';
    end if;
    subject:=public.document_material_context(p_document,p_line,'stock',1,false);
  else
    if p_patient is null or p_line is not null or p_product is null then
      raise exception 'invalid catalogue material scope' using errcode='22023';
    end if;
    subject:=public.catalogue_material_context(p_patient,p_product,'stock',1);
  end if;
  return (subject-array['family','team','observations'])||jsonb_build_object('section','history','page',p_page)
    ||private.material_history_slice((subject->>'patientId')::uuid,subject->>'productId',p_line,p_page,false);
end;
$$;

revoke all on function private.material_history_slice(uuid,text,uuid,integer,boolean),
  public.material_documentary_history(uuid,text,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.material_documentary_history(uuid,text,uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
