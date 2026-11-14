"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import {
  buttonClass,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { EmptyState, Icon, StatusBadge } from "@/components/ui/primitives";
import { documentLabels } from "@/types/documents";
import { historyFilterPresentation, historyStatusLabels } from "@/lib/documents/presentation";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseDocumentListRead } from "@/lib/validation/document-list";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { RequisitionScienceBadge } from "@/components/requisitions/requisition-science-badge";

export type { DocumentSummary } from "@/types/documents";
import type { DocumentSummary } from "@/types/documents";
type Filters = {
  search: string;
  type: string;
  status: string;
  from: string;
  to: string;
};
const empty: Filters = { search: "", type: "", status: "", from: "", to: "" };
const historyFilters = historyStatusLabels;
export function DocumentRow({ row }: { row: DocumentSummary; }) {
  const { value: context } = useWorkspaceState();
  const pathname = usePathname(), params = useSearchParams();
  const returnTo = pathname === "/historico" ? "?returnTo=" + encodeURIComponent(pathname + (params.size ? "?" + params.toString() : "")) : "";
  return (
    <Link
      className="av-record"
      href={"/documentos/" + row.id + returnTo}
      prefetch={false}
    >
      <span className={`av-record-kind kind-${(row.kind ?? row.type).toLowerCase()}`}><Icon name={row.type === "ENT" ? "truck" : row.type === "COM" ? "box" : row.type === "BAL" ? "note" : "file"} width={18} height={18} /><small>{row.kind ?? row.type}</small></span>
      <span className="av-record-main">
        <strong>{row.code ?? (row.status === "draft" ? "Rascunho" : "Registro sem expedição")}</strong>
        <span className="av-record-title">{row.kind === "DEV" ? "Devolução de materiais" : documentLabels[row.type]}</span>
        <span className="av-record-meta">{formatBrazilDate(row.created_at)}{row.fulfillment ? <><span aria-hidden="true">·</span>{row.fulfillment.fulfilled} de {row.fulfillment.total} itens atendidos</> : row.type === "ENT" && row.document_lines ? <><span aria-hidden="true">·</span>{row.document_lines.filter(line => line.fully_checked).length} de {row.document_lines.length} itens conferidos</> : null}</span>
      </span>
      <span className="av-record-states">
        <StatusBadge status={row.requisitionState?.serviceStatus ?? row.status} />
        {row.requisitionState && ["family", "admin"].includes(context?.patient?.role ?? "") && !["archived", "cancelled"].includes(row.status) ? <RequisitionScienceBadge state={row.requisitionState.scienceState} /> : null}
        {row.task ? <span className="badge badge-neutral">{row.task.label}</span> : null}
      </span>
      <span className="av-record-arrow">
        <Icon name="chevron" width="15" height="15" />
      </span>
    </Link>
  );
}
export function DocumentHistory() {
  const params = useSearchParams();
  return (
    <Workspace title="Histórico de fichas">
      {(context) =>
        context.patient ? (
          <HistoryContent
            key={context.patient.id}
            context={context}
            initial={{
              ...empty,
              type: params.get("type") ?? "",
              status: params.get("status") ?? "",
              search: params.get("search") ?? "",
              from: params.get("from") ?? "",
              to: params.get("to") ?? "",
            }}
            initialPage={Math.max(1, Number(params.get("page")) || 1)}
          />
        ) : (
          <Notice>Selecione um paciente para consultar o histórico.</Notice>
        )
      }
    </Workspace>
  );
}
function HistoryContent({
  context,
  initial,
  initialPage,
}: {
  context: WorkspaceContext;
  initial: Filters;
  initialPage: number;
}) {
  const router = useRouter();
  const filters = initial;
  const [draft, setDraft] = useState(initial);
  const [showFilters, setShowFilters] = useState(
    Object.values(initial).some(Boolean),
  );
  const queryKey = JSON.stringify([initial, initialPage]);
  const [previousQuery, setPreviousQuery] = useState(queryKey);
  if (previousQuery !== queryKey) {
    // Back/forward restores the query without replacing the focused form.
    setPreviousQuery(queryKey);
    setDraft(initial);
  }
  const page = initialPage;
  const liveRevision = useLiveRevision();
  const patientId = context.patient!.id;
  const decode = useCallback((value: unknown) => parseDocumentListRead(value, {
    careRecipientId: patientId, page, pageSize: 20,
    search: filters.search, type: filters.type, status: filters.status, from: filters.from, to: filters.to,
  }), [patientId, page, filters.search, filters.type, filters.status, filters.from, filters.to]);
  const read = useScopedRead("/api/documents?" + new URLSearchParams({
    careRecipientId: patientId, page: String(page), pageSize: "20", ...filters,
  }), String(liveRevision), decode);
  const { loading, error } = read;
  useOperationActivity(loading, { title: "Consultando as fichas", detail: "Estamos buscando os registros autorizados deste paciente." });
  const [previousVisible, setPreviousVisible] = useState(false);
  const rows = read.data?.data ?? [], total = read.data?.total ?? 0;
  const navigate = (next: Filters, nextPage = 1) => {
    if (JSON.stringify(next) === JSON.stringify(filters) && nextPage === page) {
      read.refresh();
      return;
    }
    const query = new URLSearchParams({ careRecipientId: context.patient!.id });
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    if (nextPage > 1) query.set("page", String(nextPage));
    router.push("/historico?" + query, { scroll: false });
  };
  const setPage = (value: number) => navigate(filters, value);
  const setFilters = (value: Filters) => navigate(value);
  const active = Object.entries(filters).filter(([, value]) => value).map(([key, value]) => ({ key, ...historyFilterPresentation(key, value) }));
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowFilters(false);
    setPreviousVisible(false);
    setFilters({ ...draft });
  }
  const filterCount = active.filter(item => item.key !== "search").length;
  return <div className="history-v2">
    <section className="card history-search-card" aria-label="Busca e filtros do histórico"><form onSubmit={apply}>
      <div className="history-searchbar">
        <div className="search-control"><Icon name="search" width={18} height={18} /><input className="input" type="search" aria-label="Buscar por código ou protocolo" placeholder="Buscar por código ou protocolo" value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} /></div>
        <button className="btn btn-icon" type="submit" aria-label="Buscar"><Icon name="search" /></button>
        <button className="btn history-filter-toggle" type="button" onClick={() => setShowFilters(current => !current)} aria-expanded={showFilters} aria-controls="history-filters"><Icon name="sliders" />Filtros{filterCount ? <span className="badge badge-neutral">{filterCount}</span> : null}</button>
      </div>
      {showFilters ? <div id="history-filters" className="history-filter-fields"><div className="form-grid">
        <label className="field">Tipo de ficha<select className="input" aria-label="Tipo de ficha" value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}><option value="">Todas autorizadas</option>{context.patient?.capabilities?.["ent.read"] ? <option value="DEV">DEV · Devolução de materiais</option> : null}{Object.entries(documentLabels).filter(([type]) => context.patient?.capabilities?.[type.toLowerCase() + ".read"]).map(([type, label]) => <option key={type} value={type}>{type} · {label}</option>)}</select></label>
        <label className="field">Situação<select className="input" aria-label="Situação" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Todas</option>{Object.entries(historyFilters).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
        <label className="field">De<input className="input" type="date" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label>
        <label className="field">Até<input className="input" type="date" value={draft.to} min={draft.from} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label>
      </div><div className="filter-actions"><button className="btn btn-ghost" type="button" onClick={() => { setFilters(empty); setDraft(empty); setPreviousVisible(false); }}>Limpar filtros</button><button className="btn btn-primary" type="submit">Aplicar filtros</button></div></div> : null}
    </form>
    <p className="sr-only" role="status">{active.length ? "Filtros ativos: " + active.map(item => item.text).join(". ") + "." : "Nenhum filtro ativo."}</p>
    {active.length ? <div className="filter-chips" aria-label="Filtros ativos" role="group">{active.map(({ key, text, removeLabel }) => <button key={key} className="filter-chip" type="button" aria-label={removeLabel} onClick={() => { setFilters({ ...filters, [key]: "" }); setDraft({ ...draft, [key]: "" }); setPreviousVisible(false); }}>{text}<Icon name="close" width={12} height={12} /></button>)}</div> : null}</section>
    {error ? <Notice error>{error}{read.data && !previousVisible ? <button className={buttonClass} type="button" onClick={() => setPreviousVisible(true)}>Mostrar lista da última consulta</button> : null}<button className={buttonClass} type="button" onClick={read.refresh}>Tentar novamente</button></Notice> : null}
    {loading ? <Notice>Consultando documentos…</Notice> : null}
    <div className="history-result-meta"><p>{read.data ? total + " fichas de " + context.patient!.display_name : "Total ainda não confirmado."}</p>{read.queriedAt ? <span>{loading || error ? "Última consulta válida" : "Lista consultada"}: {formatBrazilDate(read.queriedAt)}.{loading || error ? " Os registros preservados podem estar desatualizados." : ""}</span> : null}</div>
    {read.data && !loading && (!error || previousVisible) ? <section className="card history-results">{error ? <p className="card-body" role="status">Lista anterior, consultada em {formatBrazilDate(read.queriedAt)}. A atualização não foi confirmada.</p> : null}<div className="av-record-list">{rows.length ? rows.map(row => <DocumentRow key={row.id} row={row} />) : !error ? <EmptyState title={active.length ? "Nenhuma ficha encontrada" : "Ainda não há fichas neste paciente"}>{active.length ? "Ajuste ou limpe os filtros para consultar novamente." : "As fichas emitidas neste contexto aparecerão aqui."}</EmptyState> : null}</div></section> : null}
    {read.data && total > 20 ? <nav className="compact-pagination history-pagination" aria-label="Páginas do histórico"><span>{total} fichas</span><div><button className="btn btn-icon" type="button" aria-label="Anterior" disabled={page <= 1 || loading || Boolean(error)} onClick={() => setPage(page - 1)}><Icon name="chevron" style={{ transform: "rotate(180deg)" }} /></button><span>{page} / {Math.ceil(total / 20)}</span><button className="btn btn-icon" type="button" aria-label="Próxima" disabled={page * 20 >= total || loading || Boolean(error)} onClick={() => setPage(page + 1)}><Icon name="chevron" /></button></div></nav> : null}
  </div>;
}
