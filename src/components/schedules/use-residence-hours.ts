"use client";

import { useCallback } from "react";
import { parseResidenceHours } from "@/lib/schedules/residence-hours";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";

export function useResidenceHours(patientId: string, enabled: boolean) {
  const revision = useLiveRevision();
  const decode = useCallback((value: unknown) => parseResidenceHours(value, patientId), [patientId]);
  const endpoint = "/api/schedules/residence";
  const read = useScopedRead(enabled ? `${endpoint}?careRecipientId=${patientId}` : null, String(revision), decode);
  return { ...read, endpoint };
}
