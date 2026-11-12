begin;
-- A contingency dossier preserves a physical declaration, never a proxy receipt or stock command.
insert into public.capability_definitions(code,default_roles,critical) values
 ('contingency.read',array['admin','family','supervisor','professional','reader'],false),
 ('contingency.report',array['admin','family','supervisor','professional'],false),
 ('contingency.review',array['admin','family'],true);
create table private.contingency_cases(
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 process text not null check(process in ('REQ','COM','ENT','RETURN','BAL','CONSUMPTION_FAMILY','CONSUMPTION_TEAM')),
 content jsonb not null,created_by uuid not null references public.profiles(id),actor_name text not null,actor_role text not null,
 created_at timestamptz not null default clock_timestamp()
);
create index contingency_patient_cursor on private.contingency_cases(care_recipient_id,created_at desc,id);
create index contingency_author on private.contingency_cases(created_by);
create table private.contingency_events(
 id uuid primary key default gen_random_uuid(),case_id uuid not null references private.contingency_cases(id),
 sequence integer not null check(sequence>0),action text not null check(action in ('supplement','needs_clarification','link_existing')),
 body jsonb not null,actor_id uuid not null references public.profiles(id),actor_name text not null,actor_role text not null,
 recorded_at timestamptz not null default clock_timestamp(),unique(case_id,sequence)
);
create index contingency_event_actor on private.contingency_events(actor_id);
alter table private.contingency_cases enable row level security;
alter table private.contingency_events enable row level security;
revoke all on private.contingency_cases,private.contingency_events from public,anon,authenticated,service_role;
create function private.contingency_immutable() returns trigger language plpgsql set search_path='' as $$begin
 raise exception 'contingency history is immutable' using errcode='42501';end;$$;
create trigger contingency_case_immutable before update or delete on private.contingency_cases for each row execute function private.contingency_immutable();
create trigger contingency_event_immutable before update or delete on private.contingency_events for each row execute function private.contingency_immutable();

create function private.contingency_domain(p_process text) returns text language sql immutable set search_path='' as $$
 select case p_process when 'REQ' then 'req.read' when 'COM' then 'com.read' when 'ENT' then 'ent.read' when 'RETURN' then 'ent.read' when 'BAL' then 'bal.read' when 'CONSUMPTION_FAMILY' then 'stock.family.read' when 'CONSUMPTION_TEAM' then 'stock.team.read' end;
