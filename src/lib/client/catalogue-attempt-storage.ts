import { catalogueAttempt, type CatalogueAttempt, type CatalogueReceiptScope, type CatalogueScope } from "@/lib/validation/catalogue-preparation";

const storagePrefix = "hca:catalogue-preparation:";

export function catalogueAttemptStorageKey(userId: string, scope: CatalogueScope) {
  return storagePrefix + JSON.stringify([userId, scope.patientId, scope.mode, scope.purpose, scope.targetId]);
}

export function readRetainedCatalogueAttempts(userId: string, scope: CatalogueReceiptScope) {
  const attempts: CatalogueAttempt[] = [];
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (!key.startsWith(storagePrefix)) continue;
      try {
        const parsed = catalogueAttempt.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null"));
        if (parsed.success && key === catalogueAttemptStorageKey(userId, parsed.data)
          && parsed.data.patientId === scope.patientId && parsed.data.mode === scope.mode) attempts.push(parsed.data);
      } catch { /* An unreadable entry does not hide other attempts. */ }
    }
  } catch { /* The server history does not depend on browser storage. */ }
  return attempts;
}

export function forgetRetainedCatalogueAttempt(userId: string, attempt: CatalogueAttempt) {
  const key = catalogueAttemptStorageKey(userId, attempt);
  try {
    const parsed = catalogueAttempt.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null"));
    if (parsed.success && parsed.data.key === attempt.key) sessionStorage.removeItem(key);
  } catch { /* The confirmed receipt remains on the server. */ }
}
