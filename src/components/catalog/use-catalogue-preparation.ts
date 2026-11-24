import type { CatalogueScope } from "@/lib/validation/catalogue-preparation";

const endpoint = "/api/admin/catalogue-preparations";

export function cataloguePreparationUrl(scope: CatalogueScope, extra: Record<string, string> = {}) {
  const { patientId, mode, purpose, targetId } = scope;
  return endpoint + "?" + new URLSearchParams({
    ...(patientId ? { patientId } : {}), mode, purpose, ...(targetId ? { targetId } : {}), ...extra,
  });
}
