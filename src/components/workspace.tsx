"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

export type PatientContext = {
  id: string;
  display_name: string;
  active?: boolean;
  is_active?: boolean;
  is_development?: boolean;
  role: string;
  permissions?: Record<string, boolean>;
  can_manage_stock?: boolean;
  can_count_stock?: boolean;
};
export type WorkspaceContext = { userId: string; fullName: string; isGlobalAdmin: boolean; patients: PatientContext[]; patient?: PatientContext; refresh: () => Promise<void> };

export const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-(--line) bg-white p-2.5 text-sm";
export const buttonClass = "min-h-11 rounded-lg border border-(--line) bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40";
export const primaryClass = "min-h-11 rounded-lg bg-(--brand) px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40";
export const panelClass = "rounded-xl border border-(--line) bg-white p-4 sm:p-6";

export function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const value = body as { error?: unknown; correlationId?: string };
  const error = typeof value.error === "string" ? value.error : value.error && typeof value.error === "object" && "message" in value.error ? String(value.error.message) : fallback;
  return value.correlationId ? `${error} Referência: ${value.correlationId}` : error;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "ApiError"; }
}

export async function api<T>(url: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal, ...(payload === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }) });
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error("O serviço não retornou uma resposta válida. Tente novamente."); }
  if (!response.ok) throw new ApiError(errorMessage(body, response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível concluir a operação."), response.status);
  return body as T;
}

export function may(context: WorkspaceContext, operation: "request" | "manage" | "manageStock" | "countStock") {
  const patient = context.patient;
  if (!patient) return false;
  if ((patient.active === false || patient.is_active === false) && operation !== "manage") return false;
  if (context.isGlobalAdmin || patient.role === "admin") return true;
  if (patient.role === "reader" || patient.role === "family") return false;
  if (operation === "manageStock" || operation === "manage") return false;
  const aliases = { request: ["canRequest", "can_request", "canCreateRequisitions"], manage: ["canManage", "can_manage"], manageStock: ["canManageStock", "can_manage_stock"], countStock: ["canCountStock", "can_count_stock"] }[operation];
  for (const key of aliases) if (patient.permissions && key in patient.permissions) return patient.permissions[key];
  if (operation === "countStock") return patient.can_count_stock === true;
  return operation === "request" && ["supervisor", "professional"].includes(patient.role);
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div role={error ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-sky-200 bg-sky-50 text-sky-900"}`}>{children}</div>;
}

export function Workspace({ title, children, administration = false }: { title: string; children: (context: WorkspaceContext) => ReactNode; administration?: boolean }) {
  const [context, setContext] = useState<{ userId: string; fullName: string; isGlobalAdmin: boolean; patients: PatientContext[] } | null>(null);
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback((signal?: AbortSignal) =>
    api<{ data: { userId: string; fullName: string; isGlobalAdmin: boolean; patients: PatientContext[] } }>("/api/context", undefined, signal).then((result) => {
      if (signal?.aborted) return;
      setContext(result.data);
      setPatientId((current) => {
        const remembered = current || new URLSearchParams(window.location.search).get("careRecipientId") || sessionStorage.getItem("hca:patient") || "";
        return result.data.patients.some((patient) => patient.id === remembered) ? remembered : result.data.patients[0]?.id ?? "";
      });
      setLoading(false);
    }, (reason) => { if (!signal?.aborted) { setError(reason instanceof Error ? reason.message : "Não foi possível validar seus pacientes."); setLoading(false); } }), []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const patient = context?.patients.find((item) => item.id === patientId);
  const refresh = async () => { setLoading(true); setError(""); await load(); };
  const value = context ? { ...context, patient, refresh } : null;
  const canAdminister = value && (value.isGlobalAdmin || value.patients.some((item) => item.role === "admin"));
  return <main className="min-h-screen">
    <header className="border-b border-(--line) bg-white print:hidden"><div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-(--brand)">Home Care Assistant</p><h1 className="mt-1 text-2xl font-semibold">{title}</h1></div><LogoutButton /></div>
      <nav aria-label="Navegação principal" className="flex flex-wrap gap-2"><Link className={buttonClass} href="/">Requisição</Link><Link className={buttonClass} href="/historico">Histórico</Link><Link className={buttonClass} href="/estoque">Estoque</Link><Link className={buttonClass} href="/inventarios">Inventários</Link>{canAdminister && <Link className={buttonClass} href="/admin">Administração</Link>}</nav>
      {context && context.patients.length > 0 && <label className="block max-w-xl text-sm font-semibold">Pessoa assistida<select className={inputClass} value={patientId} onChange={(event) => { setPatientId(event.target.value); sessionStorage.setItem("hca:patient", event.target.value); }}><option value="" disabled>Selecione um paciente autorizado</option>{context.patients.map((item) => <option key={item.id} value={item.id}>{item.display_name}{item.active === false || item.is_active === false ? " (inativo)" : ""}</option>)}</select></label>}
    </div></header>
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      {loading && <Notice>Validando sessão e pacientes autorizados…</Notice>}
      {error && <Notice error><p>{error}</p><div className="mt-3 flex gap-3"><button className={buttonClass} onClick={() => void load()}>Tentar novamente</button><Link className={buttonClass} href="/login">Entrar novamente</Link></div></Notice>}
      {!error && value && <>{!patient && !value.isGlobalAdmin ? <Notice>Nenhum paciente autorizado está vinculado à sua conta. Solicite acesso a um administrador.</Notice> : administration && !canAdminister ? <Notice error>Seu vínculo não permite administrar pacientes.</Notice> : <div key={patient?.id ?? "global"}>{patient && (patient.active === false || patient.is_active === false) && <Notice>Paciente inativo. O histórico permanece disponível; novas operações estão suspensas.</Notice>}{children(value)}</div>}</>}
    </div>
  </main>;
}
