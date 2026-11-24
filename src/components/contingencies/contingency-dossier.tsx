"use client";

import Link from "next/link";
import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode, RefObject } from "react";
import { Attachments } from "@/components/documents/attachments";
import { ActionButton, DefinitionGrid, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { roleLabel } from "@/lib/role-labels";
import { contingencyProcesses, storedContingencyContent, type ContingencyDossier } from "@/lib/validation/contingency";
import { ContingencyAttribution, ContingencyFacts, ContingencyMaterials } from "./contingency-facts";

export const dossierState = {
  recorded: "Aguardando conferência",
  needs_clarification: "Aguardando esclarecimento",
  linked: "Vinculada",
} as const;

type Props = {
  dossier: ContingencyDossier;
  patientName: string;
  allowReport: boolean;
  allowReview: boolean;
  blocked: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSupplement: (opener: HTMLElement) => void;
  onReview: (opener: HTMLElement) => void;
  refresh: () => void;
  children?: ReactNode;
};

export function ContingencyDossierPanel({ dossier, patientName, allowReport, allowReview, blocked, returnFocus, onClose, onSupplement, onReview, refresh, children }: Props) {
  const { occurredOn, occurredTime, timeZone } = dossier.content;
  const factDate = occurredOn ? occurredOn.split("-").reverse().join("/") : "Data desconhecida";
  const linked = dossier.events.findLast(event => event.action === "link_existing");
  const clarification = dossier.events.findLast(event => event.action === "needs_clarification");
  const targetId = linked?.body.targetId;
  const destination = typeof targetId === "string"
    ? (linked?.body.targetKind === "document" ? "/fichas/" + encodeURIComponent(targetId) + "?" : "/consumo?id=" + encodeURIComponent(targetId) + "&")
      + new URLSearchParams({ careRecipientId: dossier.patientId })
    : null;
  return <Tabs.Root defaultValue="facts">
    <Drawer open title={dossier.content.knownReference ?? "Dossiê de contingência"} kicker="Contingência física" headingIcon="note"
      subtitle={contingencyProcesses[dossier.process] + " · " + patientName} popupClassName="hca-contingency-dossier hca-guide-topic-sheet"
      onClose={onClose} closeLabel="Fechar dossiê" finalFocus={returnFocus}
      navigation={<div className="hca-contingency-dossier-navigation">
        <div className="hca-contingency-state">
          <Pill tone={dossier.state === "linked" ? "success" : "warning"}>{dossierState[dossier.state]}</Pill>
          <span>Revisão {dossier.revision}</span>
        </div>
        <Tabs.List aria-label="Seções do dossiê" className="hca-document-tab-list">
          <Tabs.Tab value="facts" className="hca-document-tab">Fatos</Tabs.Tab>
          <Tabs.Tab value="materials" className="hca-document-tab">Materiais</Tabs.Tab>
          <Tabs.Tab value="history" className="hca-document-tab">Histórico</Tabs.Tab>
        </Tabs.List>
      </div>}
      footer={<>
        <ActionButton onClick={onClose}><Icon name="back" />Voltar</ActionButton>
        {allowReport && <ActionButton disabled={blocked} onClick={event => onSupplement(event.currentTarget)}>
          <Icon name="plus" />Complementar
        </ActionButton>}
        {allowReview && <ActionButton variant="primary" disabled={blocked} onClick={event => onReview(event.currentTarget)}>
          <Icon name="check" />Conferir e vincular
        </ActionButton>}
      </>}>
      <section aria-label="Dossiê selecionado" className="hca-contingency-view">
        <Tabs.Panel value="facts" keepMounted>
          {dossier.state === "needs_clarification" && typeof clarification?.body.reason === "string" && <Notice>
            <strong>Foi solicitado um esclarecimento</strong><p>{clarification.body.reason}</p>
          </Notice>}
          <DefinitionGrid items={[
            { label: "Paciente", value: patientName },
            { label: "Processo", value: contingencyProcesses[dossier.process] },
            { label: "Data do fato físico", value: factDate + " · " + (occurredTime ?? "Horário desconhecido") },
            { label: "Fuso do fato físico", value: timeZone ?? "Desconhecido" },
            { label: "Quem declarou", value: dossier.actorName + " · " + roleLabel(dossier.actorRole) },
            { label: "Registro da declaração", value: formatBrazilDate(dossier.recordedAt) },
          ]} />
          <ContingencyFacts value={dossier.content} scope={dossier.id} layout="dossier" />
          <p className="hca-contingency-technical-id">Identificador do dossiê <code className="wrap-break-word">{dossier.id}</code></p>
          <Attachments patientId={dossier.patientId} contingencyId={dossier.id} writable={allowReport && !blocked} onChange={refresh} />
        </Tabs.Panel>
        <Tabs.Panel value="materials">
          <ContingencyMaterials materials={dossier.content.materials} scope={dossier.id} compact />
          <Notice>As quantidades deste dossiê não geram movimentação de estoque.</Notice>
        </Tabs.Panel>
        <Tabs.Panel value="history"><DossierHistory dossier={dossier} /></Tabs.Panel>
        {destination && <div className="hca-contingency-linked">
          <p>O vínculo preserva a declaração e as evidências conferidas, sem novo crédito, débito, ciência ou recebimento.</p>
          <Link className="hca-control hca-control--secondary" href={destination}>
            <Icon name="link" />{typeof linked?.body.targetCode === "string" ? linked.body.targetCode : "Consultar registro vinculado"}
          </Link>
        </div>}
      </section>
      {children}
    </Drawer>
  </Tabs.Root>;
}

function DossierHistory({ dossier }: { dossier: ContingencyDossier }) {
  const entries = [
    { id: dossier.id, at: dossier.recordedAt, title: "Declaração registrada", body: <ContingencyAttribution name={dossier.actorName} role={dossier.actorRole} at={dossier.recordedAt} /> },
    ...dossier.evidence.map(file => ({ id: file.id, at: file.confirmedAt, title: "Evidência anexada", body: <p>{file.filename} · {file.confirmedAt ? formatBrazilDate(file.confirmedAt) : "Data de confirmação indisponível"}</p> })),
    ...dossier.events.map(event => ({
      id: event.id, at: event.recordedAt,
      title: event.action === "supplement" ? "Informação complementar" : event.action === "needs_clarification" ? "Esclarecimento solicitado" : "Vínculo com registro existente",
      body: <>
        <ContingencyAttribution name={event.actorName} role={event.actorRole} at={event.recordedAt} />
        {event.action === "supplement" ? <ContingencyFacts value={storedContingencyContent.parse(event.body)} scope={event.id} /> :
          typeof event.body.reason === "string" ? <p className="whitespace-pre-wrap wrap-break-word">{event.body.reason}</p> : null}
      </>,
    })),
  ].sort((a, b) => a.at === b.at ? 0 : (a.at ? Date.parse(a.at) : Number.POSITIVE_INFINITY) - (b.at ? Date.parse(b.at) : Number.POSITIVE_INFINITY));
  return <ol className="hca-guide-timeline" aria-label="Histórico do dossiê">
    {entries.map(entry => <li key={entry.id}><span><Icon name="check" width={14} /></span><div><h3>{entry.title}</h3>{entry.body}</div></li>)}
  </ol>;
}
