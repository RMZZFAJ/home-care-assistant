"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/primitives";
import type { DocumentType } from "@/types/documents";

export type DocumentTab =
  | "overview"
  | "materials"
  | "workflow"
  | "communications"
  | "files"
  | "attachments"
  | "history"
  | "audit";
const baseTabs: { id: DocumentTab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Visão geral", icon: "home" },
  { id: "materials", label: "Materiais", icon: "stock" },
  { id: "workflow", label: "Atendimento", icon: "check" },
  { id: "communications", label: "Comunicações", icon: "bell" },
  { id: "files", label: "Arquivos gerados", icon: "forms" },
  { id: "attachments", label: "Anexos", icon: "link" },
  { id: "history", label: "Versões e integridade", icon: "history" },
];

export function useDocumentTabs(auditAllowed: boolean) {
  const params = useSearchParams();
  const requested = params.get("documentTab");
  const valid = [
    ...baseTabs.map((tab) => tab.id),
    ...(auditAllowed ? ["audit"] : []),
  ];
  const value: DocumentTab = valid.includes(requested ?? "")
    ? (requested as DocumentTab)
    : params.has("historyVersion")
      ? "history"
      : "overview";
  function select(next: DocumentTab) {
    if (!valid.includes(next)) return;
    const url = new URL(window.location.href);
    url.searchParams.set("documentTab", next);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  return { value, select };
}

export function DocumentTabs({
  type,
  value,
  onSelect,
  auditAllowed,
  children,
}: {
  type: DocumentType;
  value: DocumentTab;
  onSelect: (value: DocumentTab) => void;
  auditAllowed: boolean;
  children: ReactNode;
}) {
  const tabs = [
    ...baseTabs,
    ...(auditAllowed
      ? [{ id: "audit" as const, label: "Auditoria", icon: "history" as const }]
      : []),
  ];
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onSelect(next as DocumentTab);
      }}
      className="hca-document-tabs"
    >
      <Tabs.List aria-label="Seções da ficha" className="hca-document-tab-list">
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} value={tab.id} className="hca-document-tab">
            <Icon name={tab.icon} />
            {tab.id === "workflow"
              ? type === "COM"
                ? "Aquisição"
                : type === "BAL"
                  ? "Contagem e revisão"
                  : "Atendimento"
              : tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
}

/** Panels stay mounted: navigation cannot discard an edit or an unknown command. */
export function DocumentPanel({
  value,
  children,
}: {
  value: DocumentTab;
  children: ReactNode;
}) {
  return (
    <Tabs.Panel value={value} keepMounted className="hca-document-panel">
      {children}
    </Tabs.Panel>
  );
}

export function DocumentAuditAccess({ patientId }: { patientId: string }) {
  return (
    <section className="ui-card">
      <h2>Auditoria autorizada</h2>
      <p className="hca-field-help">
        Versões da ficha permanecem na aba Versões e integridade. A consulta de
        auditoria usa as permissões e filtros do paciente; não representa
        conclusão de uma tarefa.
      </p>
      <Link
        href={`/admin?section=audit&careRecipientId=${patientId}`}
        className="hca-control hca-control--secondary"
      >
        Consultar auditoria deste paciente
      </Link>
    </section>
  );
}
