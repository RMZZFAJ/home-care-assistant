-- Explicit purchase verification follows the granted capability. Automatic
-- credit remains part of the existing administrator's receipt path.
create or replace function private.require_com_arrival_review(p_patient uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if private.auth_session() is null then
    raise exception 'arrival review requires an active session' using errcode = '42501';
  end if;
  perform private.require_cap(p_patient, 'com.read');
  perform private.require_cap(p_patient, 'com.validate');
end;
$$;

create or replace function private.require_unlinked_arrival_read(p_patient uuid)
returns void language plpgsql stable set search_path = '' as $$
begin
  if private.auth_session() is null then
    raise exception 'arrival read requires an active session' using errcode = '42501';
  end if;
  perform private.require_cap(p_patient, 'com.read');
end;
$$;

create or replace function private.require_com_correction_authority(p_patient uuid, p_action text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_action = 'request_receipt_correction' then
    perform private.require_cap(p_patient, 'com.validate');
  else
    perform private.require_cap(p_patient, 'com.receive');
  end if;
end;
$$;

create or replace function private.regularization_authority(p_patient uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.member_can(p_patient, p_user, 'ent.read')
    and private.member_can(p_patient, p_user, 'ent.regularize');
$$;

create or replace function private.regularization_follow_up_eligible(p_patient uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.member_can(p_patient, p_user, 'ent.follow_up')
    and private.member_can(p_patient, p_user, 'ent.read');
$$;

create or replace function private.can_decide_document_follow_up(d public.operational_documents, p_action text)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(private.can(d.care_recipient_id, lower(d.type) || '.read') and (
    private.can(d.care_recipient_id, 'access.manage')
    or p_action = 'complete' and (
      d.type = 'REQ' and private.can(d.care_recipient_id, 'req.review')
      or d.type = 'COM' and private.can(d.care_recipient_id, 'com.approve')
      or d.kind in ('ENT','DEV') and (
        d.recipient_id = auth.uid() and private.can(d.care_recipient_id, 'ent.receive')
        or d.created_by = auth.uid() and private.can(d.care_recipient_id, 'ent.create')
      )
    )
  ), false);
$$;

do $migration$
declare
  definition text;
  old_review constant text := 'is_admin := public.recipient_role(p_patient)=''admin'' and coalesce(private.can(p_patient,''com.validate''),false);';
  old_inherited constant text := 'result:=coalesce(result,''{}''::jsonb)||jsonb_build_object(''_inheritedEnabled'',inherited);';
begin
  definition := pg_get_functiondef('public.read_unlinked_arrivals(uuid,uuid,timestamptz,uuid)'::regprocedure);
  if strpos(definition, old_review) = 0 then raise exception 'unlinked arrival review definition changed'; end if;
  execute replace(definition, old_review, 'is_admin := coalesce(private.can(p_patient,''com.validate''),false);');

  definition := pg_get_functiondef('private.access_change_current(uuid,text,jsonb)'::regprocedure);
  if strpos(definition, old_inherited) = 0 then raise exception 'governance comparison definition changed'; end if;
  execute replace(definition, old_inherited, E'if p_change->>''subjectUser'' is not null then\n'
    || E'  inherited := private.inherited_capability(p_patient, subject_role, p_change->>''capability'');\n'
    || E' end if;\n ' || old_inherited);
end;
$migration$;
