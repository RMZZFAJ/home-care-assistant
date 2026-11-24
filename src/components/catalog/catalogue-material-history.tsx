"use client";

import { useState, type RefObject } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, Pill } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { EmptyState } from "@/components/ui/primitives";
import { SearchSelect } from "@/components/ui/search-select";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { formatQuantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { CatalogueCollectionItem } from "@/lib/validation/catalogue-list";
import { catalogueMaterialHistory, type CatalogueMaterialEvent } from "@/lib/validation/catalogue-material-history";

const days = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });
const shortDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
const times = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const categories: Record<string, string> = { higiene: "Higiene", medicamentos: "Medicamentos", dieta: "Dieta" };
const identityTitles = { retire: "Material inativado", reactivate: "Material reativado", clear_successor: "Indicação de sucessor removida" };
const eventIcons = { registration: "edit", identity: "history", presentation: "scan" } as const satisfies Record<CatalogueMaterialEvent["kind"], IconName>;

function eventTitle(event: CatalogueMaterialEvent) {
  switch (event.kind) {
    case "registration": return event.before ? "Cadastro do material atualizado" : "Material cadastrado";
    case "identity": return identityTitles[event.action];
    case "presentation": return event.before ? "Apresentação atualizada" : "Apresentação cadastrada";
  }
}

function status(active: boolean) {
  return active ? "Ativo" : "Inativo";
}

function groupedEvents(events: CatalogueMaterialEvent[]) {
  const groups = new Map<string, CatalogueMaterialEvent[]>();
  for (const event of events) {
    const day = days.format(new Date(event.recordedAt));
    const group = groups.get(day);
    if (group) group.push(event); else groups.set(day, [event]);
  }
  return [...groups];
}

export function MaterialHistoryDrawer({ patientId, productId, products, opener, fallback, onClose }: {
  patientId: string; productId: string | null; products: CatalogueCollectionItem[]; opener: HTMLElement;
  fallback: RefObject<HTMLElement | null>; onClose: () => void;
}) {
  const [selection, setSelection] = useState(productId);
  const [query, setQuery] = useState("");
  const term = normalizeCatalogText(query);
  return <RecordDrawer title={productId ? "Histórico do material" : "Histórico de alterações"}
    subtitle="Alterações confirmadas no cadastro desta residência."
    kicker="Organização da residência" headingIcon="history" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
    trackChanges={false} keyboardScrollable restoreFocusTo={opener} restoreFocusFallbackRef={fallback}
    onClose={onClose} footer={close => <ActionButton onClick={close}>{productId ? "Voltar ao material" : "Voltar ao catálogo"}</ActionButton>}>
    <div className="hca-form-stack">
      {!productId ? <FormField label="Material para consultar">
        <SearchSelect query={query || products.find(row => row.id === selection)?.name || ""}
          placeholder="Buscar nome ou nome alternativo" selectedIds={selection ? [selection] : []}
          onQueryChange={value => { setSelection(null); setQuery(value); }}
          onSelectionChange={ids => { setSelection(ids[0] ?? null); setQuery(""); }}
          options={products.filter(row => normalizeCatalogText([row.name, ...row.aliases].join(" ")).includes(term))
            .map(row => ({ value: row.id, label: row.name, content: row.name + " · " + row.unit }))} />
      </FormField> : null}
      {selection ? <MaterialHistory key={selection} patientId={patientId} productId={selection} />
        : <EmptyState title="Escolha um material">Selecione um cadastro para ver as alterações registradas.</EmptyState>}
    </div>
  </RecordDrawer>;
}