$$;
create function private.contingency_allowed(p_patient uuid,p_process text,p_cap text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.auth_session() is not null and public.my_active_context()->>'mode'='patient'
 and public.my_active_context()->>'care_recipient_id'=p_patient::text
 and private.can(p_patient,p_cap) and private.can(p_patient,private.contingency_domain(p_process));
$$;
create function private.require_contingency(p_patient uuid,p_process text,p_cap text,p_active boolean default false) returns void
language plpgsql stable security definer set search_path='' as $$begin
 if not coalesce(private.contingency_allowed(p_patient,p_process,p_cap),false)
 or p_active and not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
 raise exception 'contingency scope required' using errcode='42501';end if;
end;$$;

create function private.contingency_content(p_patient uuid,p_body jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare k text;line jsonb;item public.care_recipient_products;lines jsonb:='[]';v text;
begin
 if p_body is null or jsonb_typeof(p_body) is distinct from 'object' or pg_column_size(p_body)>64000
 or (p_body ?& array['fact','knownReference','occurredOn','occurredTime','timeZone','performer','receiver','materials','notes','communications']) is not true
 or exists(select 1 from jsonb_object_keys(p_body) x where x not in ('fact','knownReference','occurredOn','occurredTime','timeZone','performer','receiver','materials','notes','communications'))
 or jsonb_typeof(p_body->'fact') is distinct from 'string' or length(btrim(p_body->>'fact')) not between 3 and 4000
 or jsonb_typeof(p_body->'materials') is distinct from 'array' or jsonb_array_length(p_body->'materials')>100
 or jsonb_typeof(p_body->'communications') is distinct from 'array' or jsonb_array_length(p_body->'communications')>30
 then raise exception 'invalid contingency declaration' using errcode='22023';end if;
 foreach k in array array['knownReference','occurredOn','occurredTime','timeZone','performer','receiver','notes'] loop
  if jsonb_typeof(p_body->k) not in ('string','null') or jsonb_typeof(p_body->k)='string' and length(btrim(p_body->>k)) not between 1 and (case when k='notes' then 2000 else 300 end) then
   raise exception 'invalid contingency field' using errcode='22023';end if;
 end loop;
 if p_body->>'occurredOn' is not null then
  v:=p_body->>'occurredOn';if v!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(v::date,'YYYY-MM-DD')<>v or v::date>current_date then raise exception 'invalid physical date' using errcode='22023';end if;
 end if;
 if p_body->>'occurredTime' is not null and ((p_body->>'occurredTime')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_body->>'occurredOn' is null or p_body->>'timeZone' is null) then raise exception 'physical time requires date and zone' using errcode='22023';end if;
 if p_body->>'timeZone' is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name=p_body->>'timeZone' and (name like '%/%' or name='UTC')) then raise exception 'invalid physical zone' using errcode='22023';end if;
 for line in select value from jsonb_array_elements(p_body->'materials') loop
  if jsonb_typeof(line) is distinct from 'object' or (line ?& array['productId','description','quantity','custody']) is not true
   or exists(select 1 from jsonb_object_keys(line) x where x not in ('productId','description','quantity','custody')) then raise exception 'invalid physical material' using errcode='22023';end if;
  foreach k in array array['productId','description','quantity','custody'] loop
   if jsonb_typeof(line->k) not in ('string','null') then raise exception 'invalid physical material field' using errcode='22023';end if;
  end loop;
  if line->>'custody' is not null and line->>'custody' not in ('FAMILY','CARE_TEAM','TRANSIT') then raise exception 'invalid physical custody' using errcode='22023';end if;
  if line->>'description' is not null and length(btrim(line->>'description')) not between 1 and 300 then raise exception 'invalid material description' using errcode='22023';end if;
  if line->>'productId' is not null then
   select * into item from public.care_recipient_products where care_recipient_id=p_patient and product_id=line->>'productId';
   if not found then raise exception 'material unavailable in patient' using errcode='42501';end if;
  else item:=null;end if;
  if line->>'quantity' is not null then
   if (line->>'quantity')!~'^(0|[1-9][0-9]{0,9})([.][0-9]{1,6})?$' then raise exception 'invalid physical quantity' using errcode='22023';end if;
   perform private.require_exact_quantity((line->>'quantity')::numeric,coalesce(item.quantity_decimals,6),true);
  end if;
  lines:=lines||jsonb_build_array(line||jsonb_build_object('productName',item.name,'unit',item.unit,'decimals',item.quantity_decimals));
 end loop;
 for line in select value from jsonb_array_elements(p_body->'communications') loop
  if jsonb_typeof(line) is distinct from 'object' or (line ?& array['person','channel','state','basis']) is not true
   or exists(select 1 from jsonb_object_keys(line) x where x not in ('person','channel','state','basis'))
   or jsonb_typeof(line->'person') is distinct from 'string' or length(btrim(line->>'person')) not between 1 and 300
   or jsonb_typeof(line->'basis') is distinct from 'string' or length(btrim(line->>'basis')) not between 3 and 1000
   or (line->>'channel' in ('internal','phone','paper','other')) is not true
   or (line->>'state' in ('pending','attempted','reported_sent','reported_read')) is not true
  then raise exception 'invalid declared communication' using errcode='22023';end if;
 end loop;
 return p_body||jsonb_build_object('materials',lines);
end;$$;

create function private.contingency_view(c private.contingency_cases) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.id,'patientId',c.care_recipient_id,'process',c.process,'content',c.content,
 'actorId',c.created_by,'actorName',c.actor_name,'actorRole',c.actor_role,'recordedAt',c.created_at,
 'revision',1+coalesce((select max(sequence) from private.contingency_events where case_id=c.id),0),
 'state',coalesce((select case when action='link_existing' then 'linked' when action='needs_clarification' then 'needs_clarification' else 'recorded' end from private.contingency_events where case_id=c.id order by sequence desc limit 1),'recorded'),
 'canReport',private.contingency_allowed(c.care_recipient_id,c.process,'contingency.report'),
 'canReview',private.contingency_allowed(c.care_recipient_id,c.process,'contingency.review') and auth.uid()<>c.created_by,
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'sequence',sequence,'action',action,'body',body,'actorId',actor_id,'actorName',actor_name,'actorRole',actor_role,'recordedAt',recorded_at) order by sequence) from private.contingency_events where case_id=c.id),'[]'));
$$;
create function public.contingency_cases(p_patient uuid,p_process text,p_id uuid default null,p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare c private.contingency_cases;result jsonb;begin
 perform private.require_contingency(p_patient,p_process,'contingency.read');
 if p_id is not null then
  select * into c from private.contingency_cases where id=p_id and care_recipient_id=p_patient and process=p_process;
  if not found then raise exception 'contingency unavailable' using errcode='42501';end if;return private.contingency_view(c);
 end if;
 if p_page is null or p_page not between 0 and 100000 then raise exception 'invalid contingency page' using errcode='22023';end if;
 select jsonb_build_object('patientId',p_patient,'process',p_process,'page',p_page,'pageSize',25,
  'total',(select count(*) from private.contingency_cases where care_recipient_id=p_patient and process=p_process),
  'canReport',private.contingency_allowed(p_patient,p_process,'contingency.report'),
  'data',coalesce(jsonb_agg(private.contingency_view(x) order by x.created_at desc,x.id),'[]')) into result
 from(select * from private.contingency_cases where care_recipient_id=p_patient and process=p_process order by created_at desc,id limit 25 offset p_page*25)x;
 return result;
end;$$;

create function public.contingency_command(p_patient uuid,p_process text,p_id uuid,p_expected integer,p_action text,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.contingency_cases;e private.contingency_events;previous private.phase_d3_commands;h text;result jsonb;body jsonb;seq integer;person public.profiles;target public.operational_documents;report public.consumption_reports;cap text;
begin
 cap:=case when p_action in ('record','supplement') then 'contingency.report' else 'contingency.review' end;
 perform private.require_contingency(p_patient,p_process,cap,true);
 if p_key is null or p_action is null or p_action not in ('record','supplement','needs_clarification','link_existing') or p_body is null or pg_column_size(p_body)>64000 then raise exception 'invalid contingency command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('contingency-v1',p_patient,p_process,p_id,p_expected,p_action,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('contingency-intent:'||auth.uid()::text||':'||p_key::text,0));
 perform private.require_contingency(p_patient,p_process,cap,true);
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if previous.intent_hash is distinct from h then raise exception 'contingency intention conflict' using errcode='23505';end if;
  return previous.result||jsonb_build_object('replayed',true);
 end if;
 select * into strict person from public.profiles where id=auth.uid() and status='active';
 if p_action='record' then
  if p_id is not null or p_expected is not null then raise exception 'new contingency required' using errcode='22023';end if;
  body:=private.contingency_content(p_patient,p_body);
  insert into private.contingency_cases(care_recipient_id,process,content,created_by,actor_name,actor_role)
  values(p_patient,p_process,body,auth.uid(),person.full_name,public.recipient_role(p_patient)) returning * into c;
 else
  select * into c from private.contingency_cases where id=p_id and care_recipient_id=p_patient and process=p_process for update;
  if not found then raise exception 'contingency unavailable' using errcode='42501';end if;
  perform private.require_contingency(p_patient,p_process,cap,true);
  select coalesce(max(sequence),0)+1 into seq from private.contingency_events where case_id=c.id;
  if p_expected is distinct from seq then raise exception 'contingency revision changed' using errcode='PT409';end if;
  if exists(select 1 from private.contingency_events where case_id=c.id and action='link_existing') then raise exception 'contingency already linked' using errcode='PT409';end if;
  if p_action='supplement' then body:=private.contingency_content(p_patient,p_body);
  else
   if c.created_by=auth.uid() or exists(select 1 from private.contingency_events where case_id=c.id and action='supplement' and actor_id=auth.uid()) then raise exception 'independent contingency reviewer required' using errcode='42501';end if;
   if jsonb_typeof(p_body) is distinct from 'object' or (p_body ?& array['reason','targetId']) is not true
    or exists(select 1 from jsonb_object_keys(p_body) x where x not in ('reason','targetId'))
    or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(btrim(p_body->>'reason')) not between 3 and 2000
    or jsonb_typeof(p_body->'targetId') not in ('null','string') then raise exception 'invalid reconciliation decision' using errcode='22023';end if;
   body:=p_body;
   if p_action='link_existing' then
    if p_body->>'targetId' is null or not private.creation_draft_uuid(p_body->'targetId') then raise exception 'existing authorized reference required' using errcode='22023';end if;
    if p_process like 'CONSUMPTION_%' then
     select * into report from public.consumption_reports where id=(p_body->>'targetId')::uuid and care_recipient_id=p_patient and location=case p_process when 'CONSUMPTION_FAMILY' then 'FAMILY' else 'CARE_TEAM' end for share;
     if not found then raise exception 'consumption reference unavailable' using errcode='42501';end if;
     body:=body||jsonb_build_object('targetKind','consumption','targetRecordedAt',report.created_at,'targetVersion',report.version);
    else
     select * into target from public.operational_documents where id=(p_body->>'targetId')::uuid and care_recipient_id=p_patient and type=case p_process when 'RETURN' then 'ENT' else p_process end and status<>'draft' for share;
     if not found then raise exception 'document reference unavailable' using errcode='42501';end if;
     if p_process='RETURN' and (target.payload->>'source' is distinct from 'CARE_TEAM' or target.payload->>'destination' is distinct from 'FAMILY')
      or p_process='ENT' and (target.payload->>'source' is distinct from 'FAMILY' or target.payload->>'destination' is distinct from 'CARE_TEAM') then
      raise exception 'transfer direction does not match contingency' using errcode='22023';end if;
     body:=body||jsonb_build_object('targetKind','document','targetCode',target.code,'targetVersion',target.version,'targetRecordedAt',target.created_at);
    end if;
    if exists(select 1 from public.attachments where contingency_id=c.id and state='quarantine') then raise exception 'contingency evidence pending' using errcode='PT409';end if;
    body:=body||jsonb_build_object('evidence',coalesce((select jsonb_agg(jsonb_build_object('id',id,'sha256',sha256) order by id) from public.attachments where contingency_id=c.id and state='ready'),'[]'));
   elsif p_body->>'targetId' is not null then raise exception 'clarification cannot claim a linked reference' using errcode='22023';end if;
  end if;
  insert into private.contingency_events(case_id,sequence,action,body,actor_id,actor_name,actor_role)
  values(c.id,seq,p_action,body,auth.uid(),person.full_name,public.recipient_role(p_patient)) returning * into e;
 end if;
 result:=jsonb_build_object('caseId',c.id,'patientId',p_patient,'process',p_process,'action',p_action,'key',p_key,'actorId',auth.uid(),'revision',coalesce(e.sequence,0)+1,'recordedAt',coalesce(e.recorded_at,c.created_at),'persistence','confirmed');
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'contingency.'||p_action,'contingency',c.id,jsonb_build_object('care_recipient_id',p_patient,'revision',coalesce(e.sequence,0)+1));
 return result;
end;$$;

-- A third evidence parent reuses the existing quarantine, server attestation,
-- Storage policies, finalization and recovery; existing document/movement paths remain intact.
alter table public.attachments add column contingency_id uuid references private.contingency_cases(id);
alter table public.attachments drop constraint attachments_check;
alter table public.attachments add constraint attachments_check check(num_nonnulls(document_id,movement_id,contingency_id)=1);
create index attachment_contingency on public.attachments(contingency_id);
create function private.contingency_evidence_member(p_case uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.contingency_cases c join public.care_recipients p on p.id=c.care_recipient_id
 where c.id=p_case and p.is_active and private.member_can(c.care_recipient_id,p_user,'contingency.report')
 and private.member_can(c.care_recipient_id,p_user,private.contingency_domain(c.process))
 and not exists(select 1 from private.contingency_events where case_id=c.id and action='link_existing'));
$$;
create function private.reserve_contingency_attachment(p_patient uuid,p_contingency uuid,p_filename text,p_mime text,p_bytes bigint,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare c private.contingency_cases;a public.attachments;begin
 select * into c from private.contingency_cases where id=p_contingency and care_recipient_id=p_patient for update;
 if not found then raise exception 'contingency unavailable' using errcode='42501';end if;
 perform private.require_contingency(p_patient,c.process,'contingency.report',true);
 if not private.contingency_evidence_member(c.id,auth.uid()) then raise exception 'contingency evidence closed' using errcode='PT409';end if;
 if p_key is null or p_filename is null or length(p_filename) not between 1 and 180 or (p_mime in ('image/jpeg','image/png','image/webp','application/pdf')) is not true or p_bytes is null or p_bytes not between 1 and 4194304 then raise exception 'invalid contingency evidence' using errcode='22023';end if;
 select * into a from public.attachments where uploaded_by=auth.uid() and upload_key=p_key;
 if found then
  if a.care_recipient_id is distinct from p_patient or a.contingency_id is distinct from p_contingency or a.filename is distinct from p_filename or a.mime_type is distinct from p_mime or a.bytes is distinct from p_bytes then raise exception 'attachment intention conflict' using errcode='23505';end if;
  return to_jsonb(a);
 end if;
 if (select count(*) from public.attachments where contingency_id=c.id and state not in ('rejected','abandoned'))>=10 then raise exception 'attachment limit reached' using errcode='PT409';end if;
 insert into public.attachments(care_recipient_id,contingency_id,uploaded_by,filename,mime_type,bytes,object_path,upload_key)
 values(p_patient,c.id,auth.uid(),p_filename,p_mime,p_bytes,p_patient||'/'||auth.uid()||'/'||gen_random_uuid()||'/original',p_key) returning * into a;
 return to_jsonb(a);
end;$$;

create function public.contingency_attachment_attempts(p_patient uuid,p_contingency uuid,p_key uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare c private.contingency_cases;result jsonb;begin
 select * into c from private.contingency_cases where id=p_contingency and care_recipient_id=p_patient;
 if not found then raise exception 'contingency unavailable' using errcode='42501';end if;
 perform private.require_contingency(p_patient,c.process,'contingency.read');
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'filename',a.filename,'bytes',a.bytes,'mime_type',a.mime_type,'state',a.state,'sha256',a.sha256,'object_path',a.object_path,'created_at',a.created_at,'uploaded_by',a.uploaded_by,
 'uploadKey',case when a.uploaded_by=auth.uid() then a.upload_key else null end,
 'sourceSha256',case when t.source_verified_at is not null then t.source_hash end,'sourceBytes',case when t.source_verified_at is not null then t.source_bytes end,'sourceMime',case when t.source_verified_at is not null then t.source_mime end,
 'expectedSha256',case when t.source_verified_at is not null then t.derivative_hash end,'transformation',t.transformation,'tracked',t.attachment_id is not null,
 'pending',exists(select 1 from private.attachment_uploads u where u.attachment_id=a.id and u.state<>'refused'),
 'canAbandon',a.state='quarantine' and private.attachment_writer(a.id) and not exists(select 1 from private.attachment_uploads u where u.attachment_id=a.id and u.state<>'refused') and not exists(select 1 from storage.objects s where s.bucket_id='patient-evidence' and s.name=a.object_path)) order by a.created_at,a.id),'[]') into result
 from public.attachments a join private.attachment_attempts t on t.attachment_id=a.id where a.contingency_id=c.id and private.attachment_read(a.id)
 and (p_key is null and a.state<>'abandoned' or p_key is not null and a.uploaded_by=auth.uid() and a.upload_key=p_key);
 perform private.require_contingency(p_patient,c.process,'contingency.read');return result;
