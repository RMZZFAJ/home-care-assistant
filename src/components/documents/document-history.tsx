"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import {
  buttonClass,
  inputClass,
  Notice,
  panelClass,
  primaryClass,
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
  const pathname = usePathname(), params = useSearchParams();
  const returnTo = pathname === "/historico" ? "?returnTo=" + encodeURIComponent(pathname + (params.size ? "?" + params.toString() : "")) : "";
  return (
    <Link
      className="document-row hca-document-record"
      href={"/documentos/" + row.id + returnTo}
      prefetch={false}
    >
      <span className="document-type hca-document-kind">{row.kind ?? row.type}</span>
      <span className="hca-document-record-main">
        <strong>{row.code ?? (row.status === "draft" ? "Rascunho" : "Registro sem expedição")}</strong>
        <span className="block text-xs text-(--muted)">
          {row.kind === "DEV" ? "Devolução de materiais" : documentLabels[row.type]} · {formatBrazilDate(row.created_at)}
        </span>
        {row.task ? <span className="mt-1 block text-sm font-semibold">{row.task.label}</span> : null}
      </span>
      <span className="hca-document-record-end">
        <StatusBadge status={row.status} />
        {row.fulfillment ? (
          <span className="text-xs text-(--muted)">
            {row.fulfillment.fulfilled}/{row.fulfillment.total} itens atendidos
          </span>
        ) : row.type === "ENT" && row.document_lines ? (
          <span className="text-xs text-(--muted)">
            {row.document_lines.filter((line) => line.fully_checked).length}/
            {row.document_lines.length} conferidas
          </span>
        ) : null}
      </span>
      <span className="document-row-arrow hca-document-record-arrow">
        <Icon name="arrow" width="18" />
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
  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Documentos e acompanhamento</h2>
            <p className="mt-1 text-xs text-(--muted)">
              {read.data ? `${total} registro(s) no contexto autorizado` : "Total ainda não confirmado."}
            </p>
          </div>
          <button
            className={buttonClass}
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
            aria-controls="history-filters"
          >
            <Icon name="search" />
            Pesquisar e filtrar
            {active.length ? (
              <span className="ui-badge ui-badge-pending">{active.length}</span>
            ) : null}
          </button>
        </div>
        {showFilters ? (
          <form
            id="history-filters"
            className="mt-5 grid gap-4 border-t border-(--line) pt-5 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={apply}
          >
            <label className="text-sm font-semibold">
              Código ou protocolo
              <input
                className={inputClass}
                value={draft.search}
                onChange={(event) =>
                  setDraft({ ...draft, search: event.target.value })
                }
                placeholder="REQ-0001"
              />
            </label>
            <label className="text-sm font-semibold">
              Ficha
              <select
                className={inputClass}
                aria-label="Ficha"
                value={draft.type}
                onChange={(event) =>
                  setDraft({ ...draft, type: event.target.value })
                }
              >
                <option value="">Todas autorizadas</option>
                {context.patient?.capabilities?.["ent.read"] ? <option value="DEV">DEV · Devolução de materiais</option> : null}
                {Object.entries(documentLabels)
                  .filter(
                    ([type]) =>
                      context.patient?.capabilities?.[
                      type.toLowerCase() + ".read"
                      ],
                  )
                  .map(([type, label]) => (
                    <option key={type} value={type}>
                      {type} · {label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Situação
              <select
                className={inputClass}
                aria-label="Situação"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
              >
                <option value="">Todas</option>
                {Object.entries(historyFilters).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              De
              <input
                className={inputClass}
                type="date"
                value={draft.from}
                onChange={(event) =>
                  setDraft({ ...draft, from: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-semibold">
              Até
              <input
                className={inputClass}
                type="date"
                value={draft.to}
                min={draft.from}
                onChange={(event) =>
                  setDraft({ ...draft, to: event.target.value })
                }
              />
            </label>
            <div className="flex items-end gap-2">
              <button className={primaryClass} type="submit">
                Aplicar filtros
              </button>
              <button
                className={buttonClass}
                type="button"
                onClick={() => {
                  setFilters(empty);
                  setDraft(empty);
                }}
              >
                Limpar
              </button>
            </div>
          </form>
        ) : null}
        <p className="sr-only" role="status">{active.length ? `Filtros ativos: ${active.map(item => item.text).join(". ")}.` : "Nenhum filtro ativo."}</p>
        {active.length ? (
          <div
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Filtros ativos"
            role="group"
          >
            {active.map(({ key, text, removeLabel }) => (
              <button
                key={key}
                className="ui-badge ui-badge-neutral min-h-9"
                onClick={() => {
                  setFilters({ ...filters, [key]: "" });
                  setDraft({ ...draft, [key]: "" });
                }}
                aria-label={removeLabel}
              >
                {text} ×
              </button>
            ))}
          </div>
        ) : null}
      </section>
      {error ? (
        <Notice error>
          {error}
          {read.data && !previousVisible ? <button className={buttonClass} type="button" onClick={() => setPreviousVisible(true)}>Mostrar lista da última consulta</button> : null}
          <button
            className={buttonClass}
            type="button"
            onClick={() => {
              read.refresh();
            }}
          >
            Tentar novamente
          </button>
        </Notice>
      ) : null}
      {loading ? <Notice>Consultando documentos…</Notice> : null}
      {read.queriedAt ? <p className="text-xs text-(--muted)">
        {loading || error ? "Última consulta válida" : "Lista consultada"}: {formatBrazilDate(read.queriedAt)}.
        {loading || error ? " Os registros preservados podem estar desatualizados." : ""}
      </p> : null}
      {read.data && !loading && (!error || previousVisible) ? (
        <section className={panelClass}>
          {error ? <p role="status">Lista anterior, consultada em {formatBrazilDate(read.queriedAt)}. A atualização não foi confirmada.</p> : null}
          {rows.length ? (
            rows.map((row) => <DocumentRow key={row.id} row={row} />)
          ) : !loading && !error ? (
            <EmptyState title={active.length ? "Nenhuma ficha encontrada" : "Ainda não há fichas neste paciente"}>
              {active.length ? "Ajuste ou limpe os filtros para consultar novamente." : "As fichas emitidas neste contexto aparecerão aqui."}
            </EmptyState>
          ) : null}
        </section>
      ) : null}
      {read.data && total > 20 ? (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Páginas do histórico"
        >
          <button
            className={buttonClass}
            disabled={page <= 1 || loading || Boolean(error)}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            Anterior
          </button>
          <span className="text-xs">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            className={buttonClass}
            disabled={page * 20 >= total || loading || Boolean(error)}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Próxima
          </button>
        </nav>
      ) : null}
    </div>
  );
}
