export const materialVisitParam = "materialVisit";
const storageKey = "hca:material-visit";

export function prepareMaterialVisit(documentId: string, patientId: string) {
  try {
    const token = crypto.randomUUID();
    sessionStorage.setItem(storageKey, JSON.stringify([documentId, patientId, token]));
    return token;
  } catch {
    return null;
  }
}

export function matchesMaterialVisit(documentId: string, patientId: string, token: string) {
  try {
    return sessionStorage.getItem(storageKey) === JSON.stringify([documentId, patientId, token]);
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
