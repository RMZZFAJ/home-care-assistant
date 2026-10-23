"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  buttonClass,
  inputClass,
  Notice,
  panelClass,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { EmptyState, Icon, StatusBadge } from "@/components/ui/primitives";
import {
  documentLabels,
  documentStatuses,
  type DocumentType,
} from "@/types/documents";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";

export type DocumentSummary = {
  id: string;
  type: DocumentType;
  fulfillment?: { fulfilled: number; total: number };
  code: string | null;
  protocol: string | null;
  status: string;
  created_at: string;
  recipient_id: string | null;
  document_lines?: {
    id: string;
    fully_checked: boolean;
    accepted_quantity: string;
    quantity: string;
  }[];
};
type Filters = {
  search: string;
  type: string;
  status: string;
  from: string;
  to: string;
};
const empty: Filters = { search: "", type: "", status: "", from: "", to: "" };
const historyFilters = {
  ...documentStatuses,
  archive_pending: "Conclusões para revisar e arquivar",
  science_required: "Requisições para sua ciência",
};
export function DocumentRow({ row }: { row: DocumentSummary }) {
  return (
    <Link
      className="document-row"
      href={row.type === "REQ" ? "/historico/" + row.id : "/fichas/" + row.id}
    >
      <span className="document-type">{row.type}</span>
      <span className="min-w-0">
        <strong>{row.code ?? "Rascunho"}</strong>
        <span className="block text-xs text-(--muted)">
          {documentLabels[row.type]} · {formatBrazilDate(row.created_at)}
        </span>
      </span>
      <span className="grid justify-items-end gap-1">
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
      <span className="document-row-arrow">
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
            key={context.patient.id + params.toString()}
            context={context}
            initial={{
              ...empty,
              type: params.get("type") ?? "",
              status: params.get("status") ?? "",
            }}
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
}: {
  context: WorkspaceContext;
  initial: Filters;
}) {
  const [filters, setFilters] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [showFilters, setShowFilters] = useState(
    Object.values(initial).some(Boolean),
  );
  const [rows, setRows] = useState<DocumentSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const liveRevision = useLiveRevision();
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      careRecipientId: context.patient!.id,
      page: String(page),
      pageSize: "20",
      ...filters,
    });
    api<{ data: DocumentSummary[]; total: number }>(
      "/api/documents?" + query,
      undefined,
      controller.signal,
    )
      .then(
        (result) => {
          setRows(result.data);
          setTotal(result.total);
          setError("");
        },
        (reason) => {
          if (!controller.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : "Não foi possível consultar o histórico.",
            );
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [context.patient, filters, page, attempt, liveRevision]);
  const active = Object.entries(filters).filter(([, value]) => value);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setLoading(true);
    setFilters({ ...draft });
  }
  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Documentos e acompanhamento</h2>
            <p className="mt-1 text-xs text-(--muted)">
              {total} registro(s) no contexto autorizado
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
                  setPage(1);
                  setLoading(true);
                }}
              >
                Limpar
              </button>
            </div>
          </form>
        ) : null}
        {active.length ? (
          <div
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Filtros ativos"
          >
            {active.map(([key, value]) => (
              <button
                key={key}
                className="ui-badge ui-badge-neutral min-h-9"
                onClick={() => {
                  setFilters({ ...filters, [key]: "" });
                  setDraft({ ...draft, [key]: "" });
                  setPage(1);
                  setLoading(true);
                }}
                aria-label={"Remover filtro " + key}
              >
                {key === "type"
                  ? "Ficha"
                  : key === "status"
                    ? "Situação"
                    : key === "search"
                      ? "Busca"
                      : key === "from"
                        ? "De"
                        : "Até"}
                : {documentStatuses[value] ?? value} ×
              </button>
            ))}
          </div>
        ) : null}
      </section>
      {error ? (
        <Notice error>
          {error}
          <button
            className={buttonClass}
            type="button"
            onClick={() => {
              setAttempt((value) => value + 1);
              setLoading(true);
            }}
          >
            Tentar novamente
          </button>
        </Notice>
      ) : null}
      {loading ? <Notice>Consultando documentos…</Notice> : null}
      {!loading && !error ? (
        <section className={panelClass}>
          {rows.length ? (
            rows.map((row) => <DocumentRow key={row.id} row={row} />)
          ) : (
            <EmptyState title="Nenhuma ficha encontrada">
              Ajuste os filtros ou registre uma nova ficha autorizada.
            </EmptyState>
          )}
        </section>
      ) : null}
      {total > 20 ? (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Páginas do histórico"
        >
          <button
            className={buttonClass}
            disabled={page <= 1 || loading}
            onClick={() => {
              setPage((value) => value - 1);
              setLoading(true);
            }}
          >
            Anterior
          </button>
          <span className="text-xs">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            className={buttonClass}
            disabled={page * 20 >= total || loading}
            onClick={() => {
              setPage((value) => value + 1);
              setLoading(true);
            }}
          >
            Próxima
          </button>
        </nav>
      ) : null}
    </div>
  );
}
