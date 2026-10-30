CREATE OR REPLACE FUNCTION private.invalidate_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare row_data jsonb;pid uuid;u uuid;n bigint;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=(row_data->>'care_recipient_id')::uuid;
 for u in
  select affected.user_id from (
   select user_id from public.care_recipient_memberships where care_recipient_id=pid and status='active'
   union select (row_data->>'user_id')::uuid where row_data->>'user_id' is not null
  ) affected order by affected.user_id
 loop
  insert into private.workspace_revisions(user_id,revision) values(u,1)
  on conflict(user_id) do update set revision=private.workspace_revisions.revision+1 returning revision into n;
  perform realtime.send(jsonb_build_object('revision',n),'invalidate','hca:user:'||u::text,true);
 end loop;
 return null;
end;
$function$
