-- Read only the authenticated actor's existing native journal;never creates/replays a command.
create function public.schedule_confirmation(p_patient uuid,p_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare old private.schedule_commands;scope jsonb;
begin
 if auth.uid() is null or not public.can_access_recipient(p_patient) then
  raise exception 'schedule authorization required' using errcode='42501';
 end if;
 if p_key is null then raise exception 'invalid schedule confirmation' using errcode='22023';end if;
 scope:=jsonb_build_object('careRecipientId',p_patient,'userId',auth.uid(),'idempotencyKey',p_key);
 select * into old from private.schedule_commands
 where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if not found then return scope||jsonb_build_object('found',false);end if;
 return scope||jsonb_build_object('found',true,
  'command',jsonb_build_object('action',old.request->'action','body',old.request->'body'),
  'expectedVersion',old.request->'version','recordedAt',old.created_at,
  'result',jsonb_build_object('id',old.result->'id','status',old.result->'status','version',old.result->'version'));
end;$$;
revoke all on function public.schedule_confirmation(uuid,uuid) from public,anon,service_role;
grant execute on function public.schedule_confirmation(uuid,uuid) to authenticated;
