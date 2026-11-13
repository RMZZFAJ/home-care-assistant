"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode, type Ref } from "react";
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
const baseTabs: { id: DocumentTab; label: string; icon: IconName; }[] = [
  { id: "overview", label: "Visão geral", icon: "home" },
  { id: "materials", label: "Materiais", icon: "stock" },
  { id: "communications", label: "Comunicações", icon: "bell" },
  { id: "files", label: "Arquivos gerados", icon: "forms" },
  { id: "attachments", label: "Anexos", icon: "link" },
];

export function useDocumentTabs(auditAllowed: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusSelectionRef = useRef(false);
  const params = useSearchParams();
  const requested = params.get("documentTab");
  const valid = [
    ...baseTabs.map((tab) => tab.id),
    "history",
    ...(auditAllowed ? ["audit"] : []),
  ];
  const value: DocumentTab = requested === "workflow" ? "materials" : valid.includes(requested ?? "")
    ? (requested as DocumentTab)
    : params.has("historyVersion")
      ? "history"
      : "overview";
  useEffect(() => {
    if (!focusSelectionRef.current && value !== "history") return;
    const target = rootRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (target) {
      focusSelectionRef.current = false;
      target.focus();
    }
  }, [value]);
  function select(next: DocumentTab, focus = false) {
    if (next === "workflow") next = "materials";
    if (!valid.includes(next)) return;
    focusSelectionRef.current = focus;
    const url = new URL(window.location.href);
    url.searchParams.set("documentTab", next);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (focus && next === value) {
      focusSelectionRef.current = false;
      rootRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    }
  }
  return { value, select, rootRef };
}

export function DocumentTabs({
  type,
  value,
  onSelect,
  auditAllowed,
  children,
  rootRef,
}: {
  type: DocumentType;
  value: DocumentTab;
  onSelect: (value: DocumentTab) => void;
  auditAllowed: boolean;
  children: ReactNode;
  rootRef?: Ref<HTMLDivElement>;
}) {
  const tabs = [
    ...baseTabs,
    ...(auditAllowed
      ? [{ id: "audit" as const, label: "Auditoria", icon: "history" as const }]
      : []),
  ];
  return (
    <Tabs.Root
      ref={rootRef}
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
      <div hidden={value !== "history"} className="hca-document-technical-nav"><Tabs.List aria-label="Consulta técnica da ficha"><Tabs.Tab value="history" className="hca-document-tab">Identificação e registros preservados</Tabs.Tab></Tabs.List><button type="button" className="ui-button" onClick={() => onSelect("overview")}>Voltar à ficha</button></div>
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

export function DocumentAuditAccess({ patientId }: { patientId: string; }) {
  return (
    <section className="ui-card">
      <h2>Auditoria autorizada</h2>
      <p className="hca-field-help">
        A identificação técnica e os registros estão disponíveis em Mais. A consulta de
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
