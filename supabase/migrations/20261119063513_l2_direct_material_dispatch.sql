-- New expeditions record the actual recipient and one physical movement.
-- Existing bilateral facts remain readable and old pending declarations can be dispatched.
alter table public.ent_transfers alter column counterparty_id drop not null;
alter table public.ent_transfers add constraint ent_transfers_dispatch_mode check (
  (counterparty_id is null)=(coalesce(declaration->>'mode','legacy')='direct')
  and (counterparty_id is not null or (state='dispatched' and dispatched_at is not null and agreement is null))
);

do $migration$
declare function_body text; anchor text;
begin
  function_body := pg_get_functiondef('public.create_transfer_declaration(uuid,jsonb,uuid)'::regprocedure);
  anchor := 'v_decl jsonb;begin';
  if strpos(function_body,anchor)=0 then raise exception 'transfer creation declaration anchor missing'; end if;
  function_body := replace(function_body,anchor,$b$v_decl jsonb;
  direct boolean := coalesce(p_body->>'mode'='direct',false);
begin
 perform private.require_cap(p_patient,'ent.read');
 if p_key is not null then
   perform pg_advisory_xact_lock(hashtextextended('transfer-intent:'||auth.uid()||':'||p_key,0));
 end if;$b$);
  anchor := $a$'source','counterpartyId','recipientId','originDocumentId','referenceHash','reason','lines'$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer creation body anchor missing'; end if;
  function_body := replace(function_body,anchor,anchor||$b$,'mode'$b$);
  anchor := $a$   or jsonb_typeof(p_body->'counterpartyId') is distinct from 'string' or coalesce(p_body->>'counterpartyId','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer party validation anchor missing'; end if;
  function_body := replace(function_body,anchor,$b$
   or (p_body ? 'mode' and not direct)
   or (direct and p_body ? 'counterpartyId')
   or (not direct and (jsonb_typeof(p_body->'counterpartyId') is distinct from 'string'
     or not coalesce(pg_input_is_valid(p_body->>'counterpartyId','uuid'),false)))$b$);
  anchor := $a$or not private.transfer_party_eligible(p_patient,v_counterparty,v_source)$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer counterparty authority anchor missing'; end if;
  function_body := replace(function_body,anchor,$b$or (not direct and not private.transfer_party_eligible(p_patient,v_counterparty,v_source))$b$);
  anchor := $a$if not private.transfer_party_eligible(p_patient,v_counterparty,v_source) or not private.transfer_party_eligible(p_patient,v_recipient,v_source)$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer final authority anchor missing'; end if;
  function_body := replace(function_body,anchor,$b$if (not direct and not private.transfer_party_eligible(p_patient,v_counterparty,v_source)) or not private.transfer_party_eligible(p_patient,v_recipient,v_source)$b$);
  anchor := $a$,'transfer_pending') returning * into d;$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer document state anchor missing'; end if;
  function_body := replace(function_body,anchor,$b$,case when direct then 'draft' else 'transfer_pending' end) returning * into d;$b$);
  anchor := $a$ insert into public.ent_transfers(document_id,care_recipient_id,initiator_id,counterparty_id,original_recipient_id,origin_document_id,state,declaration)
 values(v_id,p_patient,auth.uid(),v_counterparty,v_recipient,v_origin,'pending',v_decl);
 perform private.record_document_event(v_id,'ent.transfer.declared',p_body,p_key);
 perform private.enqueue_notice(p_patient,v_counterparty,'ent.transfer.declared',v_id);$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer launch anchor missing'; end if;
  function_body := replace(function_body,anchor,$b$
 if direct then
   v_decl := (v_decl-'counterparty')||jsonb_build_object('mode','direct');
   insert into public.ent_transfers(document_id,care_recipient_id,initiator_id,counterparty_id,original_recipient_id,
     origin_document_id,state,declaration,dispatched_at)
   values(v_id,p_patient,auth.uid(),null,v_recipient,v_origin,'dispatched',v_decl,clock_timestamp());
   perform public.fluent_pre_transfer_command(v_id,'submit','{}'::jsonb,p_key,d.version);
 else
  $b$||anchor||$b$
 end if;$b$);
  anchor := $a$if context->>'referenceHash' is distinct from private.transfer_preparation(p_patient,v_source)->>'referenceHash'$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer stock reference anchor missing'; end if;
  execute replace(function_body,anchor,$b$if not direct and context->>'referenceHash' is distinct from private.transfer_preparation(p_patient,v_source)->>'referenceHash'$b$);

  function_body := pg_get_functiondef('private.require_transfer_declaration_draft_intent(text,jsonb,jsonb)'::regprocedure);
  anchor := $a$or p_body->>'counterpartyId' is distinct from p_content#>>'{fields,counterpartyId}'$a$;
  if strpos(function_body,anchor)=0 then raise exception 'transfer draft intent anchor missing'; end if;
  execute replace(function_body,anchor,$b$or (p_body->>'mode' is distinct from 'direct'
    and p_body->>'counterpartyId' is distinct from p_content#>>'{fields,counterpartyId}')$b$);
end;
$migration$;

do $legacy$
declare function_body text; anchor text;
begin
  function_body:=pg_get_functiondef('private.guard_transfer_history()'::regprocedure);
  anchor:=$a$old.state='pending' and new.state in ('agreed','declined','withdrawn')$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer state guard anchor missing'; end if;
  execute replace(function_body,anchor,$b$old.state='pending' and new.state in ('agreed','declined','withdrawn','dispatched')$b$);

  function_body:=pg_get_functiondef('private.transfer_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor:=$a$if t.state<>'agreed' then raise exception 'transfer agreement required before dispatch'$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer command anchor missing'; end if;
  function_body:=replace(function_body,anchor,$b$if t.state not in ('pending','agreed') then raise exception 'transfer already dispatched or closed'$b$);
  anchor:=$a$not private.transfer_party_eligible(t.care_recipient_id,t.counterparty_id,v_source) or not private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,v_source)$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer recipient authority anchor missing'; end if;
  execute replace(function_body,anchor,$b$not private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,v_source)$b$);

  function_body:=pg_get_functiondef('private.require_transfer_draft_authority(uuid,text,boolean)'::regprocedure);
  anchor:=$a$not private.transfer_party_eligible(d.care_recipient_id,t.counterparty_id,source) or not private.transfer_party_eligible(d.care_recipient_id,t.original_recipient_id,source)$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer recovery authority anchor missing'; end if;
  execute replace(function_body,anchor,$b$not private.transfer_party_eligible(d.care_recipient_id,t.original_recipient_id,source)$b$);

  function_body:=pg_get_functiondef('private.transfer_facts(uuid)'::regprocedure);
  anchor:=$a$t.state='agreed' and auth.uid()=t.initiator_id$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer projection anchor missing'; end if;
  function_body:=replace(function_body,anchor,$b$t.state in ('pending','agreed') and auth.uid()=t.initiator_id$b$);
  anchor:=$a$private.transfer_party_eligible(t.care_recipient_id,t.counterparty_id,d.payload->>'source') and private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,d.payload->>'source')$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer projection authority anchor missing'; end if;
  execute replace(function_body,anchor,$b$private.transfer_party_eligible(t.care_recipient_id,t.original_recipient_id,d.payload->>'source')$b$);

  function_body:=pg_get_functiondef('private.delivery_task(uuid)'::regprocedure);
  anchor:=$a$   if (facts->>'canAgree')::boolean then return jsonb_build_object('code','transfer_decision','label','Decidir concordância da transferência');end if;$a$;
  if strpos(function_body,anchor)=0 then raise exception 'legacy transfer task anchor missing'; end if;
  execute replace(replace(function_body,anchor,''),'Expedir transferência com concordância registrada','Expedir materiais');
end;
$legacy$;