function MaterialHistory({ patientId, productId }: { patientId: string; productId: string }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [dismissedRevision, setDismissedRevision] = useState(0);
  const [dismissedError, setDismissedError] = useState<unknown>(null);
  const [attempts, setAttempts] = useState(0);
  const [detail, setDetail] = useState<{ event: CatalogueMaterialEvent; opener: HTMLElement } | null>(null);
  const params = new URLSearchParams({ careRecipientId: patientId, productId, page: String(page) });
  const read = useScopedRead("/api/catalog/history?" + params, String(revision), catalogueMaterialHistory.parse);
  const retained = read.data;
  const data = retained && retained.patientId === patientId && retained.material.id === productId && retained.page === page ? retained : null;
  const blocked = read.errorStatus !== undefined && [401, 403, 404].includes(read.errorStatus);
  const canRetry = !blocked && attempts < operationRecoveryLimit;
  const refresh = () => setRevision(value => value + 1);
  const retry = () => { setAttempts(value => value + 1); refresh(); };
  const dismissError = () => { setDismissedError(read.errorCause); setDismissedRevision(revision); };
  const movePage = (next: number) => { setPage(next); setAttempts(0); };
  const updated = revision > dismissedRevision && data && !read.loading && !read.error;
  const material = data?.material;
  const today = read.queriedAt ? new Date(read.queriedAt) : null;

  return <>
    {material ? <div className="hca-residence-admin-hero">
      <span className="hca-guide-row-icon"><Icon name="box" /></span>
      <div className="hca-guide-row-label"><strong>{material.name}</strong><small>{categories[material.category] ?? material.category} · {material.unit}</small></div>
      <div className="grid shrink-0 justify-items-end gap-2">
        <Pill tone={material.active ? "success" : "neutral"}>{status(material.active)}</Pill>
        {!read.error ? <ActionButton compact variant="quiet" aria-label="Atualizar histórico" title="Atualizar histórico" disabled={read.loading}
          onClick={() => { setAttempts(0); refresh(); }}><Icon name="refresh" /></ActionButton> : null}
      </div>
    </div> : null}
    {read.loading ? <LoadingIndicator label="Consultando histórico do material" /> : null}
    {read.error ? <FeedbackBanner tone="error">{data ? "Última consulta preservada. A atualização ficou pendente." : "O histórico está indisponível."}
      <ActionButton variant="quiet" disabled={read.loading} onClick={() => setDismissedError(null)}>Ver detalhes da consulta</ActionButton>
    </FeedbackBanner> : null}
    {data?.data.length ? groupedEvents(data.data).map(([day, events]) => <section key={day} className="hca-residence-admin-section hca-residence-rules">
      <header><h3>{today && day === days.format(today) ? "Hoje · " + shortDay.format(today) : day}</h3></header>
      <div>{events.map(event => <button type="button" key={event.reference} className="hca-guide-row hca-catalogue-row"
        onClick={click => setDetail({ event, opener: click.currentTarget })}>
        <span className="hca-guide-row-icon"><Icon name={eventIcons[event.kind]} /></span>
        <span className="hca-guide-row-label"><strong>{eventTitle(event)}</strong>
          <small>{event.kind === "presentation" ? event.after.name + " · " : ""}{event.actorName ?? "Autoria indisponível"} · {times.format(new Date(event.recordedAt))}</small>
        </span>
        <Icon name="chevron" width={15} height={15} />
      </button>)}</div>
    </section>) : data && !read.loading && !read.error ? <EmptyState title="Nenhuma alteração registrada para este material" /> : null}
    {data && (page > 1 || data.hasMore) ? <nav aria-label="Páginas do histórico do material" className="hca-pagination">
      <ActionButton disabled={page <= 1 || read.loading} onClick={() => movePage(page - 1)}>Mais recentes</ActionButton>
      <span>Página {page}</span>
      <ActionButton disabled={!data.hasMore || read.loading} onClick={() => movePage(page + 1)}>Mais antigas</ActionButton>
    </nav> : null}
    <p className="hca-residence-admin-note"><Icon name="history" width={16} height={16} />O histórico conserva o conteúdo de cada alteração. Os movimentos ficam no acompanhamento de estoque.</p>
    {detail && material ? <MaterialHistoryDetail event={detail.event} materialName={material.name}
      opener={detail.opener} onClose={() => setDetail(null)} /> : null}
    {read.error && !read.loading && read.errorCause !== dismissedError ? <DocumentOperationFailureDialog
      title="Não foi possível consultar o histórico" description="O histórico não foi atualizado. Esta consulta preserva o cadastro do material."
      outcome="rejected" cause={read.errorCause} operation="Consultar histórico do material" fallbackCode="L4-CATALOGO-HISTORICO"
      attempts={attempts} closeLabel="Voltar" onClose={dismissError}
      action={canRetry ? { label: "Consultar novamente", onClick: retry } : undefined}
      exhaustedMessage={!blocked && !canRetry ? "Copie os detalhes e avise o responsável pelo sistema." : undefined} /> : null}
    {updated ? <Dialog open title="Histórico atualizado" success subtitle="As alterações confirmadas estão disponíveis para consulta."
      onClose={() => setDismissedRevision(revision)}
      footer={<ActionButton variant="primary" onClick={() => setDismissedRevision(revision)}>Concluir</ActionButton>}>{null}</Dialog> : null}
  </>;
}

