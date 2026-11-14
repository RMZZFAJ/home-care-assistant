import { authenticate, patientContext, requireGlobal, rpc } from "@/lib/server/api";
import type { AdministrativeAttempt, AdministrativeScope } from "@/lib/validation/administrative-preparation";

export function administrativeScopeArgs(scope: AdministrativeScope) {
  return { p_patient: scope.patientId, p_mode: scope.mode, p_purpose: scope.purpose, p_subject: scope.targetId };
}

export async function authorizeAdministrativePreparation(auth: Awaited<ReturnType<typeof authenticate>>, scope: AdministrativeScope) {
  if (scope.mode === "global") requireGlobal(auth);
  else await patientContext(auth, scope.patientId, "access.manage", true);
}

export async function runAdministrativePreparation(auth: Awaited<ReturnType<typeof authenticate>>, attempt: AdministrativeAttempt) {
  // Exact recovery of an intentional own membership transition is authorized
  // against its original live session by the RPC, even if it ended membership.
  if (attempt.action !== "commit") await authorizeAdministrativePreparation(auth, attempt);
  else if (attempt.mode === "global") requireGlobal(auth);
  return rpc(auth.client, "administrative_preparation_command", {
    ...administrativeScopeArgs(attempt),
    p_action: attempt.action, p_key: attempt.key, p_id: attempt.id, p_revision: attempt.revision,
    p_fields: attempt.fields, p_reference_hash: attempt.referenceHash,
  });
}
