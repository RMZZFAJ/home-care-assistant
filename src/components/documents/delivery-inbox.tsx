"use client";
import { useEffect, useState } from "react";
import { Button, Select, Spinner } from "@fluentui/react-components";
import { api, can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { DocumentRow, type DocumentSummary } from "./document-history";
import { EmptyState } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";

export function DeliveryInbox() {
  return <Workspace title="Entregas e recebimentos">{(context) => context.patient && can(context, "ent.read") ? <Inbox key={context.patient.id} context={context} /> : <Notice>Seu contexto não permite consultar entregas.</Notice>}</Workspace>;
}
function Inbox({ context }: { context: WorkspaceContext }) {
  const [scope, setScope] = useState(context.patient?.role === "professional" ? "own" : "team");
  const [status, setStatus] = useState("pending_receipt");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const revision = useLiveRevision();
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ careRecipientId: context.patient!.id, scope, status, page: String(page), pageSize: "20" });
    void api<{ data: DocumentSummary[]; total: number }>("/api/deliveries?" + params, undefined, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setRows(result.data); setTotal(result.total); setError(""); }
    }, (reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [context.patient, scope, status, page, revision, attempt]);
  return <>
    <p className="text-sm text-(--muted)">Conferências e recebimentos. Somente o destinatário autorizado pode confirmar os materiais.</p>
    <div className="hca-toolbar"><Select aria-label="Responsável pelas entregas" value={scope} onChange={(event) => { setScope(event.target.value); setPage(1); }}><option value="own">Destinadas a mim</option><option value="team">Histórico autorizado da equipe</option></Select>
      <Select aria-label="Situação das entregas" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="pending_receipt">Aguardando conferência</option><option value="disputed">Com divergência</option><option value="confirmed">Concluídas</option><option value="cancelled">Canceladas</option><option value="">Todas</option></Select>
    </div>
    {error ? <Notice error>{error}<Button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></Notice> : loading ? <Spinner label="Carregando entregas" /> : rows.length ? <div className="hca-records">{rows.map((row) => <DocumentRow key={row.id} row={row} />)}</div> : <EmptyState title="Nenhuma entrega nesta seleção">Novas entregas aparecerão aqui quando forem expedidas.</EmptyState>}
    {total > 20 ? <div className="hca-toolbar"><Button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span>Página {page} · {total} entregas</span><Button disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div> : null}
  </>;
}
