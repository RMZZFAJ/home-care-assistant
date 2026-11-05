"use client";
import { useEffect, useState } from "react";
import { Button, Select, Spinner } from "@fluentui/react-components";
import {
  api,
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { DocumentRow, type DocumentSummary } from "./document-history";
import { EmptyState } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";

export function DeliveryInbox() {
  return (
    <Workspace title="Entregas e recebimentos">
      {(context) =>
        context.patient && can(context, "ent.read") ? (
          <Inbox key={context.patient.id} context={context} />
        ) : (
          <Notice>Seu contexto não permite consultar entregas.</Notice>
        )
      }
    </Workspace>
  );
}
function Inbox({ context }: { context: WorkspaceContext }) {
  const [scope, setScope] = useState("own"),
    [status, setStatus] = useState("tasks"),
    [page, setPage] = useState(1),
    [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    rows: DocumentSummary[];
    total: number;
    error: string;
  }>({ key: "", rows: [], total: 0, error: "" });
  const revision = useLiveRevision(),
    params = new URLSearchParams({
      careRecipientId: context.patient!.id,
      scope,
      status,
      page: String(page),
      pageSize: "20",
    }).toString(),
    requestKey = params + ":" + revision + ":" + attempt,
    loading = result.key !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: DocumentSummary[]; total: number }>(
      "/api/deliveries?" + params,
      undefined,
      controller.signal,
    ).then(
      (data) => {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            rows: data.data,
            total: data.total,
            error: "",
          });
      },
      (reason) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            ...previous,
            key: requestKey,
            error:
              reason instanceof Error
                ? reason.message
                : "Não foi possível consultar as entregas.",
          }));
      },
    );
    return () => controller.abort();
  }, [params, requestKey]);
  return (
    <>
      <p className="text-sm text-(--muted)">
        Suas tarefas incluem recebimento pessoal, decisões de cancelamento e
        encaminhamentos administrativos designados. A consulta não confirma
        recebimento.
      </p>
      <div className="hca-toolbar">
        <Select
          aria-label="Situação das entregas"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            if (event.target.value === "tasks") setScope("own");
            setPage(1);
          }}
        >
          <option value="tasks">Minhas tarefas executáveis</option>
          <option value="pending_receipt">Aguardando recebimento</option>
          <option value="disputed">Com divergência</option>
          <option value="cancellation_pending">Pedido de cancelamento</option>
          <option value="confirmed">Conferência concluída</option>
          <option value="administratively_closed">
            Encerradas administrativamente
          </option>
          <option value="cancelled">Canceladas</option>
          <option value="">Todas</option>
        </Select>
        <Select
          aria-label="Responsável pelas entregas"
          value={scope}
          disabled={status === "tasks"}
          onChange={(event) => {
            setScope(event.target.value);
            setPage(1);
          }}
        >
          <option value="own">Destinadas a mim</option>
          <option value="team">Histórico autorizado do paciente</option>
        </Select>
      </div>
      {!loading && result.error ? (
        <Notice error>
          {result.error}
          <Button onClick={() => setAttempt((value) => value + 1)}>
            Tentar novamente
          </Button>
        </Notice>
      ) : null}
      {loading ? <Spinner label="Consultando entregas e tarefas" /> : null}
      {result.rows.length ? (
        <section aria-label="Entregas da consulta" aria-busy={loading}>
          {loading || result.error ? (
            <Notice>
              Última consulta preservada. Atualize para conferir a situação
              vigente.
            </Notice>
          ) : null}
          <div className="hca-records">
            {result.rows.map((row) => (
              <DocumentRow key={row.id} row={row} />
            ))}
          </div>
        </section>
      ) : !loading && !result.error ? (
        <EmptyState title="Nenhuma entrega nesta seleção">
          {status === "tasks"
            ? "Não há tarefa executável para sua identidade e suas permissões atuais. O histórico autorizado permanece disponível nos filtros."
            : "Não foram encontradas entregas para os filtros consultados."}
        </EmptyState>
      ) : null}
      {result.total > 20 ? (
        <div className="hca-toolbar">
          <Button
            disabled={page === 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {page} · {result.total} entregas
          </span>
          <Button
            disabled={page * 20 >= result.total || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </Button>
        </div>
      ) : null}
    </>
  );
}
