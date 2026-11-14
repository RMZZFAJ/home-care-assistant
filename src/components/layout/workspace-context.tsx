"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { api, ApiError } from "@/lib/client/api";
import type { PatientContext, WorkspaceContext } from "@/types/workspace";
import { demoDocuments } from "@/lib/demo-documents";
import { WorkspaceShell } from "./workspace-shell";
import { usePwa } from "@/components/pwa/pwa-provider";
import { recentDestinationKey } from "@/lib/auth/recent-destination";

export type ContextData = {
  documentContext?: { id: string; patientId: string; displayName: string; type: string; } | null;
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
  selectionError: string;
  requestedPatientId: string | null;
  load: () => Promise<void>;
  selectProfile: (id: string | null) => Promise<boolean>;
  selectPatient: (id: string) => Promise<void>;
};
const empty: State = {
  value: null, data: null, loading: true, selecting: false, error: "", selectionError: "", requestedPatientId: null,
  load: async () => { }, selectProfile: async () => false, selectPatient: async () => { },
};
const Context = createContext<State>(empty);
export { roleLabels, roleLabel } from "@/lib/role-labels";
export function useWorkspaceState() { return use(Context); }

/** One authority read model survives navigation; browser selection never authorizes. */
export function WorkspaceProvider({ children }: { children: ReactNode; }) {
  const { blocked, notices } = usePwa();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPatientId = searchParams.get("careRecipientId");
  const documentId = /^\/(?:historico|fichas|documentos)\/([0-9a-f-]{36})(?:\/arquivos)?$/.exec(pathname)?.[1];
  const segment = pathname.split("/")[2];
  const publicPage = ["/login", "/recuperar-senha", "/convites/aceitar"].includes(pathname)
    || pathname === "/acesso/continuar"
    || pathname === "/verificar" || pathname.startsWith("/verificar/") || Boolean(segment && demoDocuments[segment]);
  const [data, setData] = useState<ContextData | null>(null);
  const [patientId, setPatientId] = useState("");
  const [loadingRead, setLoadingRead] = useState(true);
  const scope = JSON.stringify([pathname, requestedPatientId]);
  const [resolvedScope, setResolvedScope] = useState<string | null>(null);
  const loading = !publicPage && (loadingRead || resolvedScope !== scope);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const sequenceRef = useRef(0);
  const navigationScopeRef = useRef<string | null>(null);
  const load = useCallback((signal?: AbortSignal) => {
    const sequence = ++sequenceRef.current;
    const requested = requestedPatientId;
    return api<{ data: ContextData; }>("/api/context" + (documentId ? "?documentId=" + documentId : ""), undefined, signal).then((result) => {
      if (signal?.aborted || sequence !== sequenceRef.current) return;
      setData((current) => ({
        ...result.data, patients: result.data.patients.map((row) => {
          const previous = current?.patients.find((item) => item.id === row.id);
          return previous && JSON.stringify(previous) === JSON.stringify(row) ? previous : row;
        })
      }));
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
      if (!signal?.aborted && sequence === sequenceRef.current) {
        setResolvedScope(scope); setLoadingRead(false);
        if (navigationScopeRef.current === scope) { navigationScopeRef.current = null; setSelecting(false); }
      }
    });
  }, [documentId, requestedPatientId, scope, setData, setPatientId, setError, setResolvedScope, setLoadingRead]);
  useEffect(() => {
    if (publicPage) {
      sequenceRef.current++;
      let active = true;
      void Promise.resolve().then(() => { if (active) { setData(null); setPatientId(""); setLoadingRead(true); } });
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
    setSelectionError("");
    try {
      await api("/api/context", { careRecipientId: id });
      await load();
      if (id) { try { sessionStorage.setItem("hca:patient", id); } catch { /* Optional UI preference. */ } }
      if (!documentId) {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set("careRecipientId", id);
        else if (!pathname.startsWith("/admin") && pathname !== "/configuracoes") url.searchParams.delete("careRecipientId");
        window.history.replaceState(null, "", url);
      } else if (id !== data?.documentContext?.patientId) {
        navigationScopeRef.current = JSON.stringify(["/", id]);
        router.replace(id ? "/?careRecipientId=" + encodeURIComponent(id) : "/");
      }
      // All patient read models consume this confirmed client context. A
      // concurrent RSC refresh can restore an earlier query during a second
      // switch; the server session gate depends on identity, not this selection.
      window.dispatchEvent(new Event("hca:context-changed"));
      return true;
    } catch (reason) {
      setSelectionError(reason instanceof Error ? reason.message : "Não foi possível selecionar o perfil.");
      return false;
    } finally { if (!navigationScopeRef.current) setSelecting(false); }
  };
  const selectPatient = async (id: string) => {
    if (data?.activeContext?.mode === "patient") { await selectProfile(id); return; }
    setPatientId(id);
    try { sessionStorage.setItem("hca:patient", id); } catch { /* No authority in storage. */ }
    const url = new URL(window.location.href);
    url.searchParams.set("careRecipientId", id);
    window.history.replaceState(null, "", url);
  };
  const patient = data?.patients.find((row) => row.id === patientId);
  const value: WorkspaceContext | null = data ? { ...data, patient, refresh: load } : null;
  useEffect(() => {
    if (publicPage || error || loading || selecting || !data || !patient?.hasMembership || data.activeContext?.mode !== "patient" || data.activeContext.care_recipient_id !== patient.id) return;
    const remember = () => {
      try { sessionStorage.setItem(recentDestinationKey, JSON.stringify({ userId: data.userId, patientId: patient.id, path: window.location.pathname + window.location.search + window.location.hash, at: Date.now() })); } catch { /* Optional preference. */ }
    };
    remember();
    window.addEventListener("pagehide", remember);
    return () => window.removeEventListener("pagehide", remember);
  }, [publicPage, error, loading, selecting, data, patient, pathname, searchParams]);
  const state = { value, data, loading, selecting, error, selectionError, requestedPatientId, load, selectProfile, selectPatient };
  useOperationActivity(!publicPage && (loading || selecting), { title: selecting ? "Mudando de paciente" : "Preparando seu espaço", detail: "Estamos conferindo sua sessão e os acessos autorizados." });
  return <Context value={state}>{publicPage ? <>{notices}<div inert={blocked}>{children}</div></> : <WorkspaceShell showOnboarding={pathname === "/"}>{children}</WorkspaceShell>}</Context>;
}
