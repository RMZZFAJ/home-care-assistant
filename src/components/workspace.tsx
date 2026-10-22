"use client";

import type { ReactNode } from "react";

export type PatientContext = {
  id: string;
  display_name: string;
  active?: boolean;
  is_active?: boolean;
  is_development?: boolean;
  role: string;
  permissions?: Record<string, boolean>;
  capabilities?: Record<string, boolean>;
  can_manage_stock?: boolean;
  can_count_stock?: boolean;
};
export type WorkspaceContext = {
  userId: string;
  fullName: string;
  isGlobalAdmin: boolean;
  patients: PatientContext[];
  patient?: PatientContext;
  refresh: () => Promise<void>;
};

export const inputClass = "ui-input";
export const buttonClass = "ui-button ui-button-secondary";
export const primaryClass = "ui-button ui-button-primary";
export const panelClass = "ui-card";

export function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const value = body as { error?: unknown; correlationId?: string };
  const error =
    typeof value.error === "string"
      ? value.error
      : value.error &&
          typeof value.error === "object" &&
          "message" in value.error
        ? String(value.error.message)
        : fallback;
  return value.correlationId
    ? `${error} Referência: ${value.correlationId}`
    : error;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  url: string,
  payload?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 30_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      ...(payload === undefined
        ? {}
        : {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          }),
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(
        "O serviço não retornou uma resposta válida. Tente novamente.",
      );
    }
    if (!response.ok)
      throw new ApiError(
        errorMessage(
          body,
          response.status === 401
            ? "Sua sessão expirou. Entre novamente."
            : "Não foi possível concluir a operação.",
        ),
        response.status,
        body && typeof body === "object" && "code" in body
          ? String(body.code)
          : undefined,
      );
    return body as T;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error(
        "A conexão excedeu o tempo de espera. Recupere a mesma tentativa para confirmar o resultado.",
        { cause: error },
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export function can(context: WorkspaceContext, capability: string) {
  return context.patient?.capabilities?.[capability] === true;
}
export function may(
  context: WorkspaceContext,
  operation: "request" | "manage" | "manageStock" | "countStock",
) {
  if (
    !context.patient ||
    ((context.patient.active === false ||
      context.patient.is_active === false) &&
      operation !== "manage")
  )
    return false;
  const capability = {
    request: "req.create",
    manage: "access.manage",
    manageStock: "stock.family.manage",
    countStock: "bal.count",
  }[operation];
  if (context.patient.capabilities) return can(context, capability);
  return (
    context.patient.permissions?.[
      {
        request: "canRequest",
        manage: "canManage",
        manageStock: "canManageStock",
        countStock: "canCountStock",
      }[operation]
    ] === true
  );
}

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
