"use client";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { useEffect, useState } from "react";

import { api, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { EmptyState } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";
import type { DashboardData } from "@/types/dashboard";
import { ManagementDashboard } from "./dashboard/management-dashboard";
import { OperationsDashboard } from "./dashboard/operations-dashboard";
import { GlobalDashboard } from "./dashboard/global-dashboard";

export function Dashboard() {
  return <Workspace title="Visão geral">{(context) => context.activeContext?.mode === "global" ? <GlobalDashboard context={context} /> : context.patient ? <PatientDashboard context={context} /> : <EmptyState title="Seu espaço de cuidado começa aqui">Selecione um contexto autorizado para acompanhar suas próximas tarefas.</EmptyState>}</Workspace>;
}
function PatientDashboard({ context }: { context: WorkspaceContext }) {
  const revision = useLiveRevision();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ data: DashboardData }>("/api/dashboard?careRecipientId=" + context.patient!.id, undefined, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setData(result.data); setError(""); }
    }, (reason) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [context.patient, attempt, revision]);
  if (error) return <Notice error>{error}<ActionButton onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</ActionButton></Notice>;
  if (!data) return <LoadingIndicator label="Organizando suas próximas ações"  />;
  return ["professional", "supervisor"].includes(context.patient!.role) ? <OperationsDashboard context={context} data={data} /> : <ManagementDashboard context={context} data={data} />;
}
