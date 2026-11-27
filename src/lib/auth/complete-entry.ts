import { api } from "@/lib/client/api";
import { safeReturnPath } from "@/lib/safe-return-path";
import type { ContextData } from "@/components/layout/workspace-context";
import { recentDestination, recentDestinationKey, recentDestinationAllowed } from "./recent-destination";

type EntryContext = Pick<ContextData, "userId" | "isGlobalAdmin" | "activeContext" | "patients" | "documentContext"> & {
  singleMembershipId: string | null;
};
const entryContextUrl = "/api/context?view=entry";

export const entrySteps = [
  { label: "Validando sua conta", icon: "user" },
  { label: "Conferindo a segurança da sessão", icon: "shield" },
  { label: "Preparando o destino autorizado", icon: "home" },
] as const;

export async function completeEntry(requested: string | null, userId: string): Promise<string> {
  const destination = safeReturnPath(requested, window.location.origin);
  let recent = null;
  try { recent = recentDestination(sessionStorage.getItem(recentDestinationKey), userId, window.location.origin); } catch { /* Optional preference. */ }
  const target = destination === "/" ? recent : null;
  const entry = entryContextUrl + (target ? "&patientId=" + encodeURIComponent(target.patientId) : "");
  const { data } = await api<{ data: EntryContext }>(entry);
  if (data.userId !== userId) throw new Error("Sua conta mudou. Entre novamente para continuar.");
  // A single operational choice needs no chooser or previous-task detour.
  // Explicit protected destinations still retain their own live authorization.
  if (!data.isGlobalAdmin && data.singleMembershipId) {
    if (data.activeContext?.mode !== "patient" || data.activeContext.care_recipient_id !== data.singleMembershipId)
      await api("/api/context", { careRecipientId: data.singleMembershipId });
    return destination;
  }
  if (target && data.patients.some(patient => patient.id === target.patientId && patient.is_active !== false)) {
    await api("/api/context", { careRecipientId: target.patientId });
    const document = /^\/(?:documentos|historico|fichas)\/([0-9a-f-]{36})(?:\/arquivos)?(?:[?#]|$)/.exec(target.path);
    try {
      const confirmed = await api<{ data: EntryContext }>(entry + (document ? "&documentId=" + document[1] : ""));
      return recentDestinationAllowed(target, confirmed.data) ? target.path : "/";
    } catch { return "/"; }
  }
  return destination;
}
