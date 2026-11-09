"use client";

import type { ReactNode } from "react";
import { FeedbackBanner } from "@/components/ui/feedback";
export type { PatientContext, WorkspaceContext } from "@/types/workspace";
export { api, ApiError, errorMessage } from "@/lib/client/api";
export { can, may } from "@/lib/client/capabilities";

export const inputClass = "hca-text-input";
export const buttonClass = "hca-control hca-control--secondary";
export const primaryClass = "hca-control hca-control--primary";
export const panelClass = "ui-card";

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <FeedbackBanner tone={error ? "error" : "info"}>
      {children}
    </FeedbackBanner>
  );
}

export { AppWorkspace as Workspace } from "@/components/app-shell";
