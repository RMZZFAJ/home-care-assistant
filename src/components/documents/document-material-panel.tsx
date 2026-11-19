"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { useScopedRead } from "@/lib/use-scoped-read";
import { documentMaterialPanel, materialPanelSections, type MaterialPanelSection } from "@/lib/validation/document-material-context";
import { documentStatusLabel } from "@/lib/documents/presentation";
import { materialVisitParam, prepareMaterialVisit } from "@/lib/documents/material-visit";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import type { DocumentType } from "@/types/documents";
import type { DocumentMaterialRow } from "./document-material-list";
import { RelatedDocumentBody } from "./related-document";

export type LinkedMaterialDocument = { id: string; code: string | null; type: DocumentType };
export type MaterialPanelPosition = {
  lineId: string;
  section: MaterialPanelSection;
  page: number;
  panelScroll: number;
  linked: LinkedMaterialDocument | null;
};
const labels = { stock: "Estoque", history: "Histórico", links: "Fichas" };
const movement = { adjustment: "Ajuste de estoque", transfer: "Transferência de estoque", consumption: "Consumo registrado", discard: "Descarte registrado", purchase: "Entrada da compra", donation: "Entrada da doação" } as Record<string, string>;
const custody = { FAMILY: "Família", CARE_TEAM: "Equipe", TRANSIT: "Em trânsito" } as Record<string, string>;

