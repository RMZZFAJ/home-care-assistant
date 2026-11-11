import { authenticate, patientContext, requireGlobal, rpc } from "@/lib/server/api";
import type { CatalogueAttempt, CatalogueScope } from "@/lib/validation/catalogue-preparation";

export function catalogueScopeArgs(scope: CatalogueScope) {
  return { p_patient: scope.patientId, p_mode: scope.mode, p_purpose: scope.purpose, p_target: scope.targetId };
}

export async function authorizeCatalogue(auth: Awaited<ReturnType<typeof authenticate>>, scope: CatalogueScope) {
  if (scope.mode === "global") requireGlobal(auth);
  else await patientContext(auth, scope.patientId, "catalog.manage", true);
}

export async function runCatalogueAttempt(auth: Awaited<ReturnType<typeof authenticate>>, attempt: CatalogueAttempt) {
  await authorizeCatalogue(auth, attempt);
  return rpc(auth.client, "catalogue_preparation_command", {
    ...catalogueScopeArgs(attempt),
    p_action: attempt.action,
    p_key: attempt.key,
    p_id: attempt.id,
    p_revision: attempt.revision,
    p_fields: attempt.fields,
    p_reference_hash: attempt.referenceHash,
  });
}