type Change = { label: string; before?: string; after: string };
const textValue = (value: string | null) => value || "—";

function changes(event: CatalogueMaterialEvent): Change[] {
  if (event.kind === "identity") return [
    { label: "Situação do material", before: status(event.before.active), after: status(event.after.active) },
    { label: "Sucessor", before: textValue(event.before.successorId), after: textValue(event.after.successorId) },
  ];
  if (event.kind === "presentation") {
    const factor = (value: typeof event.after) => validQuantity(value.quantity, 6)
      ? "1 embalagem = " + formatQuantity(value.quantity, value.unit) : value.quantity + " " + value.unit;
    const { before, after } = event;
    return [
      { label: "Equivalência da embalagem", before: before ? factor(before) : undefined, after: factor(after) },
      { label: "Apresentação", before: before?.name, after: after.name },
      { label: "Código de barras", before: before?.code, after: after.code },
      { label: "Disponibilidade", before: before ? (before.active ? "Ativa" : "Inativa") : undefined, after: after.active ? "Ativa" : "Inativa" },
    ].filter(change => change.before !== change.after);
  }
  const { before, after } = event;
  return [
    { label: "Nome", before: before?.name, after: after.name },
    { label: "Tipo", before: before ? categories[before.category] ?? before.category : undefined, after: categories[after.category] ?? after.category },
    { label: "Unidade base", before: before?.unit, after: after.unit },
    { label: "Precisão", before: before?.decimals.toString(), after: after.decimals.toString() },
    { label: "Nomes alternativos", before: before ? textValue(before.aliases.join(", ")) : undefined, after: textValue(after.aliases.join(", ")) },
    { label: "Descrição operacional", before: before ? textValue(before.description) : undefined, after: textValue(after.description) },
    { label: "Ordem", before: before?.order.toString(), after: after.order.toString() },
  ].filter(change => change.before !== change.after);
}

function MaterialHistoryDetail({ event, materialName, opener, onClose }: {
  event: CatalogueMaterialEvent; materialName: string; opener: HTMLElement; onClose: () => void;
}) {
  const [copyResult, setCopyResult] = useState("");
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(event.reference);
      setCopyResult("Referência copiada.");
    } catch {
      setCopyResult("Selecione a referência exibida para copiar.");
    }
  }
  return <RecordDrawer title={eventTitle(event)} subtitle="Histórico do material" headingIcon={eventIcons[event.kind]}
    kicker="Organização da residência" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
    trackChanges={false} keyboardScrollable restoreFocusTo={opener} onClose={onClose}
    footer={close => <ActionButton onClick={close}>Voltar</ActionButton>}>
    <div className="hca-form-stack">
      <DefinitionGrid items={[
        { label: "Material", value: materialName },
        { label: "Responsável", value: event.actorName ?? "Autoria indisponível" },
        { label: "Quando", value: formatBrazilDate(event.recordedAt) },
        ...(event.kind === "identity" ? [{ label: "Motivo", value: event.reason, wide: true }]
          : event.kind === "presentation" ? [{ label: "Versão da apresentação", value: event.version }] : []),
      ]} />
      {changes(event).map(change => <section key={change.label} className="hca-residence-admin-section">
        <header><h3>{change.label}</h3></header>
        <div><DefinitionGrid items={[
          ...(change.before === undefined ? [] : [{ label: "Antes", value: change.before }]),
          { label: change.before === undefined ? "Registrado" : "Depois", value: change.after },
        ]} /></div>
      </section>)}
      <section className="hca-residence-admin-section">
        <header><h3>Registro da alteração</h3></header>
        <div className="hca-form-stack">
          <DefinitionGrid items={[{ label: "Referência", value: event.reference, wide: true }]} />
          <ActionButton compact className="justify-self-start" onClick={() => void copyReference()}><Icon name="copy" />Copiar referência</ActionButton>
          {copyResult ? <p role="status" className="hca-field-hint">{copyResult}</p> : null}
        </div>
      </section>
    </div>
  </RecordDrawer>;
}
