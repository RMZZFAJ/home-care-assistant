"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { PageLoadingActivity } from "@/components/ui/operation-activity";
import { useScopedRead } from "@/lib/use-scoped-read";
import { documentMaterialPanel, materialPanelSections, type MaterialPanelSection } from "@/lib/validation/document-material-context";
import { documentStatusLabel } from "@/lib/documents/presentation";
import { materialVisitParam, prepareMaterialVisit } from "@/lib/documents/material-visit";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import type { DocumentType } from "@/types/documents";
import type { WorkspaceContext } from "@/types/workspace";
import type { DocumentMaterialRow } from "./document-material-list";
import { RelatedDocumentBody } from "./related-document";
import { DocumentMaterialHistory } from "./document-material-history";
import { MaterialVisitContext } from "./material-visit-context";
import type { MaterialVisitTarget } from "./material-full-visit";

const MaterialFullVisit = lazy(() => import("./material-full-visit").then(module => ({ default: module.MaterialFullVisit })));

export type LinkedMaterialDocument = { id: string; code: string | null; type: DocumentType };
export type MaterialPanelPosition = {
  lineId: string;
  section: MaterialPanelSection;
  page: number;
  panelScroll: number;
  focusEntry?: string;
  linked: LinkedMaterialDocument | null;
};
const labels = { stock: "Estoque", history: "Histórico", links: "Fichas" };

