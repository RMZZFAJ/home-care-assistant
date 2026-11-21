"use client";
import { useSearchParams } from "next/navigation";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { safeReturnPath } from "@/lib/safe-return-path";

export function useHistoryReturn() {
  const params = useSearchParams(), { value } = useWorkspaceState();
  const patientId = value?.patient?.id;
  const fallback = "/historico" + (patientId ? "?careRecipientId=" + patientId : "");
  const path = safeReturnPath(params.get("returnTo"), "https://history.invalid");
  const url = new URL(path, "https://history.invalid");
  if (url.pathname !== "/historico" || !patientId || url.searchParams.has("careRecipientId") && url.searchParams.get("careRecipientId") !== patientId) return fallback;
  url.searchParams.set("careRecipientId", patientId);
  return url.pathname + url.search;
}