export function DocumentMaterialPanel({
  row, documentId, patientId, revision, position, onPosition, onNavigate, finalFocus, onClose,
}: {
  row: DocumentMaterialRow;
  documentId: string;
  patientId: string;
  revision: string;
  position: MaterialPanelPosition;
  onPosition: (next: MaterialPanelPosition) => void;
  onNavigate: (current: MaterialPanelPosition) => void;
  finalFocus: () => HTMLElement | false;
  onClose: () => void;
}) {
  const { section, page, linked } = position;
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const linkedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const linkedReturnFocusRef = useRef<string | null>(null);
  const restoredScrollRef = useRef(false);
  const decode = useCallback((raw: unknown) => {
    const data = documentMaterialPanel.parse(raw);
    if (data.documentId !== documentId || data.patientId !== patientId || data.lineId !== row.id
      || data.section !== section || data.page !== page) throw new Error("A resposta pertence a outra consulta.");
    return data;
  }, [documentId, patientId, row.id, section, page]);
  const { loading, data, error, refresh } = useScopedRead(
    `/api/documents/${documentId}/materials?line=${row.id}&section=${section}&page=${page}`, revision, decode,
  );
  useEffect(() => {
    if (loading || !data || restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    if (contentRef.current) contentRef.current.scrollTop = position.panelScroll;
  }, [loading, data, position.panelScroll]);
  useEffect(() => {
    if (linked || loading || !linkedReturnFocusRef.current) return;
    const frame = requestAnimationFrame(() => {
      const previous = linkedTriggerRef.current;
      const id = CSS.escape(linkedReturnFocusRef.current ?? "");
      const next = previous?.isConnected ? previous
        : contentRef.current?.querySelector<HTMLButtonElement>(`[data-material-reference="${id}"]`)
          ?? contentRef.current?.parentElement?.querySelector<HTMLButtonElement>('[data-material-section][aria-selected="true"]');
      linkedReturnFocusRef.current = null;
      next?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [linked, loading]);
  function select(next: MaterialPanelSection, nextPage = 1) {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    onPosition({ ...position, section: next, page: nextPage, panelScroll: 0 });
  }
  function link(record: LinkedMaterialDocument, detail?: ReactNode) {
    if (record.id === documentId) return null;
    return <button className="hca-material-link" type="button" aria-label={record.code ?? record.type} data-material-reference={record.id} onClick={event => {
      linkedTriggerRef.current = event.currentTarget;
      onPosition({ ...position, linked: record, panelScroll: contentRef.current?.scrollTop ?? 0 });
    }}>
      <Icon name="file" /><span><strong>{record.code ?? record.type}</strong>{detail ? <small>{detail}</small> : null}</span><Icon name="chevron" />
    </button>;
  }
  function closeLinked() {
    linkedReturnFocusRef.current = linked?.id ?? null;
    onPosition({ ...position, linked: null });
  }
  const displayQuantity = (value: string | null) => value === null ? "Não disponível nesta consulta" : formatQuantity(value, row.unit ?? undefined);
  return <Tabs.Root value={section} onValueChange={value => {
    if (materialPanelSections.some(item => item === value)) select(value as MaterialPanelSection);
  }}>
    <Drawer open title={row.name} kicker="Consulta de material" subtitle={row.unit ? "Unidade padrão · " + row.unit : undefined}
      popupClassName="hca-material-sheet" keyboardScrollable contentRef={contentRef} finalFocus={finalFocus} onClose={onClose}
      navigation={<Tabs.List aria-label="Consulta do material" className="hca-material-sheet-tabs">
        {materialPanelSections.map(item => <Tabs.Tab value={item} key={item} data-material-section>{labels[item]}</Tabs.Tab>)}
      </Tabs.List>}
      footer={<ActionButton onClick={onClose}><Icon name="back" />Voltar à ficha</ActionButton>}>
      <Tabs.Panel value={section} className="hca-material-sheet-body">
        {loading ? <LoadingIndicator label="Consultando material" /> : error ? <div role="alert" className="hca-v7-material-read-error">
          <p>{error}</p><ActionButton onClick={refresh}>Tentar novamente</ActionButton>
        </div> : data?.section === "stock" ? <>
          <section><h3>Estoque atual</h3><dl className="hca-material-balance-grid">
            <div><dt>Família · disponível</dt><dd>{displayQuantity(data.family)}</dd>
              {data.family !== null ? <dd className="hca-material-balance-note">Entradas aprovadas e movimentos confirmados</dd> : null}</div>
            <div><dt>Equipe · disponível</dt><dd>{displayQuantity(data.team)}</dd>
              {data.team !== null ? <dd className="hca-material-balance-note">Contagens e recebimentos confirmados</dd> : null}</div>
          </dl></section>
          {row.detail || row.related?.length ? <section><h3>Em acompanhamento nesta ficha</h3>
            {row.detail}
            {row.related?.length ? <div className="hca-material-linked-list">{row.related.map(item =>
              <div key={item.document.id}>{link(item.document, item.detail)}</div>
            )}</div> : null}
          </section> : null}
          <section><h3>Estoque informado nas requisições</h3>
            {data.observations.length ? <div className="hca-material-linked-list">{data.observations.map(observation => <article key={observation.documentId}>
              {link({ id: observation.documentId, code: observation.code, type: "REQ" }, formatBrazilDate(observation.createdAt))}
              <strong>{formatStockObservation(observation.quantity, observation.observation ?? undefined, observation.unit ?? undefined)}</strong>
              <small>{formatStockObservationTime(observation.observedAt, observation.timeSource ?? "legacy_unknown")}</small>
            </article>)}</div> : <p>Nenhuma contagem de requisição disponível para este material.</p>}
          </section>
        </> : data?.section === "history" ? <section>
          <h3>Movimentações e decisões</h3>
          {!data.available ? <p>O histórico depende do acesso à custódia.</p> : data.rows.length ? <ol className="hca-material-timeline">{data.rows.map(item => <li key={item.id}>
            <span className="hca-material-timeline-icon"><Icon name="history" /></span>
            <div><strong>{movement[item.type] ?? "Movimentação registrada"}</strong>
              <p>{displayQuantity(item.quantity)} · {custody[item.source ?? ""] ?? "Entrada"} → {custody[item.destination ?? ""] ?? "Retirada"}</p>
              <small>{item.author ?? "Autoria indisponível"} · {formatBrazilDate(item.createdAt)}</small>
              {item.document ? link(item.document) : null}</div>
          </li>)}</ol> : <p>Nenhuma movimentação disponível para este material.</p>}
        </section> : data?.section === "links" ? <section>
          <h3>Fichas relacionadas</h3>
          {data.rows.length ? <div className="hca-material-linked-list">{data.rows.map(item => <div key={item.id}>
            {link(item, `${item.kind} · ${item.archived ? "Arquivada" : documentStatusLabel(item.status)} · ${formatBrazilDate(item.createdAt)}`)}
          </div>)}</div> : <p>Nenhuma ficha relacionada disponível neste vínculo.</p>}
        </section> : null}
        {data && data.section !== "stock" && (data.total > 20 || page > 1) ? <div className="hca-material-pagination">
          <ActionButton disabled={page === 1} onClick={() => select(section, page - 1)}>Anterior</ActionButton>
          <span>Página {page} de {Math.max(1, Math.ceil(data.total / 20))}</span>
          <ActionButton disabled={data.total <= page * 20} onClick={() => select(section, page + 1)}>Próxima</ActionButton>
        </div> : null}
      </Tabs.Panel>
      {linked ? <Drawer open title={linked.code ?? linked.type} kicker="Ficha relacionada" keyboardScrollable
        popupClassName="hca-material-sheet" onClose={closeLinked}
        footer={<>
          <ActionButton onClick={closeLinked}><Icon name="back" />Voltar ao material</ActionButton>
          <Link href={`/fichas/${linked.id}`} className="ui-button ui-button-primary" onNavigate={event => {
            onNavigate({ ...position, panelScroll: contentRef.current?.scrollTop ?? position.panelScroll });
            const token = prepareMaterialVisit(linked.id, patientId);
            if (token) {
              event.preventDefault();
              router.push(`/fichas/${linked.id}?${materialVisitParam}=${token}`);
            }
          }}>
            <Icon name="external" />Abrir {linked.code ?? "ficha"}
          </Link>
        </>}>
        <RelatedDocumentBody id={linked.id} type={linked.type} onClose={closeLinked} />
      </Drawer> : null}
    </Drawer>
  </Tabs.Root>;
}
