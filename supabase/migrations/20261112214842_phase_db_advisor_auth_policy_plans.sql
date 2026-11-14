-- The request identity is constant within one SQL statement. Cache only that
-- value. Patient, role, session-validity and document checks remain row-sensitive.
alter policy "users read own profile" on public.profiles
  using (id = (select auth.uid()) and public.my_session_valid());

alter policy "authorized users create own requisitions" on public.requisitions
  with check (
    created_by = (select auth.uid())
    and public.current_profile_role() = any(array[
      'admin'::public.profile_role,
      'supervisor'::public.profile_role,
      'professional'::public.profile_role
    ])
    and exists (
      select 1 from public.care_recipients c
      where c.id = requisitions.care_recipient_id and c.is_active
    )
  );

alter policy "users insert requisition items" on public.requisition_items
  with check (exists (
    select 1 from public.requisitions r
    where r.id = requisition_items.requisition_id
      and r.created_by = (select auth.uid())
  ));

alter policy "users insert own observations" on public.requisition_observations
  with check (created_by = (select auth.uid()));

alter policy "authenticated users insert audit events" on public.audit_events
  with check (actor_id = (select auth.uid()));

alter policy "scoped membership read" on public.care_recipient_memberships
  using (
    public.can_manage_recipient(care_recipient_id)
    or (user_id = (select auth.uid()) and public.current_profile_role() is not null)
  );

alter policy "authorized_notification_read" on public.requisition_notifications
  using (
    (recipient_user_id = (select auth.uid())
      or public.can_manage_recipient(care_recipient_id))
    and case when document_id is not null then exists (
      select 1 from public.operational_documents d
      where d.id = requisition_notifications.document_id
        and private.can(d.care_recipient_id, lower(d.type) || '.read')
    ) else public.can_access_recipient(care_recipient_id) end
  );

alter policy "phones_self" on public.verified_phones
  using (user_id = (select auth.uid()));

alter policy "own_flow_submission" on public.flow_submissions
  using (
    user_id = (select auth.uid())
    and public.can_access_recipient(care_recipient_id)
  );

alter policy "reminders_read" on public.operational_reminders
  using (
    public.can_access_recipient(care_recipient_id)
    and (user_id = (select auth.uid())
      or public.can_manage_recipient(care_recipient_id))
  );

alter policy "own_science_preference" on public.requisition_science_preferences
  using (user_id = (select auth.uid()) and public.my_session_valid());

-- These lookups also support bulk revocation and patient-context invalidation.
create index authority_sessions_user_idx
  on private.authority_sessions(user_id);
create index authority_sessions_patient_idx
  on private.authority_sessions(care_recipient_id);

-- Preserve the public invitation predicate and its grants, with a closed path.
alter function public.invitation_registration_allowed(text, text)
  set search_path = '';
