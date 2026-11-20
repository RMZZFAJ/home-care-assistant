"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore, useTransition } from "react";
import { z } from "zod";

type IssuanceScope = { id: string; patientId: string; userId: string };
export const issuanceSteps = [
  { label: "Registrando a ficha", icon: "file" },
  { label: "Conferindo a emissão", icon: "check" },
  { label: "Processando os avisos da emissão", icon: "bell" },
  { label: "Gerando o PDF de emissão", icon: "shield" },
] as const;
const openingActivity = {
  title: "Emissão da ficha", stage: 1, steps: issuanceSteps,
  detail: "A ficha foi registrada. Estamos abrindo a consulta autorizada.",
};
let pending: IssuanceScope | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
function publish(value: IssuanceScope | null) {
  pending = value;
  listeners.forEach(listener => listener());
}

export function useIssuanceNavigation(userId: string, patientId: string) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  function openIssued(documentId: string) {
    const id = z.uuid().parse(documentId);
    publish({ id, userId, patientId });
    startNavigation(() => router.replace(`/fichas/${id}?documentTab=materials`));
  }
  return { navigating, openIssued };
}

export function useIssuanceResult(scope: IssuanceScope) {
  const result = useSyncExternalStore(subscribe, () => pending, () => null);
  const matches = result?.id === scope.id && result.userId === scope.userId && result.patientId === scope.patientId;
  const dismiss = useCallback(() => { if (pending === result) publish(null); }, [result]);
  return matches ? dismiss : null;
}

export function useIssuanceOpeningActivity(id: string | undefined, userId: string | undefined, patientId: string | undefined) {
  const result = useSyncExternalStore(subscribe, () => pending, () => null);
  if (result && result.id === id && result.userId === userId && result.patientId === patientId) return openingActivity;
  return null;
}

/** Route fallbacks can appear before the workspace has authorized the destination. */
export function useIssuanceRouteActivity() {
  const pathname = usePathname();
  const result = useSyncExternalStore(subscribe, () => pending, () => null);
  return result && pathname === `/fichas/${result.id}` ? openingActivity : null;
}