end;$$;

-- Guard each narrow extension against the expected native contract.
do $patch$ declare body text;begin
 body:=replace(pg_get_functiondef('private.attachment_read(uuid)'::regprocedure),chr(13),'');
 if encode(extensions.digest(body,'sha256'),'hex')<>'b3d99ad5646009d68902083f61b47badfb7a05dc21e1de34c616df748efe5248' then raise exception 'contingency attachment baseline drift: private.attachment_read(uuid)';end if;
 execute replace(body,$before$case when d.id is not null then$before$,$after$case when a.contingency_id is not null then exists(select 1 from private.contingency_cases c where c.id=a.contingency_id and c.care_recipient_id=a.care_recipient_id and private.contingency_allowed(c.care_recipient_id,c.process,'contingency.read')) when d.id is not null then$after$);
end;$patch$;
do $patch$ declare body text;begin
 body:=replace(pg_get_functiondef('private.attachment_writer(uuid)'::regprocedure),chr(13),'');
 if encode(extensions.digest(body,'sha256'),'hex')<>'5b9d14134fce29e89f0004b561fff714020e5115e8b59a657908e754d7438d39' then raise exception 'contingency attachment baseline drift: private.attachment_writer(uuid)';end if;
 execute replace(body,$before$case when a.document_id is not null then$before$,$after$case when a.contingency_id is not null then exists(select 1 from private.contingency_cases c where c.id=a.contingency_id and c.care_recipient_id=a.care_recipient_id and private.contingency_allowed(c.care_recipient_id,c.process,'contingency.report') and private.contingency_evidence_member(c.id,auth.uid())) when a.document_id is not null then$after$);
