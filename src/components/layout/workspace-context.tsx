"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/client/api";
import type { PatientContext, WorkspaceContext } from "@/types/workspace";
import { demoDocuments } from "@/lib/demo-documents";
import { WorkspaceShell } from "./workspace-shell";

export type ContextData = {
  documentContext?: { id: string; patientId: string; displayName: string; type: string } | null;
  avatarUrl?: string | null;
  userId: string;
  fullName: string;
  isGlobalAdmin: boolean;
  globalAdministrationAllowed?: boolean;
  activeContext: WorkspaceContext["activeContext"];
  patients: PatientContext[];
};
type State = {
  value: WorkspaceContext | null;
  data: ContextData | null;
  loading: boolean;
  selecting: boolean;
  error: string;
  requestedPatientId: string | null;
  load: () => Promise<void>;
  selectProfile: (id: string | null) => Promise<boolean>;
  selectPatient: (id: string) => Promise<void>;
};
const empty: State = {
  value: null, data: null, loading: true, selecting: false, error: "", requestedPatientId: null,
  load: async () => {}, selectProfile: async () => false, selectPatient: async () => {},
};
const Context = createContext<State>(empty);
export const roleLabels: Record<string, string> = {
  admin: "Administrador do paciente", family: "Familiar", supervisor: "Supervisor",
  professional: "Profissional", reader: "Leitor",
};
export function useWorkspaceState() { return use(Context); }

/** One authority read model survives navigation; browser selection never authorizes. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const requestedPatientId = useSearchParams().get("careRecipientId");
  const documentId = /^\/(?:historico|fichas|documentos)\/([0-9a-f-]{36})$/.exec(pathname)?.[1];
  const segment = pathname.split("/")[2];
  const publicPage = ["/login", "/recuperar-senha", "/convites/aceitar"].includes(pathname)
    || pathname.startsWith("/verificar/") || Boolean(segment && demoDocuments[segment]);
  const [data, setData] = useState<ContextData | null>(null);
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const sequenceRef = useRef(0);
  const load = useCallback((signal?: AbortSignal) => {
    const sequence = ++sequenceRef.current;
    const requested = requestedPatientId;
    return api<{ data: ContextData }>("/api/context" + (documentId ? "?documentId=" + documentId : ""), undefined, signal).then((result) => {
      if (signal?.aborted || sequence !== sequenceRef.current) return;
      setData((current) => ({ ...result.data, patients: result.data.patients.map((row) => {
        const previous = current?.patients.find((item) => item.id === row.id);
        return previous && JSON.stringify(previous) === JSON.stringify(row) ? previous : row;
      }) }));
      setPatientId((current) => {
        if (result.data.activeContext?.mode === "patient") return result.data.activeContext.care_recipient_id ?? "";
        let remembered = "";
        try { remembered = sessionStorage.getItem("hca:patient") ?? ""; } catch { /* Optional UI preference. */ }
        return [requested, current, remembered].find((id) => result.data.patients.some((row) => row.id === id)) ?? "";
      });
      setError("");
    }).catch((reason) => {
      if (signal?.aborted || sequence !== sequenceRef.current) return;
      if (reason instanceof ApiError && [401, 403].includes(reason.status)) setData(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível validar seu acesso.");
    }).finally(() => {
      if (!signal?.aborted && sequence === sequenceRef.current) setLoading(false);
    });
  }, [documentId, requestedPatientId]);
  useEffect(() => {
    if (publicPage) {
      sequenceRef.current++;
      let active = true;
      void Promise.resolve().then(() => { if (active) { setData(null); setPatientId(""); setLoading(true); } });
      return () => { active = false; };
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, publicPage, pathname]);
  useEffect(() => {
    if (publicPage) return;
    const refresh = () => { void load(); };
    window.addEventListener("hca:profile-updated", refresh);
    window.addEventListener("hca:data-changed", refresh);
    return () => {
      window.removeEventListener("hca:profile-updated", refresh);
      window.removeEventListener("hca:data-changed", refresh);
    };
  }, [load, publicPage]);
  const selectProfile = async (id: string | null) => {
    setSelecting(true);
    setError("");
    try {
      await api("/api/context", { careRecipientId: id });
      if (!documentId) {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set("careRecipientId", id);
        else if (!pathname.startsWith("/admin") && pathname !== "/configuracoes") url.searchParams.delete("careRecipientId");
        window.history.replaceState(null, "", url);
      }
      await load();
      router.refresh();
      window.dispatchEvent(new Event("hca:context-changed"));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível selecionar o perfil.");
      return false;
    } finally { setSelecting(false); }
  };
  const selectPatient = async (id: string) => {
    if (data?.activeContext?.mode === "patient" && !await selectProfile(id)) return;
    setPatientId(id);
    try { sessionStorage.setItem("hca:patient", id); } catch { /* No authority in storage. */ }
    const url = new URL(window.location.href);
    url.searchParams.set("careRecipientId", id);
    window.history.replaceState(null, "", url);
  };
  const patient = data?.patients.find((row) => row.id === patientId);
  const value: WorkspaceContext | null = data ? { ...data, patient, refresh: load } : null;
  const state = { value, data, loading, selecting, error, requestedPatientId, load, selectProfile, selectPatient };
  return <Context value={state}>{publicPage ? children : <WorkspaceShell>{children}</WorkspaceShell>}</Context>;
}
