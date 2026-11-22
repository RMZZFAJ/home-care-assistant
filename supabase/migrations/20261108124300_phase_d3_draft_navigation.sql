-- Private navigation is not business content, authority or a confirmation command.
-- Nullable for historical drafts and older clients; no existing row is rewritten.
alter table private.creation_drafts add column navigation jsonb;

create function private.creation_draft_navigation_valid(p_navigation jsonb,p_kind text,p_purpose text,p_content jsonb)
returns boolean language sql immutable set search_path='' as $$
 select case
  when p_navigation is null then true
  when jsonb_typeof(p_navigation) is distinct from 'object' then false
  when (p_navigation-array['version','stage'])<>'{}'::jsonb
    or p_navigation->'version' is distinct from '1'::jsonb
    or jsonb_typeof(p_navigation->'stage') is distinct from 'string' then false
  else case
   when p_kind='ENT' and p_purpose='receive' then p_navigation->>'stage'='receipt'
   when p_kind='ENT' and p_purpose='divergence' then p_navigation->>'stage'='divergence'
   when p_purpose not in ('create','revise') then false
   when p_kind='REQ' and p_purpose='create' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','extras','notes','review'])
   when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   when p_kind='BAL' and p_content is null then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','count'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='scheduled' then p_navigation->>'stage'=any(array['count','review'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   else false end
 end is true;
$$;
revoke all on function private.creation_draft_navigation_valid(jsonb,text,text,jsonb) from public,anon,authenticated;
alter table private.creation_drafts add constraint creation_drafts_navigation_valid
 check(private.creation_draft_navigation_valid(navigation,kind,purpose,content));
comment on column private.creation_drafts.navigation is 'Optional versioned private wizard stage; excluded from content hash and official confirmation.';

-- Keep function identities, grants, locking, intent hashing, revision checks and
-- business validation intact. Refuse drift rather than replace an unknown body.
do $migration$
declare sig text;src text;old text;purpose_expr text;
begin
 foreach sig in array array[
  'public.creation_draft_command(uuid,text,uuid,uuid,integer,jsonb,uuid)',
  'public.supply_draft_command(uuid,text,text,uuid,uuid,integer,jsonb,uuid)'
 ] loop
  src:=pg_get_functiondef(sig::regprocedure);
  purpose_expr:=case when sig like 'public.supply_%' then 'p_purpose' else '''create''' end;
  old:='(p_body-array[''action'',''content''])<>''{}''::jsonb or a<>''save'' and p_body ? ''content''';
  if strpos(src,old)=0 then raise exception 'draft navigation command guard drift: %',sig;end if;
  src:=replace(src,old,'(p_body-array[''action'',''content'',''navigation''])<>''{}''::jsonb or a<>''save'' and (p_body ? ''content'' or p_body ? ''navigation'') or not private.creation_draft_navigation_valid(p_body->''navigation'',p_kind,'||purpose_expr||',p_body->''content'')');
  old:='target_document_id,content,content_hash)';
  if strpos(src,old)=0 then raise exception 'draft navigation insert columns drift: %',sig;end if;
  src:=replace(src,old,'target_document_id,content,navigation,content_hash)');
  old:='p_target,p_body->''content'',encode';
  if strpos(src,old)=0 then raise exception 'draft navigation insert values drift: %',sig;end if;
  src:=replace(src,old,'p_target,p_body->''content'',p_body->''navigation'',encode');
  old:='set content=p_body->''content'',content_hash=';
  if strpos(src,old)=0 then raise exception 'draft navigation update drift: %',sig;end if;
  src:=replace(src,old,'set content=p_body->''content'',navigation=p_body->''navigation'',content_hash=');
  old:='set content=null,state=''discarded''';
  if strpos(src,old)=0 then raise exception 'draft navigation discard drift: %',sig;end if;
  src:=replace(src,old,'set content=null,navigation=null,state=''discarded''');
  execute src;
 end loop;
 src:=pg_get_functiondef('private.creation_draft_view(private.creation_drafts)'::regprocedure);
 old:='''contentHash'',p_draft.content_hash,';
 if strpos(src,old)=0 then raise exception 'draft navigation view drift';end if;
 src:=replace(src,old,old||'''navigation'',case when p_draft.state=''active'' then p_draft.navigation else null end,');
 execute src;
end;
$migration$;
notify pgrst,'reload schema';
