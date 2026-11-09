"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Input, MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { can } from "@/lib/client/capabilities";
import type { WorkspaceContext } from "@/types/workspace";
import { roleLabel, useWorkspaceState } from "@/components/layout/workspace-context";

export function AppWorkspace({ title, children, administration = false, administrationCapabilities = ["access.manage"], administrationReadRecovery = false, compact = false, account = false }: {
  title: string; children: (context: WorkspaceContext) => ReactNode; administration?: boolean; administrationCapabilities?: string[]; administrationReadRecovery?: boolean; compact?: boolean; account?: boolean;
}) {
  const { value, data, error, selectionError, loading, selecting, load, selectProfile } = useWorkspaceState();
  const [profileSearch, setProfileSearch] = useState("");
  const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const profiles = value?.patients.filter((patient) => patient.hasMembership && normalize(patient.display_name).includes(normalize(profileSearch.trim()))) ?? [];
  const routePatient = useSearchParams().get("careRecipientId");
  const linkedPatient = data?.documentContext?.patientId ?? routePatient;
  const mismatch = linkedPatient && (value?.activeContext?.mode !== "patient" || value.activeContext.care_recipient_id !== linkedPatient) && !administration;
  const choose = value && !account && (!value.activeContext || mismatch);
  const canAdminister = value && (value.globalAdministrationAllowed || administrationCapabilities.some((capability) => can(value, capability)));
  // A catalogue recovery surface may remain mounted under live patient read.
  // Its own capability gate hides new commands; APIs/RPCs still authorize recovery.
  const canRecover = administrationReadRecovery && value?.activeContext?.mode === "patient" && value.patient?.hasMembership;
  return <main id="workspace-content" className={"workspace-content" + (compact ? " hca-compact-workspace" : "")} tabIndex={-1}>
    <div className="page-heading"><div><p className="eyebrow">{account ? "Conta pessoal" : value?.patient?.display_name ?? "Home Care Assistant"}</p><h1>{title}</h1></div>
      {account ? <span className="context-tag">Sua conta</span> : value?.activeContext ? <span className="context-tag">{value.activeContext.mode === "global" ? "Administração global" : roleLabel(value.patient?.role)}</span> : null}
    </div>
    {loading && !value ? <div className="hca-loading" role="status"><Spinner size="small" />Validando sessão e pacientes autorizados…</div> : null}
    {error ? <MessageBar layout="multiline" intent="error" role="alert"><MessageBarBody><p>{error}</p><div className="hca-toolbar"><Button onClick={() => void load()}>Tentar novamente</Button><Link href="/login">Entrar novamente</Link></div></MessageBarBody></MessageBar> : null}
    {selectionError ? <MessageBar layout="multiline" intent="error" role="alert"><MessageBarBody>{selectionError}</MessageBarBody></MessageBar> : null}
    {!account && value?.activeContext?.mode === "global" && !value.globalAdministrationAllowed ? <MessageBar layout="multiline" intent="warning"><MessageBarBody>Confirme seu autenticador para administrar. <Link href="/perfil?mfa=required">Verificar autenticação em duas etapas</Link></MessageBarBody></MessageBar> : null}
    {choose && !selecting ? <section className="ui-card hca-context-selection" aria-label="Mudar perfil">
      <h2 className="text-lg font-semibold">Escolha como deseja atuar</h2>
      {data?.documentContext ? <p>Este documento pertence a {data.documentContext.displayName}. Selecione seu vínculo para continuar na tarefa.</p> : null}
      <p>Escolha um contexto autorizado para esta sessão.</p>
      <Input aria-label="Buscar perfil autorizado" placeholder="Nome do paciente" value={profileSearch} onChange={(_, next) => setProfileSearch(next.value)} />
      {profiles.length > 50 ? <p>Exibindo 50 de {profiles.length} vínculos. Use a busca para localizar o paciente.</p> : null}
      {!profiles.length ? <p>Nenhum vínculo corresponde à busca.</p> : null}
      <div className="hca-context-options">
        {value.isGlobalAdmin ? <Button disabled={selecting} onClick={() => void selectProfile(null)}>Administração global</Button> : null}
        {profiles.slice(0, 50).map((patient) => <Button key={patient.id} disabled={selecting} onClick={() => void selectProfile(patient.id)}>{patient.display_name} · {roleLabel(patient.role)}</Button>)}
      </div>
    </section> : null}
    {!error && value && account ? <div key={"account:" + value.userId}>{children(value)}</div> : !error && value?.activeContext && !mismatch ? !value.patient && !value.isGlobalAdmin ? <MessageBar layout="multiline"><MessageBarBody>Nenhum paciente autorizado está vinculado à sua conta.</MessageBarBody></MessageBar> : administration && !canAdminister && !canRecover ? <MessageBar layout="multiline" intent="error"><MessageBarBody>Seu vínculo não permite administrar este paciente.</MessageBarBody></MessageBar> : <div key={`${value.patient?.id ?? "global"}:${value.activeContext.mode}`}>
      {value.patient?.is_active === false ? <MessageBar layout="multiline" intent="warning"><MessageBarBody>Paciente inativo. O histórico permanece disponível; novas operações estão suspensas.</MessageBarBody></MessageBar> : null}
      {children(value)}
    </div> : null}
  </main>;
}
