-- Cover the subject FK when checking deletion/update of a referenced profile.
create index professional_credential_reviews_subject_fk
 on private.professional_credential_reviews(subject_id);
