import { api } from "@/lib/client/api";
import { safeReturnPath } from "@/lib/safe-return-path";
import type { ContextData } from "@/components/layout/workspace-context";
import { recentDestination, recentDestinationKey, recentDestinationAllowed } from "./recent-destination";

export async function completeEntry(requested: string | null, userId: string): Promise<string> {
  const destination = safeReturnPath(requested, window.location.origin);
  const { data } = await api<{ data: ContextData; }>("/api/context");
  if (data.userId !== userId) throw new Error("Sua conta mudou. Entre novamente para continuar.");
  let recent = null;
  try { recent = recentDestination(sessionStorage.getItem(recentDestinationKey), userId, window.location.origin); } catch { /* Optional preference. */ }
  const memberships = data.patients.filter(patient => patient.hasMembership && patient.is_active !== false);
  const target = destination === "/" && recent && memberships.some(patient => patient.id === recent.patientId) ? recent : null;
  if (target) {
    await api("/api/context", { careRecipientId: target.patientId });
    const document = /^\/(?:documentos|historico|fichas)\/([0-9a-f-]{36})(?:\/arquivos)?(?:[?#]|$)/.exec(target.path);
    try {
      const confirmed = await api<{ data: ContextData }>("/api/context" + (document ? "?documentId=" + document[1] : ""));
      return recentDestinationAllowed(target, confirmed.data) ? target.path : "/";
    } catch { return "/"; }
  }
  if (!data.activeContext && !data.isGlobalAdmin && memberships.length === 1) {
    await api("/api/context", { careRecipientId: memberships[0].id });
  }
  return destination;
}
