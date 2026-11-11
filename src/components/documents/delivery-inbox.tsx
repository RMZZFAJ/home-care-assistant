"use client";
import { ActionButton, FormField, LoadingIndicator, SelectField } from "@/components/ui/controls";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  can,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { DeliveryTaskRow } from "./delivery-task-row";
import { deliveryInboxHref, deliveryInboxSelection, type DeliveryInboxSelection } from "@/lib/documents/delivery-inbox";
import { EmptyState } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";
import Link from "next/link";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseDeliveryListRead } from "@/lib/validation/document-list";
import { formatBrazilDate } from "@/lib/receipt";

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
  const patientId = context.patient!.id;
  const urlParams = useSearchParams(), urlValues = deliveryInboxSelection(urlParams, patientId);
  const urlKey = JSON.stringify(urlValues);
  const [selection, setSelection] = useState({ urlKey, values: urlValues });
  if (selection.urlKey !== urlKey) setSelection({ urlKey, values: urlValues });
  const { scope, status, page } = selection.values;
  const revision = useLiveRevision(),
    params = new URLSearchParams({
      careRecipientId: patientId,
      scope,
      status,
      page: String(page),
      pageSize: "20",
    }).toString();
  const decode = useCallback((value: unknown) => parseDeliveryListRead(value, {
    careRecipientId: patientId, scope, status, page, pageSize: 20,
  }), [patientId, scope, status, page]);
  const read = useScopedRead("/api/deliveries?" + params, String(revision), decode);
  const { loading, error } = read;
  const rows = read.data?.data ?? [], total = read.data?.total ?? 0;
  const fresh = Boolean(read.data && !loading && !error);
  const navigate = (values: DeliveryInboxSelection) => {
    setSelection({ urlKey, values });
    const href = deliveryInboxHref(urlParams.toString(), patientId, values);
    if (href !== window.location.pathname + window.location.search) window.history.pushState(null, "", href);
  };
  const presets = [
    { id: "tasks", label: "Acompanhar", scope: "own", status: "tasks" },
    { id: "own", label: "Minhas participações", scope: "own", status: "" },
    { id: "history", label: "Histórico", scope: "team", status: "" },
  ];
  const activeView = status === "tasks" ? "tasks" : scope === "own" ? "own" : "history";
  return (
    <>
      <p className="text-sm text-(--muted)">
        Suas tarefas incluem concordância e expedição de transferências,
        recebimento pessoal, decisões de cancelamento e
        encaminhamentos administrativos designados. A consulta não confirma
        recebimento.
      </p>
      {can(context, "ent.create") ? <Link href="/transferencias" className="ui-button ui-button-secondary">Declarar transferência entre custódias</Link> : null}
      <nav className="hca-delivery-views" aria-label="Visões das entregas">
        {presets.map(view => <Link key={view.id} href={deliveryInboxHref(urlParams.toString(), patientId, { scope: view.scope, status: view.status, page: 1 })}
          prefetch={false} aria-current={activeView === view.id ? "page" : undefined}
          onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); navigate({ scope: view.scope, status: view.status, page: 1 }); } }}>
          {view.label}
        </Link>)}
      </nav>
      <div className="hca-toolbar">
        <FormField label="Situação das entregas">
        <SelectField
          style={{ minWidth: 0, maxWidth: "100%" }}

          aria-label="Situação das entregas"
          value={status}
          onChange={(event) => {
            navigate({ status: event.target.value, scope: event.target.value === "tasks" ? "own" : scope, page: 1 });
          }}
        >
          <option value="tasks">Minhas tarefas executáveis</option>
          <option value="transfer_pending">Aguardando concordância</option>
          <option value="transfer_ready">Prontas para expedição</option>
          <option value="pending_receipt">Aguardando recebimento</option>
          <option value="disputed">Com divergência</option>
          <option value="cancellation_pending">Pedido de cancelamento</option>
          <option value="confirmed">Conferência concluída</option>
          <option value="administratively_closed">
            Encerradas administrativamente
          </option>
          <option value="cancelled">Canceladas</option>
          <option value="">Todas</option>
        </SelectField>
        </FormField>
        <FormField label="Responsável pelas entregas">
        <SelectField
          style={{ minWidth: 0, maxWidth: "100%" }}

          aria-label="Responsável pelas entregas"
          value={scope}
          disabled={status === "tasks"}
          onChange={(event) => {
            navigate({ scope: event.target.value, status, page: 1 });
          }}
        >
          <option value="own">Minhas participações</option>
          <option value="team">Histórico autorizado do paciente</option>
        </SelectField>
        </FormField>
      </div>
      {error ? (
        <Notice error>
          {error}
          <ActionButton onClick={read.refresh}>
            Tentar novamente
          </ActionButton>
        </Notice>
      ) : null}
      {loading ? <LoadingIndicator label="Consultando entregas e tarefas" /> : null}
      {read.queriedAt ? <p className="text-xs text-(--muted)">
        {loading || error ? "Última consulta preservada." : "Entregas consultadas:"} {formatBrazilDate(read.queriedAt)}.
        {loading || error ? " Atualize para conferir a situação vigente." : ""}
      </p> : null}
      {rows.length ? (
        <section aria-label="Entregas da consulta" aria-busy={loading}>
          <div className="hca-delivery-task-list">
            {rows.map((row) => (
              <DeliveryTaskRow key={row.id} row={row} fresh={fresh} />
            ))}
          </div>
        </section>
      ) : read.data && !loading && !error ? (
        <EmptyState title="Nenhuma entrega nesta seleção">
          {status === "tasks"
            ? "Não há tarefa executável para sua identidade e suas permissões atuais. O histórico autorizado permanece disponível nos filtros."
            : "Não foram encontradas entregas para os filtros consultados."}
        </EmptyState>
      ) : null}
      {read.data && total > 20 ? (
        <nav className="hca-toolbar" aria-label="Páginas das entregas">
          <ActionButton
            disabled={page === 1 || loading || Boolean(error)}
            onClick={() => navigate({ scope, status, page: page - 1 })}
          >
            Anterior
          </ActionButton>
          <span>
            Página {page} · {total} entregas
          </span>
          <ActionButton
            disabled={page * 20 >= total || loading || Boolean(error)}
            onClick={() => navigate({ scope, status, page: page + 1 })}
          >
            Próxima
          </ActionButton>
        </nav>
      ) : null}
    </>
  );
}
