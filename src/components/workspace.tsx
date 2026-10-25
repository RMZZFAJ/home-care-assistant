"use client";

import type { ReactNode } from "react";
export type { PatientContext, WorkspaceContext } from "@/types/workspace";
export { api, ApiError, errorMessage } from "@/lib/client/api";
export { can, may } from "@/lib/client/capabilities";

export const inputClass = "ui-input";
export const buttonClass = "ui-button ui-button-secondary";
export const primaryClass = "ui-button ui-button-primary";
export const panelClass = "ui-card";

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={"ui-notice " + (error ? "ui-notice-error" : "")}
    >
      {children}
    </div>
  );
}

export { AppWorkspace as Workspace } from "@/components/app-shell";
