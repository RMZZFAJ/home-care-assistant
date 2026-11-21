-- Unreviewed profile metadata follows an authorized profile deletion. Family
-- review records keep their restrictive profile FKs and cannot disappear here.
alter table private.professional_declarations
 drop constraint professional_declarations_user_id_fkey;
alter table private.professional_declarations
 add constraint professional_declarations_user_id_fkey foreign key(user_id)
 references public.profiles(id) on delete cascade;