end;$patch$;
do $patch$ declare body text;begin
 body:=replace(pg_get_functiondef('attest_attachment_source(uuid,uuid,text,bigint,text,text,text)'::regprocedure),chr(13),'');
 if encode(extensions.digest(body,'sha256'),'hex')<>'9528da9fc175ce0774c5e84522a2f6845003851e61bb5d986daf6c609d96feff' then raise exception 'contingency attachment baseline drift: attest_attachment_source(uuid,uuid,text,bigint,text,text,text)';end if;
 execute replace(body,$before$case when a.document_id is not null then$before$,$after$case when a.contingency_id is not null then private.contingency_evidence_member(a.contingency_id,p_actor) when a.document_id is not null then$after$);
end;$patch$;
do $patch$ declare body text;begin
 body:=replace(pg_get_functiondef('abandon_attachment_attempt(uuid,uuid)'::regprocedure),chr(13),'');
 if encode(extensions.digest(body,'sha256'),'hex')<>'7ca3d27371a7afe74fcd2f71fe7d3b816426de83c7e3711c6c4aa361b53ec98c' then raise exception 'contingency attachment baseline drift: abandon_attachment_attempt(uuid,uuid)';end if;
 execute replace(body,$before$coalesce(document_id,movement_id)$before$,$after$coalesce(document_id,movement_id,contingency_id)$after$);
