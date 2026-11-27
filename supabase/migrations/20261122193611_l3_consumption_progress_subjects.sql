-- Keep the document and consumption foreign keys distinct while sharing
-- publication, audience, draft concurrency and recovery.
alter table private.document_progress_notes
  alter column document_id drop not null,
  add column consumption_report_id uuid references public.consumption_reports(id),
  add column target_id uuid generated always as (coalesce(document_id, consumption_report_id)) stored,
  add constraint progress_note_one_target check (num_nonnulls(document_id, consumption_report_id) = 1),
  drop constraint document_progress_notes_stage_check,
  add constraint document_progress_notes_stage_check check (stage in (
    'issuance','family_science','fulfillment','completion','acquisition','dispatch',
    'receipt','count','review','correction','communication'
  ));
create index progress_note_target_order on private.document_progress_notes(target_id, recorded_at, id);
create index progress_note_consumption_fk on private.document_progress_notes(consumption_report_id);

alter table private.progress_preparations
  alter column document_id drop not null,
  add column consumption_report_id uuid references public.consumption_reports(id),
  add column target_id uuid generated always as (coalesce(document_id, consumption_report_id)) stored,
  add constraint progress_preparation_one_target check (num_nonnulls(document_id, consumption_report_id) = 1);
drop index private.progress_preparation_slot;
create unique index progress_preparation_slot on private.progress_preparations(owner_id, care_recipient_id, target_id)
  where state in ('active','consumed');
create index progress_preparation_consumption_fk on private.progress_preparations(consumption_report_id);

create view private.progress_subjects as
  select d.id, d.care_recipient_id, d.type::text as type, d.code, d.protocol,
    lower(d.type::text) || '.read' as read_capability, false as is_report
  from public.operational_documents d
  union all
  select r.id, r.care_recipient_id, case r.kind when 'shortage' then 'FAL' else 'CON' end,
    (case r.kind when 'shortage' then 'FAL-' else 'CON-' end) || upper(left(r.id::text, 8)),
    null::text, case r.location when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end, true
  from public.consumption_reports r;

create view private.progress_subject_facts as
  select id, document_id as target_id, recorded_at, action, version, actor_id, actor_name
  from private.document_progress_facts
  union all
  select a.id, a.report_id, a.recorded_at, 'consumption.' || a.action, a.report_version,
    a.actor_id, a.actor_name
  from private.consumption_acts a
  union all
  select r.id, r.id, r.created_at,
    case r.kind when 'shortage' then 'consumption.shortage_reported' else 'consumption.reported' end,
    1, r.reported_by, r.reported_name
  from public.consumption_reports r
  where r.workflow_mode = 'legacy'
  union all
  select v.id, v.report_id, v.created_at, 'consumption.supplemented', v.version, v.actor_id, v.actor_name
  from public.consumption_report_revisions v join public.consumption_reports r on r.id = v.report_id
  where r.workflow_mode = 'legacy'
  union all
  select d.id, d.report_id, d.created_at,
    case when d.accepted then 'consumption.confirmed' else 'consumption.rejected' end,
    d.version, d.actor_id, d.actor_name
  from public.consumption_report_decisions d;

create function private.progress_stages(p_type text) returns text[]
language sql immutable set search_path='' as $$
  select case p_type
    when 'REQ' then array['issuance','family_science','fulfillment','completion']
    when 'COM' then array['issuance','acquisition','receipt','completion']
    when 'ENT' then array['issuance','dispatch','receipt','completion']
    when 'BAL' then array['issuance','count','review','completion']
    when 'CON' then array['issuance','correction','completion']
    when 'FAL' then array['communication','completion']
    else array[]::text[]
  end
$$;

revoke all on private.progress_subjects, private.progress_subject_facts from public, anon, authenticated, service_role;
revoke all on function private.progress_stages(text) from public, anon, authenticated, service_role;

