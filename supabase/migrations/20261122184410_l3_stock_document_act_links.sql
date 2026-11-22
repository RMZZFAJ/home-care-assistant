-- Multi-material issuance, receipt and cancellation retain the originating
-- command key. Distinct commands on a single ENT or DEV remain distinct acts.
create table private.stock_document_acts (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null,
  document_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  actor_name text,
  command_key uuid not null,
  foreign key (document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
  unique (document_id, actor_id, command_key)
);
create table private.stock_document_act_movements (
  movement_id uuid primary key references public.stock_movements(id),
  act_id uuid not null references private.stock_document_acts(id)
);
create index stock_document_act_movements_act on private.stock_document_act_movements(act_id);
create index stock_document_acts_actor on private.stock_document_acts(actor_id);
alter table private.stock_document_acts enable row level security;
alter table private.stock_document_act_movements enable row level security;
revoke all on private.stock_document_acts,private.stock_document_act_movements from public,anon,authenticated,service_role;

create function private.move_stock(
  p_patient uuid,p_product text,p_quantity numeric,p_source text,p_destination text,
  p_reason text,p_reference text,p_id uuid,p_act uuid
) returns uuid language plpgsql set search_path='' as $$
declare
  movement uuid;
  act uuid;
  actor uuid := auth.uid();
begin
  if p_reference is distinct from 'document' or p_act is null or actor is null then
    raise exception 'stock document act requires its authorized command' using errcode='22023';
  end if;
  movement := private.move_stock(p_patient,p_product,p_quantity,p_source,p_destination,p_reason,p_reference,p_id);
  insert into private.stock_document_acts(care_recipient_id,document_id,actor_id,actor_name,command_key)
    values (p_patient,p_id,actor,(select full_name from public.profiles where id=actor),p_act)
    on conflict (document_id,actor_id,command_key) do nothing returning id into act;
  if act is null then
    select id into strict act from private.stock_document_acts
    where care_recipient_id=p_patient and document_id=p_id and actor_id=actor and command_key=p_act;
  end if;
  insert into private.stock_document_act_movements(movement_id,act_id) values(movement,act);
  return movement;
end;
$$;
revoke all on function private.move_stock(uuid,text,numeric,text,text,text,text,uuid,uuid)
  from public,anon,authenticated,service_role;

-- Only instrument calls that previously referenced the document itself.
-- Typed parcel and regularization references already name their own act.
do $migration$
declare
  procedure record;
  original text;
  next_definition text;
  marker text;
  occurrences integer;
begin
  for procedure in select * from (values
    ('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)','d.id',7),
    ('private.command_delivery_cancellation(uuid,text,jsonb,uuid,integer)','p_id',1),
    ('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)','d.id',1)
  ) as targets(signature,document_arg,expected_count)
  loop
    original := pg_get_functiondef(procedure.signature::regprocedure);
    marker := '''document'','||procedure.document_arg||')';
    occurrences := (length(original)-length(replace(original,marker,'')))/length(marker);
    if occurrences<>procedure.expected_count then
      raise exception 'stock document act anchor changed in %',procedure.signature;
    end if;
    next_definition := replace(original,marker,'''document'','||procedure.document_arg||',p_key)');
    execute next_definition;
  end loop;
end;
$migration$;

do $migration$
declare
  definition text := pg_get_functiondef('public.stock_operation_history(uuid,text,timestamptz,timestamptz,text,integer,integer,text,text)'::regprocedure);
  original text := definition;
begin
  definition := replace(definition, $anchor$when operation.id is not null then$anchor$,
    $edit$when document_act.id is not null then 'document:'||document_act.id
          when operation.id is not null then$edit$);
  definition := replace(definition, 'coalesce(operation.actor_name,application.actor_name,profile.full_name)',
    'coalesce(operation.actor_name,document_act.actor_name,application.actor_name,profile.full_name)');
  definition := replace(definition, 'left join private.family_stock_operation_movements batch',
    $edit$left join private.stock_document_act_movements document_movement on document_movement.movement_id=m.id
      left join private.stock_document_acts document_act on document_act.id=document_movement.act_id
        and document_act.care_recipient_id=p_patient and document_act.document_id=m.document_id
      left join private.family_stock_operation_movements batch$edit$);
  if definition=original or strpos(definition,'when document_act.id is not null')=0
    or strpos(definition,'coalesce(operation.actor_name,document_act.actor_name')=0
    or strpos(definition,'left join private.stock_document_acts document_act')=0
  then raise exception 'stock history document act anchors changed'; end if;
  execute definition;
end;
$migration$;
