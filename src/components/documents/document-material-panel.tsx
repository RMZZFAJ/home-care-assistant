"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, use, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { ActionButton, LoadingIndicator, Pill, TextInput } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { PageLoadingActivity } from "@/components/ui/operation-activity";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { useScopedRead } from "@/lib/use-scoped-read";
import { documentMaterialPanel, materialLinkKinds, materialPanelSections, type MaterialLinkFilters } from "@/lib/validation/document-material-context";
import { documentStatusLabel } from "@/lib/documents/presentation";
import { materialVisitParam, prepareMaterialVisit } from "@/lib/documents/material-visit";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { formatStockObservation, formatStockObservationTime, newestStockObservationsFirst } from "@/lib/stock-observation";
import type { DocumentKind, DocumentType } from "@/types/documents";
import type { WorkspaceContext } from "@/types/workspace";
import type { DocumentMaterialRow } from "./document-material-list";
import { RelatedDocumentBody, relatedDocumentLabel } from "./related-document";
import { DocumentMaterialHistory } from "./document-material-history";
import { MaterialStockHistory } from "./material-stock-history";
import { MaterialVisitContext } from "./material-visit-context";
import type { MaterialVisitTarget } from "./material-full-visit";

const MaterialFullVisit = lazy(() => import("./material-full-visit").then(module => ({ default: module.MaterialFullVisit })));

export type LinkedMaterialDocument = { id: string; code: string | null; type: DocumentType; kind?: DocumentKind };
export const documentMaterialSections = ["document", ...materialPanelSections] as const;
type PanelSection = typeof documentMaterialSections[number];
export type MaterialPanelPosition = {
  lineId: string;
  section: PanelSection;
  page: number;
  panelScroll: number;
  focusEntry?: string;
  linkFilters?: MaterialLinkFilters;
  linkSearchOpen?: boolean;
  movementPage?: number;
  expandedMovements?: string[];
  linked: LinkedMaterialDocument | null;
};
const labels = { document: "Nesta ficha", stock: "Estoque", history: "Histórico", links: "Fichas" };
const linkedIcons = { REQ: "note", COM: "box", ENT: "truck", DEV: "truck", BAL: "stock" } as const;
const allLinkFilters: MaterialLinkFilters = { kind: null, search: "" };
const closedRequisitionStatuses = new Set(["cancelled", "completed", "delivered", "historical"]);