-- Patch the installed definitions by checked anchors. Old hash inputs, RPC
-- names and the wire field documentId remain stable for existing clients.
do $migration$
declare
  change record;
  definition text;
  cached_fn regprocedure;
begin
  for change in
    select * from (values
      ('private.progress_note_readable(private.document_progress_notes)',
        'public.operational_documents d where d.id=p.document_id',
        'private.progress_subjects d where d.id=p.target_id and d.care_recipient_id=p.care_recipient_id'),
      ('private.progress_note_readable(private.document_progress_notes)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('private.progress_note_view(private.document_progress_notes)', '''documentId'',p.document_id', '''documentId'',p.target_id'),
      ('private.progress_reference_view(uuid,uuid)', 'd public.operational_documents', 'd private.progress_subjects'),
      ('private.progress_reference_view(uuid,uuid)', 'from public.operational_documents', 'from private.progress_subjects'),
      ('private.progress_reference_view(uuid,uuid)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('private.progress_reference_view(uuid,uuid)', 'id=n.document_id', 'id=n.target_id and care_recipient_id=n.care_recipient_id'),
      ('private.require_progress_audience(uuid,jsonb)', 'd public.operational_documents', 'd private.progress_subjects'),
      ('private.require_progress_audience(uuid,jsonb)', 'from public.operational_documents', 'from private.progress_subjects'),
      ('private.require_progress_audience(uuid,jsonb)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('private.require_progress_preparation_scope(uuid,uuid,boolean)', 'from public.operational_documents', 'from private.progress_subjects'),
      ('private.require_progress_preparation_scope(uuid,uuid,boolean)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('private.progress_preparation_view(private.progress_preparations)', 'and document_id=d.document_id', 'and target_id=d.target_id and care_recipient_id=d.care_recipient_id'),
      ('private.progress_preparation_view(private.progress_preparations)', '''targetResourceId'',d.document_id', '''targetResourceId'',d.target_id'),
      ('public.progress_preparation_context(uuid,text,uuid)', 'and document_id=p_target', 'and target_id=p_target'),
      ('public.progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid)', 'select type into typ from public.operational_documents', 'select type into typ from private.progress_subjects'),
      ('public.progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid)', 'and document_id=p_target', 'and target_id=p_target'),
      ('public.progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid)',
        'insert into private.progress_preparations(owner_id,care_recipient_id,document_id,content,navigation,content_hash) values(auth.uid(),p_patient,p_target,',
        'insert into private.progress_preparations(owner_id,care_recipient_id,document_id,consumption_report_id,content,navigation,content_hash) values(auth.uid(),p_patient,case when typ not in (''CON'',''FAL'') then p_target end,case when typ in (''CON'',''FAL'') then p_target end,'),
      ('public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)', 'and document_id=p_target', 'and target_id=p_target'),
      ('public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid)', 'select type into typ from public.operational_documents', 'select type into typ from private.progress_subjects'),
      ('public.progress_preparation_recovery(uuid,text,uuid,uuid,integer,jsonb,uuid)', 'document_id=p_target', 'target_id=p_target'),
      ('private.validate_progress_preparation(jsonb,jsonb,text)',
        'case p_type when ''REQ'' then array[''issuance'',''family_science'',''fulfillment'',''completion''] when ''COM'' then array[''issuance'',''acquisition'',''receipt'',''completion''] when ''ENT'' then array[''issuance'',''dispatch'',''receipt'',''completion''] else array[''issuance'',''count'',''review'',''completion''] end',
        'private.progress_stages(p_type)'),
      ('public.document_progress_people(uuid,text,integer)', 'd public.operational_documents', 'd private.progress_subjects'),
      ('public.document_progress_people(uuid,text,integer)', 'from public.operational_documents', 'from private.progress_subjects'),
      ('public.document_progress_people(uuid,text,integer)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('public.document_progress_references(uuid,text,integer)', 'd public.operational_documents', 'd private.progress_subjects'),
      ('public.document_progress_references(uuid,text,integer)', 'public.operational_documents', 'private.progress_subjects'),
      ('public.document_progress_references(uuid,text,integer)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('public.document_progress_references(uuid,text,integer)', 'lower(r.type)||''.read''', 'r.read_capability'),
      ('public.document_progress_references(uuid,text,integer)', 'r.id=n.document_id', 'r.id=n.target_id and r.care_recipient_id=n.care_recipient_id'),
      ('public.document_progress_location(uuid,uuid)', 'private.document_progress_facts f', 'private.progress_subject_facts f'),
      ('public.document_progress_location(uuid,uuid)', 'document_id=p_document', 'target_id=p_document'),
      ('public.document_progress_publish(uuid,uuid,jsonb)', 'd public.operational_documents', 'd private.progress_subjects'),
      ('public.document_progress_publish(uuid,uuid,jsonb)', 'from public.operational_documents', 'from private.progress_subjects'),
      ('public.document_progress_publish(uuid,uuid,jsonb)', 'lower(d.type)||''.read''', 'd.read_capability'),
      ('public.document_progress_publish(uuid,uuid,jsonb)',
        $old$case d.type
   when 'REQ' then array['issuance','family_science','fulfillment','completion']
   when 'COM' then array['issuance','acquisition','receipt','completion']
   when 'ENT' then array['issuance','dispatch','receipt','completion']
   else array['issuance','count','review','completion'] end$old$,
        'private.progress_stages(d.type)'),
      ('public.document_progress_publish(uuid,uuid,jsonb)',
        'perform private.require_document_unarchived(p_document); insert',
        'if not d.is_report then perform private.require_document_unarchived(p_document); end if; insert'),
      ('public.document_progress_publish(uuid,uuid,jsonb)',
        'insert into private.document_progress_notes(document_id,care_recipient_id,',
        'insert into private.document_progress_notes(document_id,consumption_report_id,care_recipient_id,'),
      ('public.document_progress_publish(uuid,uuid,jsonb)',
        'values(d.id,d.care_recipient_id,auth.uid(),v_name,',
        'values(case when not d.is_report then d.id end,case when d.is_report then d.id end,d.care_recipient_id,auth.uid(),v_name,'),
      ('public.document_progress_publish(uuid,uuid,jsonb)',
        '''document_id'',d.id,''category''',
        '''document_id'',case when not d.is_report then d.id end,''consumption_report_id'',case when d.is_report then d.id end,''category''')
    ) edits(fn, before, after)
    order by fn, length(before) desc, before
  loop
    if cached_fn is distinct from change.fn::regprocedure then
      if cached_fn is not null then execute definition; end if;
      cached_fn := change.fn::regprocedure;
      definition := pg_get_functiondef(cached_fn);
    end if;
    if position(change.before in definition)=0 then
      raise exception 'L3 progress subject contract drift: % / %', change.fn, change.before;
    end if;
    definition := replace(definition, change.before, change.after);
  end loop;
  execute definition;

  foreach cached_fn in array array[
    'public.document_progress(uuid,text,integer,integer)'::regprocedure,
    'public.document_progress_period(uuid,text,integer,integer,date,date)'::regprocedure
  ] loop
    definition := pg_get_functiondef(cached_fn);
    if position('from private.document_progress_facts e' in definition)=0
      or position('where document_id=p_document and p_filter' in definition)=0
      or position('d public.operational_documents' in definition)=0 then
      raise exception 'L3 progress timeline contract drift: %', cached_fn;
    end if;
    definition := replace(definition,'d public.operational_documents','d private.progress_subjects');
    definition := replace(definition,'from public.operational_documents','from private.progress_subjects');
    definition := replace(definition,'lower(d.type)||''.read''','d.read_capability');
    definition := replace(definition,'from private.document_progress_facts e where e.document_id=p_document',
      'from private.progress_subject_facts e where e.target_id=p_document');
    definition := replace(definition,'where document_id=p_document and p_filter','where target_id=p_document and p_filter');
    execute definition;
  end loop;
end
$migration$;
