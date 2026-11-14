-- Support the composite parent FK without scanning the private application history.
create index balance_applications_document_patient_idx
 on private.balance_applications(document_id,care_recipient_id);