export function DocumentMaterialPanel({
  row, documentId, documentCode, patientId, revision, position, onPosition, onNavigate, finalFocus, onClose, inlineContext,
  closeText = "Voltar à ficha", detailTitle = "Material nesta ficha",
}: {
  row: Pick<DocumentMaterialRow, "id" | "productId" | "name" | "unit" | "detail" | "related">;
  documentId?: string;
  documentCode?: string | null;
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
  const { kind: linkKind, search: linkSearch } = position.linkFilters ?? allLinkFilters;
  const [linkText, setLinkText] = useState(linkSearch);
  const contextual = Boolean(documentId);
  const sections: readonly PanelSection[] = contextual ? documentMaterialSections : materialPanelSections;
  const router = useRouter();
  const inheritedContext = use(MaterialVisitContext);
  const visitContext = inlineContext ?? inheritedContext;
  const workspacePatient = useWorkspaceState().value?.patient;
  const patient = visitContext?.patient ?? workspacePatient;
  const linkDescriptionId = useId();
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
    if (data.section === "links" && (!data.filters || data.filters.kind !== linkKind || data.filters.search !== linkSearch))
      throw new Error("Os resultados pertencem a outra busca de fichas.");
    if (data.section === "history" && data.rows.some(row => row.kind !== "decision"))
      throw new Error("Não foi possível identificar as decisões desta consulta.");
    return data;
  }, [documentId, patientId, row.id, section, page, linkKind, linkSearch]);
  const query = new URLSearchParams({ section, page: String(page) });
  if (documentId) query.set("line", row.id);
  else { query.set("productId", row.id); query.set("careRecipientId", patientId); }
  if (section === "links") {
    if (linkKind) query.set("kind", linkKind);
    if (linkSearch) query.set("search", linkSearch);
  }
  if (section === "history") query.set("view", "decisions");
  const endpoint = documentId ? `/api/documents/${documentId}/materials` : "/api/catalog/material";
  const { loading, data, error, refresh } = useScopedRead(
    section === "document" ? null : endpoint + "?" + query, revision, decode,
  );
  const productId = documentId ? row.productId ?? data?.productId ?? null : row.id;
  useEffect(() => {
    if (!inlineVisit) return;
    const close = () => {
      if (window.history.state?.hcaInlineMaterialVisit !== inlineVisit.key) setInlineVisit(null);
    };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [inlineVisit]);
  const restorePanel = useCallback(() => {
    if (restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    if (contentRef.current) {
      contentRef.current.scrollTop = position.panelScroll;
      if (position.focusEntry) {
        contentRef.current.querySelector<HTMLElement>(`[data-material-history-entry="${CSS.escape(position.focusEntry)}"]`)
          ?.focus({ preventScroll: true });
      }
    }
  }, [position.panelScroll, position.focusEntry]);
  useEffect(() => {
    if (loading || section !== "document" && !data) return;
    if (data?.section === "history" && data.available && data.productId) return;
    restorePanel();
  }, [loading, data, section, restorePanel]);
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
  function select(next: PanelSection, nextPage = 1) {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    onPosition({ ...position, section: next, page: nextPage, panelScroll: 0 });
  }
  function filterLinks(filters: MaterialLinkFilters) {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    onPosition({ ...position, linkFilters: filters, page: 1, panelScroll: 0 });
  }
  function link(record: LinkedMaterialDocument, detail?: ReactNode, options: { timeline?: boolean; status?: string; archived?: boolean; attention?: boolean } = {}) {
    if (record.id === documentId) return null;
    const kind = record.kind ?? record.type;
    const { timeline, status, archived, attention } = options;
    const statusId = status ? `${linkDescriptionId}-${record.id}` : undefined;
    const detailId = statusId && detail ? statusId + "-detail" : undefined;
    return <button className={timeline ? "hca-material-history-reference" : "hca-material-link"} type="button"
      aria-label={record.code ?? kind} aria-describedby={statusId ? [detailId, statusId].filter(Boolean).join(" ") : undefined}
      data-material-reference={record.id} onClick={event => {
      linkedTriggerRef.current = event.currentTarget;
      onPosition({ ...position, linked: record, panelScroll: contentRef.current?.scrollTop ?? 0 });
    }}>
      {timeline ? <><Icon name="link" width={13} height={13} />{record.code ?? kind}</>
        : <><span className="hca-material-link-icon"><Icon name={archived ? "archive" : linkedIcons[kind]} width={16} height={16} /></span>
          <span className="hca-material-link-copy"><strong>{record.code ?? kind}</strong>{detail ? <small id={detailId}>{detail}</small> : null}</span>
          {status ? <Pill id={statusId} tone={attention ? "warning" : "neutral"}>{status}</Pill> : <Icon name="chevron" width={16} height={16} />}</>}
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
    const token = prepareMaterialVisit(target.reference.id, patientId, target.kind === "document" ? target.productId : null);
    if (!token) return;
    event.preventDefault();
    const url = new URL(href, window.location.origin);
    url.searchParams.set(materialVisitParam, token);
    if (target.kind === "document") url.searchParams.set("documentTab", "materials");
    router.push(url.pathname + url.search);
  }
  const displayQuantity = (value: string | null) => value === null ? "Não disponível nesta consulta" : formatQuantity(value, row.unit ?? undefined);
  const observations = data?.section === "stock"
    ? newestStockObservationsFirst(data.observations.filter(observation => observation.documentId !== documentId)) : [];
  const latestObservation = observations.find(observation => observation.observation === "observed" && observation.quantity !== null);
  const links = data?.section === "links" ? data.rows.filter(item => item.id !== documentId) : [];
  const linkGroups = [
    { label: "Requisições em acompanhamento", rows: links.filter(item => item.kind === "REQ" && !item.archived && !closedRequisitionStatuses.has(item.status)) },
    { label: "Outras requisições", rows: links.filter(item => item.kind === "REQ" && !item.archived && closedRequisitionStatuses.has(item.status)) },
    { label: "Histórico arquivado", rows: links.filter(item => item.archived) },
    { label: "Aquisição e movimentação", rows: links.filter(item => item.kind !== "REQ" && !item.archived) },
  ];
  const inlineSurface = inlineVisit && visitContext ? <Suspense fallback={<PageLoadingActivity title="Abrindo ficha completa" />}>
    <MaterialFullVisit context={visitContext} target={inlineVisit.target} onClose={closeVisit}
      finalFocus={() => inlineVisit.opener?.isConnected ? inlineVisit.opener : false} />
  </Suspense> : null;
  const contextFacts = <section>
    <h3>{detailTitle}</h3>
    {documentCode ? <p><Icon name="file" width={17} height={17} /> <strong>{documentCode}</strong></p> : null}
    {row.detail}
    {row.related?.length ? <div className="hca-material-linked-list">{row.related.map(item =>
      <div key={item.document.id}>{link(item.document, item.detail)}</div>
    )}</div> : null}
    {!row.detail && !row.related?.length ? <p>Não há dados adicionais para este material.</p> : null}
  </section>;
  return <Tabs.Root value={section} onValueChange={value => {
    const next = sections.find(item => item === value);
    if (next) select(next);
  }}>
    <Drawer open title={row.name} kicker="Consulta de material" subtitle={row.unit ? "Unidade padrão · " + row.unit : undefined}
      popupClassName="hca-material-sheet" keyboardScrollable contentRef={contentRef} finalFocus={finalFocus} onClose={onClose}
      navigation={<Tabs.List aria-label="Consulta do material" className="hca-material-sheet-tabs">
        {sections.map(item => <Tabs.Tab value={item} key={item} data-material-section
          aria-label={item === "document" && documentCode ? `${labels.document} · ${documentCode}` : undefined}>
          {item === "document" && documentCode ? documentCode : labels[item]}
        </Tabs.Tab>)}
      </Tabs.List>}
      footer={<ActionButton onClick={onClose}><Icon name="back" />{closeText}</ActionButton>}>
      <Tabs.Panel value={section} className="hca-material-sheet-body">
        {section === "links" ? <>
          <nav aria-label="Tipos de ficha relacionada" className="hca-document-file-nav">
            {[null, ...materialLinkKinds].map(kind => <button key={kind ?? "all"} type="button"
              aria-pressed={linkKind === kind} onClick={() => filterLinks({ kind, search: linkSearch })}>{kind ?? "Todas"}</button>)}
          </nav>
          <ActionButton variant="quiet" aria-expanded={Boolean(position.linkSearchOpen)}
            onClick={() => onPosition({ ...position, linkSearchOpen: !position.linkSearchOpen })}>
            <Icon name="search" />Buscar fichas vinculadas
          </ActionButton>
          {position.linkSearchOpen ? <form className="hca-toolbar" role="search" aria-label="Busca de fichas vinculadas"
            onSubmit={event => { event.preventDefault(); event.stopPropagation(); filterLinks({ kind: linkKind, search: linkText.trim().toLowerCase() }); }}>
            <TextInput type="search" aria-label="Número da ficha" placeholder="Número da ficha" maxLength={160}
              value={linkText} onChange={event => setLinkText(event.currentTarget.value)} />
            <ActionButton type="submit">Buscar</ActionButton>
            {linkSearch ? <ActionButton onClick={() => { setLinkText(""); filterLinks({ kind: linkKind, search: "" }); }}>Limpar</ActionButton> : null}
          </form> : null}
        </> : null}
        {section === "document" ? contextFacts : loading ? <LoadingIndicator label="Consultando material" /> : error ? <div role="alert" className="hca-v7-material-read-error">
          <p>{error}</p><ActionButton onClick={refresh}>Tentar novamente</ActionButton>
        </div> : data?.section === "stock" ? <>
          <section><h3>Estoque atual</h3><dl className="hca-material-balance-grid">
            <div><dt>Família · disponível</dt><dd>{displayQuantity(data.family)}</dd>
              {data.family !== null ? <dd className="hca-material-balance-note">Entradas aprovadas e movimentos confirmados</dd> : null}</div>
            <div><dt>Equipe · disponível</dt><dd>{displayQuantity(data.team)}</dd>
              {data.team !== null ? <dd className="hca-material-balance-note">Contagens e recebimentos confirmados</dd> : null}</div>
          </dl></section>
          {!contextual && (row.detail || row.related?.length) ? contextFacts : null}
          <section><h3>Estoque informado nas requisições</h3>
            {observations.length ? <><div className="hca-material-linked-list">{observations.map(observation => <article key={observation.documentId}>
              {link({ id: observation.documentId, code: observation.code, type: "REQ" }, formatBrazilDate(observation.createdAt))}
              <strong>{formatStockObservation(observation.quantity, observation.observation ?? undefined, observation.unit ?? undefined)}</strong>
              <small>{formatStockObservationTime(observation.observedAt, observation.timeSource ?? "legacy_unknown")}</small>
              {observation.observation === "observed" && observation.quantity !== null
                ? <Pill tone={observation === latestObservation ? "success" : "neutral"}>
                  {observation === latestObservation ? "Mais recente" : "Contagem anterior"}
                </Pill> : null}
            </article>)}</div><p className="hca-material-observation-note">
              Cada quantidade foi registrada na requisição correspondente. Os valores ficam preservados separadamente do saldo atual.
            </p></> : <p>{data.observations.length ? "Nenhuma contagem de outra requisição disponível para este material." : "Nenhuma contagem de requisição disponível para este material."}</p>}
          </section>
        </> : data?.section === "history" ? <DocumentMaterialHistory rows={data.rows.filter(row => row.kind === "decision")} movementsAvailable={data.available}
          movements={data.available && data.productId ? <MaterialStockHistory
            patientId={patientId} productId={data.productId} revision={revision} page={position.movementPage ?? 1}
            onPage={movementPage => onPosition({ ...position, movementPage })}
            expanded={position.expandedMovements ?? []} onRead={restorePanel}
            onToggle={(id, open) => {
              const expanded = position.expandedMovements ?? [];
              if (expanded.includes(id) !== open) onPosition({
                ...position, expandedMovements: open ? [...expanded, id].slice(-100) : expanded.filter(item => item !== id),
              });
            }}
            renderDocumentLink={(movement, operation) => {
              const kind = materialLinkKinds.find(value => value === operation.origin);
              return movement.reference_document_id && kind ? link({
                id: movement.reference_document_id, code: operation.documentCode,
                type: kind === "DEV" ? "ENT" : kind, kind,
              }, undefined, { timeline: true }) : null;
            }} /> : null}
          unit={row.unit} reference={record => {
            if (record.document) return link(record.document, undefined, { timeline: true });
            if (!record.arrival) return null;
            const { id, code } = record.arrival;
            const path = `/estoque?arrival=${id}`;
            return <Link href={path} className="hca-material-history-reference" data-material-history-entry={record.id}
              onClick={event => { inlineOpenerRef.current = event.currentTarget; }}
              onNavigate={event => visit(path, { kind: "arrival", reference: { id, code } }, event, record.id)}>
              <Icon name="link" width={13} height={13} />{code}
            </Link>;
        }} /> : data?.section === "links" ? links.length ? linkGroups.map(group => group.rows.length ? <section key={group.label} aria-label={group.label} className="hca-material-link-group">
          <h3>{group.label}</h3>
          <div className="hca-material-linked-list">{group.rows.map(item => <div key={item.id}>
            {link(item, `${relatedDocumentLabel(item.kind)} · ${formatBrazilDate(item.createdAt)}`,
              { status: item.archived ? "Arquivada" : documentStatusLabel(item.status), archived: item.archived,
                attention: !item.archived && ["fulfillment_partial", "partially_received", "disputed"].includes(item.status) })}
          </div>)}</div>
        </section> : null) : <section><h3>Fichas relacionadas</h3>
          <p>{linkKind || linkSearch ? "Nenhuma ficha corresponde aos filtros." : "Nenhuma ficha relacionada disponível neste vínculo."}</p>
        </section> : null}
        {data && data.section !== "stock" && (data.total > 20 || page > 1) ? <div className="hca-material-pagination">
          <ActionButton disabled={page === 1} onClick={() => select(section, page - 1)}>Anterior</ActionButton>
          <span>Página {page} de {Math.max(1, Math.ceil(data.total / 20))}</span>
          <ActionButton disabled={data.total <= page * 20} onClick={() => select(section, page + 1)}>Próxima</ActionButton>
        </div> : null}
      </Tabs.Panel>
      {linked ? <Drawer open title={linked.code ?? linked.kind ?? linked.type} kicker="Ficha relacionada" keyboardScrollable
        subtitle={[relatedDocumentLabel(linked.kind ?? linked.type), patient?.id === patientId ? patient.display_name : null].filter(Boolean).join(" · ")}
        popupClassName="hca-material-sheet" onClose={closeLinked}
        footer={<>
          <ActionButton onClick={closeLinked}><Icon name="back" />Voltar ao material</ActionButton>
          <Link href={`/fichas/${linked.id}`} className="ui-button ui-button-primary"
            onClick={event => { inlineOpenerRef.current = event.currentTarget; }}
            onNavigate={event => visit(`/fichas/${linked.id}`, { kind: "document", reference: linked, productId }, event)}>
            <Icon name="external" />Abrir {linked.code ?? "ficha"}
          </Link>
        </>}>
        <RelatedDocumentBody id={linked.id} type={linked.type} patientId={patientId} title={linked.code ?? undefined} onClose={closeLinked} />
        {inlineSurface}
      </Drawer> : null}
      {!linked ? inlineSurface : null}
    </Drawer>
  </Tabs.Root>;
}
