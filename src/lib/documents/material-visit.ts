export const materialVisitParam = "materialVisit";
const storageKey = "hca:material-visit";

export function prepareMaterialVisit(documentId: string, patientId: string, productId?: string | null) {
  try {
    const token = crypto.randomUUID();
    sessionStorage.setItem(storageKey, JSON.stringify([documentId, patientId, token, productId ?? null]));
    return token;
  } catch {
    return null;
  }
}

export function readMaterialVisit(documentId: string, patientId: string, token: string): string | null | false {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (!Array.isArray(stored) || stored[0] !== documentId || stored[1] !== patientId || stored[2] !== token)
      return false;
    const product = stored[3];
    return typeof product === "string" && product.length >= 1 && product.length <= 120 ? product : null;
  } catch {
    return false;
  }
}

export function consumeMaterialVisit() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // The browser's Back action remains available.
  }
}
