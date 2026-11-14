"use client";

import { catalogueAttempt, verifyCatalogueReceipt, type CatalogueAttempt, type CatalogueInput, type CatalogueOutcome, type CatalogueScope } from "@/lib/validation/catalogue-preparation";
import { catalogueAttemptStorageKey } from "@/lib/client/catalogue-attempt-storage";
import { api } from "@/lib/client/api";
import { useScopedPreparation, type ScopedPreparationOptions } from "@/components/forms/use-scoped-preparation";

const endpoint = "/api/admin/catalogue-preparations";

export function cataloguePreparationUrl(scope: CatalogueScope, extra: Record<string, string> = {}) {
  const { patientId, mode, purpose, targetId } = scope;
  return endpoint + "?" + new URLSearchParams({
    ...(patientId ? { patientId } : {}), mode, purpose, ...(targetId ? { targetId } : {}), ...extra,
  });
}

export async function sendPreparedCatalogueCommit(url: string, attempt: CatalogueAttempt) {
  return (await api<{ receipt: unknown }>(url, { cataloguePreparation: attempt })).receipt;
}


export function useCataloguePreparation<Fields extends CatalogueInput, Reference>(
  options: { scope: CatalogueScope } & Omit<ScopedPreparationOptions<Fields, Reference, CatalogueAttempt, CatalogueOutcome>,
    "scope" | "readUrl" | "commandUrl" | "storageKey" | "parseAttempt" | "verifyReceipt">
) {
  return useScopedPreparation<Fields, Reference, CatalogueAttempt, CatalogueOutcome>({
    ...options,
    readUrl: cataloguePreparationUrl(options.scope),
    commandUrl: endpoint,
    storageKey: catalogueAttemptStorageKey(options.userId, options.scope),
    parseAttempt: value => catalogueAttempt.parse(value),
    verifyReceipt: verifyCatalogueReceipt,
  });
}
