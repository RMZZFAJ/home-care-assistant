do $migration$
declare
  definition text := pg_get_functiondef('public.attachment_attempts(uuid,uuid,uuid,uuid)'::regprocedure);
  metadata constant text := $old$'created_at',a.created_at,'uploaded_by',a.uploaded_by,$old$;
begin
  if length(definition)-length(replace(definition,metadata,''))<>length(metadata) then
    raise exception 'attachment metadata projection changed';
  end if;
  execute replace(definition,metadata,$new$'created_at',a.created_at,'uploaded_by',a.uploaded_by,
  'uploadedName',case when p_document is not null and a.state='ready'
    then (select profile.full_name from public.profiles profile where profile.id=a.uploaded_by) end,
  'confirmedAt',a.confirmed_at,$new$);
end;
$migration$;