export function DocumentMaterialPanel({
  row, documentId, patientId, revision, position, onPosition, onNavigate, finalFocus, onClose, inlineContext,
  closeText = "Voltar à ficha", detailTitle = "Em acompanhamento nesta ficha",
}: {
  row: Pick<DocumentMaterialRow, "id" | "name" | "unit" | "detail" | "related">;
  documentId?: string;
  patientId: string;
  revision: string;
  position: MaterialPanelPosition;
  onPosition: (next: MaterialPanelPosition) => void;
  onNavigate?: (current: MaterialPanelPosition) => void;
  finalFocus: () => HTMLElement | false;
  onClose: () => void;
  inlineContext?: WorkspaceContext;
  closeText?: string;
  detailTitle?: string;
}) {
  const { section, page, linked } = position;
  const router = useRouter();
  const inheritedContext = use(MaterialVisitContext);
  const visitContext = inlineContext ?? inheritedContext;
  const [inlineVisit, setInlineVisit] = useState<{ target: MaterialVisitTarget; key: string | null; opener: HTMLElement | null } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inlineOpenerRef = useRef<HTMLElement | null>(null);
  const linkedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const linkedReturnFocusRef = useRef<string | null>(null);
  const restoredScrollRef = useRef(false);
  const decode = useCallback((raw: unknown) => {
    const data = documentMaterialPanel.parse(raw);
    const material = documentId ? data.lineId : data.productId;
    if (data.documentId !== (documentId ?? null) || data.patientId !== patientId || material !== row.id
      || data.section !== section || data.page !== page) throw new Error("A resposta pertence a outra consulta.");
    return data;
  }, [documentId, patientId, row.id, section, page]);
  const query = new URLSearchParams({ section, page: String(page) });
  if (documentId) query.set("line", row.id);
  else { query.set("productId", row.id); query.set("careRecipientId", patientId); }
  const endpoint = documentId ? `/api/documents/${documentId}/materials` : "/api/catalog/material";
  const { loading, data, error, refresh } = useScopedRead(
    endpoint + "?" + query, revision, decode,
  );
  useEffect(() => {
    if (!inlineVisit) return;
    const close = () => {
      if (window.history.state?.hcaInlineMaterialVisit !== inlineVisit.key) setInlineVisit(null);
    };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [inlineVisit]);
  useEffect(() => {
    if (loading || !data || restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    if (contentRef.current) {
      contentRef.current.scrollTop = position.panelScroll;
      if (position.focusEntry) {
        contentRef.current.querySelector<HTMLElement>(`[data-material-history-entry="${CSS.escape(position.focusEntry)}"]`)
          ?.focus({ preventScroll: true });
      }
    }
  }, [loading, data, position.panelScroll, position.focusEntry]);
  useEffect(() => {
    if (linked || loading || !linkedReturnFocusRef.current) return;
    const frame = requestAnimationFrame(() => {
      const previous = linkedTriggerRef.current;
      const id = CSS.escape(linkedReturnFocusRef.current ?? "");
      const next = previous?.isConnected ? previous
        : contentRef.current?.querySelector<HTMLButtonElement>(`[data-material-reference="${id}"]`)
          ?? contentRef.current?.parentElement?.querySelector<HTMLButtonElement>('[data-material-section][aria-selected="true"]');
      linkedReturnFocusRef.current = null;
      if (contentRef.current) contentRef.current.scrollTop = position.panelScroll;
      next?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [linked, loading, position.panelScroll]);
  function select(next: MaterialPanelSection, nextPage = 1) {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    onPosition({ ...position, section: next, page: nextPage, panelScroll: 0 });
  }
  function link(record: LinkedMaterialDocument, detail?: ReactNode, timeline = false) {
    if (record.id === documentId) return null;
    return <button className={timeline ? "hca-material-history-reference" : "hca-material-link"} type="button"
      aria-label={record.code ?? record.type} data-material-reference={record.id} onClick={event => {
      linkedTriggerRef.current = event.currentTarget;
      onPosition({ ...position, linked: record, panelScroll: contentRef.current?.scrollTop ?? 0 });
    }}>
      {timeline ? <><Icon name="link" width={13} height={13} />{record.code ?? record.type}</>
        : <><Icon name="file" /><span><strong>{record.code ?? record.type}</strong>{detail ? <small>{detail}</small> : null}</span><Icon name="chevron" /></>}
    </button>;
  }
  function closeLinked() {
    linkedReturnFocusRef.current = linked?.id ?? null;
    onPosition({ ...position, linked: null });
  }
  function closeVisit() {
    if (inlineVisit?.key && window.history.state?.hcaInlineMaterialVisit === inlineVisit.key) window.history.back();
    else setInlineVisit(null);
  }
  function visit(href: string, target: MaterialVisitTarget, event: { preventDefault: () => void }, focusEntry?: string) {
    if (visitContext) {
      event.preventDefault();
      const opener = inlineOpenerRef.current;
      let key: string | null = null;
      try {
        const token = crypto.randomUUID();
        window.history.pushState({ ...window.history.state, hcaInlineMaterialVisit: token }, "");
        key = token;
      } catch {
        // The explicit return still closes the consultation when history is unavailable.
      }
      setInlineVisit({ target, opener, key });
      return;
    }
    onNavigate?.({ ...position, focusEntry, panelScroll: contentRef.current?.scrollTop ?? position.panelScroll });
    const token = prepareMaterialVisit(target.reference.id, patientId);
    if (!token) return;
    event.preventDefault();
    const url = new URL(href, window.location.origin);
    url.searchParams.set(materialVisitParam, token);
    router.push(url.pathname + url.search);
  }
  const displayQuantity = (value: string | null) => value === null ? "Não disponível nesta consulta" : formatQuantity(value, row.unit ?? undefined);
  const inlineSurface = inlineVisit && visitContext ? <Suspense fallback={<PageLoadingActivity title="Abrindo ficha completa" />}>
    <MaterialFullVisit context={visitContext} target={inlineVisit.target} onClose={closeVisit}
      finalFocus={() => inlineVisit.opener?.isConnected ? inlineVisit.opener : false} />
  </Suspense> : null;
  return <Tabs.Root value={section} onValueChange={value => {
    if (materialPanelSections.some(item => item === value)) select(value as MaterialPanelSection);
  }}>
    <Drawer open title={row.name} kicker="Consulta de material" subtitle={row.unit ? "Unidade padrão · " + row.unit : undefined}
      popupClassName="hca-material-sheet" keyboardScrollable contentRef={contentRef} finalFocus={finalFocus} onClose={onClose}
      navigation={<Tabs.List aria-label="Consulta do material" className="hca-material-sheet-tabs">
        {materialPanelSections.map(item => <Tabs.Tab value={item} key={item} data-material-section>{labels[item]}</Tabs.Tab>)}
      </Tabs.List>}
      footer={<ActionButton onClick={onClose}><Icon name="back" />{closeText}</ActionButton>}>
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
          {row.detail || row.related?.length ? <section><h3>{detailTitle}</h3>
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
        </> : data?.section === "history" ? <DocumentMaterialHistory rows={data.rows} movementsAvailable={data.available}
          unit={row.unit} reference={record => {
            if (record.document) return link(record.document, undefined, true);
            if (!record.arrival) return null;
            const { id, code } = record.arrival;
            const path = `/estoque?arrival=${id}`;
            return <Link href={path} className="hca-material-history-reference" data-material-history-entry={record.id}
              onClick={event => { inlineOpenerRef.current = event.currentTarget; }}
              onNavigate={event => visit(path, { kind: "arrival", reference: { id, code } }, event, record.id)}>
              <Icon name="link" width={13} height={13} />{code}
            </Link>;
          }} /> : data?.section === "links" ? <section>
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
          <Link href={`/fichas/${linked.id}`} className="ui-button ui-button-primary"
            onClick={event => { inlineOpenerRef.current = event.currentTarget; }}
            onNavigate={event => visit(`/fichas/${linked.id}`, { kind: "document", reference: linked }, event)}>
            <Icon name="external" />Abrir {linked.code ?? "ficha"}
          </Link>
        </>}>
        <RelatedDocumentBody id={linked.id} type={linked.type} onClose={closeLinked} />
        {inlineSurface}
      </Drawer> : null}
      {!linked ? inlineSurface : null}
    </Drawer>
  </Tabs.Root>;
}
