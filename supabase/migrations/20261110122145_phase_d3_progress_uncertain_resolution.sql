-- A missing journal entry alone is never proof of rejection. Wait for the same
-- key,then use immutable key binding or a strictly advanced CAS revision.
create function public.progress_preparation_recovery(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.progress_preparations;c private.progress_preparation_commands;n private.document_progress_notes;h text;typ text;scope jsonb;status text;reason text;receipt jsonb;native_hash text;
begin
 if p_purpose is distinct from 'progress_note' or p_id is null or p_expected is null or p_expected<1 or p_key is null then raise exception 'invalid progress recovery' using errcode='22023';end if;
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select type into typ from public.operational_documents where id=p_target;
 perform private.validate_progress_preparation(jsonb_build_object('documentType',typ,'note',p_body),'{"version":1,"stage":"progress_note"}',typ);
 h:=encode(extensions.digest(jsonb_build_array('progress-preparation-commit',p_patient,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('progress-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select * into d from private.progress_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and document_id=p_target;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 select * into c from private.progress_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 scope:=jsonb_build_object('patientId',p_patient,'ownerId',auth.uid(),'targetResourceId',p_target,'key',p_key,'expectedRevision',p_expected,'content',p_body,'current',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state));
 if c.idempotency_key is not null and c.intent_hash=h then
  if d.state not in ('consumed','completed') then raise exception 'native progress invariant failed' using errcode='XX000';end if;
  return scope||jsonb_build_object('status','applied','confirmation',jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',private.progress_preparation_view(d)->'consumedResult','replayed',true));
 end if;
 select * into n from private.document_progress_notes where author_id=auth.uid() and idempotency_key=p_key;
 native_hash:=encode(extensions.digest(jsonb_build_object('documentId',p_target,'content',p_body)::text,'sha256'),'hex');
 if n.id is not null and n.intent_hash=native_hash and n.document_id=p_target then
  return scope||jsonb_build_object('status','applied_native','nativeResult',jsonb_build_object('note',private.progress_note_view(n),'key',p_key,'intentHash',n.intent_hash,'recovered',true));
 elsif n.id is not null or c.idempotency_key is not null then status:='not_applied';reason:='key_conflict';
 elsif d.revision>p_expected then
  if d.consumed_result->>'idempotencyKey'=p_key::text then raise exception 'native progress invariant failed' using errcode='XX000';end if;
  status:='not_applied';reason:='advanced_revision';
 else status:='unknown';reason:=null;end if;
 receipt:=private.progress_preparation_view(d)->'consumedResult';
 return scope||jsonb_build_object('status',status,'reason',reason,'receipt',receipt);
end;$$;
revoke all on function public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid) from public,anon,service_role;
grant execute on function public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid) to authenticated;