end;$patch$;

do $clone$ declare body text;begin
 body:=replace(pg_get_functiondef('public.prepare_attachment_attempt(uuid,uuid,uuid,text,text,bigint,uuid,text,bigint,text,text,text)'::regprocedure),chr(13),'');
 if encode(extensions.digest(body,'sha256'),'hex')<>'0b53de4c080c1fd8271a449900b4b822290d852af337f008dcb76ddbd5054644' then raise exception 'contingency preparation baseline drift';end if;
 body:=replace(body,$before$public.prepare_attachment_attempt($before$,$after$public.prepare_contingency_attachment_attempt($after$);
 body:=replace(body,$before$p_document uuid, p_movement uuid, $before$,$after$p_contingency uuid, $after$);
 body:=replace(body,$before$coalesce(p_document,p_movement)$before$,$after$p_contingency$after$);
 body:=replace(body,$before$perform public.reserve_attachment(p_patient,p_document,p_movement,p_filename,p_mime,p_bytes,p_key);$before$,$after$perform private.reserve_contingency_attachment(p_patient,p_contingency,p_filename,p_mime,p_bytes,p_key);$after$);
 execute body;
end;$clone$;

create function public.contingency_references(p_patient uuid,p_process text,p_query text default '',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 perform private.require_contingency(p_patient,p_process,'contingency.read');
 if p_query is null or length(p_query)>200 or p_page is null or p_page not between 0 and 100000 then raise exception 'invalid reference search' using errcode='22023';end if;
 with refs as (
  select d.id,'document'::text kind,d.code label,d.created_at,d.version from public.operational_documents d
  where d.care_recipient_id=p_patient and d.type=case p_process when 'RETURN' then 'ENT' else p_process end and d.status<>'draft' and d.code is not null
  and (p_process not in ('ENT','RETURN') or d.payload->>'source'=case p_process when 'RETURN' then 'CARE_TEAM' else 'FAMILY' end and d.payload->>'destination'=case p_process when 'RETURN' then 'FAMILY' else 'CARE_TEAM' end)
  and position(lower(p_query) in lower(coalesce(d.code,'')||' '||coalesce(d.protocol,'')))>0
  union all
  select r.id,'consumption',left(r.body,120),r.created_at,r.version from public.consumption_reports r
  where p_process in ('CONSUMPTION_FAMILY','CONSUMPTION_TEAM') and r.care_recipient_id=p_patient and r.location=case p_process when 'CONSUMPTION_FAMILY' then 'FAMILY' else 'CARE_TEAM' end and position(lower(p_query) in lower(r.body))>0
 )
 select jsonb_build_object('patientId',p_patient,'process',p_process,'page',p_page,'total',(select count(*) from refs),'data',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,'label',x.label,'recordedAt',x.created_at,'version',x.version) order by x.created_at desc,x.id) from(select * from refs order by created_at desc,id limit 25 offset p_page*25)x),'[]')) into result;
 return result;
end;$$;

do $grants$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='private' and p.proname in ('contingency_immutable','contingency_domain','contingency_allowed','require_contingency','contingency_content','contingency_view','contingency_evidence_member','reserve_contingency_attachment'))
 or(n.nspname='public' and p.proname in ('contingency_cases','contingency_command','contingency_references','contingency_attachment_attempts','prepare_contingency_attachment_attempt')) loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end;$grants$;
grant execute on function public.contingency_cases(uuid,text,uuid,integer),public.contingency_command(uuid,text,uuid,integer,text,jsonb,uuid),public.contingency_references(uuid,text,text,integer),public.contingency_attachment_attempts(uuid,uuid,uuid),public.prepare_contingency_attachment_attempt(uuid,uuid,text,text,bigint,uuid,text,bigint,text,text,text) to authenticated;
notify pgrst,'reload schema';

commit;
