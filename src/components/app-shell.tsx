"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { FeedbackBanner } from "@/components/ui/feedback";
import {
  ActionButton,
  LoadingIndicator,
  TextInput,
} from "@/components/ui/controls";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { can } from "@/lib/client/capabilities";
import type { WorkspaceContext } from "@/types/workspace";
import { Icon } from "@/components/ui/primitives";
import "./layout/context-selection.css";
import {
  roleLabel,
  useWorkspaceState,
} from "@/components/layout/workspace-context";

export function AppWorkspace({
  title,
  children,
  administration = false,
  administrationCapabilities = ["access.manage"],
  administrationReadRecovery = false,
  compact = false,
  account = false,
  documentPage = false,
}: {
  title: string;
  children: (context: WorkspaceContext) => ReactNode;
  administration?: boolean;
  administrationCapabilities?: string[];
  administrationReadRecovery?: boolean;
  compact?: boolean;
  account?: boolean;
  documentPage?: boolean;
}) {
  const {
    value,
    data,
    error,
    selectionError,
    loading,
    selecting,
    load,
    selectProfile,
  } = useWorkspaceState();
  const [profileSearch, setProfileSearch] = useState("");
  useOperationActivity(loading && !value, { title: "Preparando seu espaço", detail: "Estamos conferindo sua sessão e os acessos autorizados." });
  const normalize = (text: string) =>
    text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const profiles =
    value?.patients.filter(
      (patient) =>
        patient.hasMembership &&
        normalize(patient.display_name).includes(
          normalize(profileSearch.trim()),
        ),
    ) ?? [];
  const routePatient = useSearchParams().get("careRecipientId");
  const linkedPatient = data?.documentContext?.patientId ?? routePatient;
  const mismatch =
    linkedPatient &&
    (value?.activeContext?.mode !== "patient" ||
      value.activeContext.care_recipient_id !== linkedPatient) &&
    !administration;
  const choose = value && !account && (!value.activeContext || mismatch);
  const canAdminister =
    value &&
    (value.globalAdministrationAllowed ||
      administrationCapabilities.some((capability) => can(value, capability)));
  // A catalogue recovery surface may remain mounted under live patient read.
  // Its own capability gate hides new commands; APIs/RPCs still authorize recovery.
  const canRecover =
    administrationReadRecovery &&
    value?.activeContext?.mode === "patient" &&
    value.patient?.hasMembership;
  return (
    <main
      id="workspace-content"
      className={
        "workspace-content" + (compact ? " hca-compact-workspace" : "")
      }
      tabIndex={-1}
    >
      {!documentPage || choose || !value || error ? (
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {account
                ? "Conta pessoal"
                : (value?.patient?.display_name ?? "Home Care Assistant")}
            </p>
            <h1>{title}</h1>
          </div>
          {account ? (
            <span className="context-tag">Sua conta</span>
          ) : value?.activeContext ? (
            <span className="context-tag">
              {value.activeContext.mode === "global"
                ? "Administração global"
                : roleLabel(value.patient?.role)}
            </span>
          ) : null}
        </div>
      ) : null}
      {loading && !value ? (
        <div className="hca-loading" role="status">
          <LoadingIndicator />
          Validando sessão e pacientes autorizados…
        </div>
      ) : null}
      {error ? (
        <FeedbackBanner tone="error" role="alert">
          <p>{error}</p>
          <div className="hca-toolbar">
            <ActionButton onClick={() => void load()}>
              Tentar novamente
            </ActionButton>
            <Link href="/login">Entrar novamente</Link>
          </div>
        </FeedbackBanner>
      ) : null}
      {selectionError ? (
        <FeedbackBanner tone="error" role="alert">
          {selectionError}
        </FeedbackBanner>
      ) : null}
      {!account &&
      value?.activeContext?.mode === "global" &&
      !value.globalAdministrationAllowed ? (
        <FeedbackBanner tone="warning">
          Confirme seu autenticador para administrar.{" "}
          <Link href="/perfil?mfa=required">
            Verificar autenticação em duas etapas
          </Link>
        </FeedbackBanner>
      ) : null}
      {choose && !selecting ? (
        <section
          className="ui-card hca-context-selection"
          aria-label="Mudar perfil"
        >
          <h2>Escolha como deseja atuar</h2>
          {data?.documentContext ? (
            <p>
              Este documento pertence a {data.documentContext.displayName}.
              Selecione seu vínculo para continuar na tarefa.
            </p>
          ) : null}
          <p>Escolha um contexto autorizado para esta sessão.</p>
          <TextInput
            className="hca-context-search"
            aria-label="Buscar perfil autorizado"
            placeholder="Nome do paciente"
            value={profileSearch}
            onChange={(controlEvent) => {
              const controlValue = controlEvent.currentTarget.value;
              return setProfileSearch(controlValue);
            }}
          />
          {profiles.length > 50 ? (
            <p>
              Exibindo 50 de {profiles.length} vínculos. Use a busca para
              localizar o paciente.
            </p>
          ) : null}
          {!profiles.length ? <p>Nenhum vínculo corresponde à busca.</p> : null}
          <div className="hca-context-options">
            {value.isGlobalAdmin ? (
              <ActionButton
                className="hca-context-option"
                aria-label="Administração global"
                disabled={selecting}
                onClick={() => void selectProfile(null)}
              >
                <Icon name="shield" /><span><strong>Administração global</strong><small>Cadastro e propostas globais. A operação local exige seu vínculo no paciente.</small></span>
              </ActionButton>
            ) : null}
            {profiles.slice(0, 50).map((patient) => (
              <ActionButton
                key={patient.id}
                className="hca-context-option"
                aria-label={patient.display_name + " · " + roleLabel(patient.role)}
                disabled={selecting}
                onClick={() => void selectProfile(patient.id)}
              >
                <Icon name="home" /><span><strong>{patient.display_name}</strong><small>{roleLabel(patient.role)}{patient.is_active === false ? " · Paciente inativo" : ""}</small></span>
              </ActionButton>
            ))}
          </div>
        </section>
      ) : null}
      {!error && value && account ? (
        <div key={"account:" + value.userId}>{children(value)}</div>
      ) : !error && value?.activeContext && !mismatch ? (
        !value.patient && !value.isGlobalAdmin ? (
          <FeedbackBanner>
            Nenhum paciente autorizado está vinculado à sua conta.
          </FeedbackBanner>
        ) : administration && !canAdminister && !canRecover ? (
          <FeedbackBanner tone="error">
            Seu vínculo não permite administrar este paciente.
          </FeedbackBanner>
        ) : (
          <div
            key={`${value.patient?.id ?? "global"}:${value.activeContext.mode}`}
          >
            {value.patient?.is_active === false ? (
              <FeedbackBanner tone="warning">
                Paciente inativo. O histórico permanece disponível; novas
                operações estão suspensas.
              </FeedbackBanner>
            ) : null}
            {children(value)}
          </div>
        )
      ) : null}
    </main>
  );
}
