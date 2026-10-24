"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { may } from "@/lib/client/capabilities";
import type { WorkspaceContext } from "@/types/workspace";
import { roleLabels, useWorkspaceState } from "@/components/layout/workspace-context";

export function AppWorkspace({ title, children, administration = false }: {
  title: string; children: (context: WorkspaceContext) => ReactNode; administration?: boolean;
}) {
  const { value, data, error, loading, selecting, load, selectProfile } = useWorkspaceState();
  const routePatient = useSearchParams().get("careRecipientId");
  const linkedPatient = data?.documentContext?.patientId ?? routePatient;
  const mismatch = linkedPatient && (value?.activeContext?.mode !== "patient" || value.activeContext.care_recipient_id !== linkedPatient) && !administration;
  const choose = value && (!value.activeContext || mismatch);
  const canAdminister = value && (value.globalAdministrationAllowed || may(value, "manage"));
  return <main id="workspace-content" className="workspace-content">
    <div className="page-heading"><div><p className="eyebrow">{value?.patient?.display_name ?? "Home Care Assistant"}</p><h1>{title}</h1></div>
      {value?.activeContext ? <span className="context-tag">{value.activeContext.mode === "global" ? "Administração global" : roleLabels[value.patient?.role ?? ""]}</span> : null}
    </div>
    {loading && !value ? <div className="hca-loading" role="status"><Spinner size="small" />Validando sessão e pacientes autorizados…</div> : null}
    {error ? <MessageBar intent="error"><MessageBarBody><p>{error}</p><div className="hca-toolbar"><Button onClick={() => void load()}>Tentar novamente</Button><Link href="/login">Entrar novamente</Link></div></MessageBarBody></MessageBar> : null}
    {value?.activeContext?.mode === "global" && !value.globalAdministrationAllowed ? <MessageBar intent="warning"><MessageBarBody>Confirme seu autenticador para administrar. <Link href="/perfil?mfa=required">Verificar autenticação em duas etapas</Link></MessageBarBody></MessageBar> : null}
    {choose ? <section className="ui-card hca-context-selection" aria-label="Mudar perfil">
      <h2 className="text-lg font-semibold">Escolha como deseja atuar</h2>
      {data?.documentContext ? <p>Este documento pertence a {data.documentContext.displayName}. Selecione seu vínculo para continuar na tarefa.</p> : null}
      <p>Escolha um contexto autorizado para esta sessão.</p>
      <div className="hca-context-options">
        {value.isGlobalAdmin ? <Button disabled={selecting} onClick={() => void selectProfile(null)}>Administração global</Button> : null}
        {value.patients.filter((patient) => patient.hasMembership).map((patient) => <Button key={patient.id} disabled={selecting} onClick={() => void selectProfile(patient.id)}>{patient.display_name} · {roleLabels[patient.role] ?? patient.role}</Button>)}
      </div>
    </section> : null}
    {!error && value?.activeContext && !mismatch ? !value.patient && !value.isGlobalAdmin ? <MessageBar><MessageBarBody>Nenhum paciente autorizado está vinculado à sua conta.</MessageBarBody></MessageBar> : administration && !canAdminister ? <MessageBar intent="error"><MessageBarBody>Seu vínculo não permite administrar este paciente.</MessageBarBody></MessageBar> : <div key={`${value.patient?.id ?? "global"}:${value.activeContext.mode}`}>
      {value.patient?.is_active === false ? <MessageBar intent="warning"><MessageBarBody>Paciente inativo. O histórico permanece disponível; novas operações estão suspensas.</MessageBarBody></MessageBar> : null}
      {children(value)}
    </div> : null}
  </main>;
}
