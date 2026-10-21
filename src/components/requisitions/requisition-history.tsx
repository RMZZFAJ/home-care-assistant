"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deliveryLabels, type DeliveryStatus } from "@/lib/notifications/presentation";
import { formatBrazilDate } from "@/lib/receipt";
import { api, buttonClass, inputClass, Notice, panelClass, primaryClass, Workspace, type WorkspaceContext } from "@/components/workspace";

type HistoryRow = { id: string; protocol: string; status: string | null; notifications: DeliveryStatus[]; created_at: string | null; source_created_at?: string | null; requester_name_snapshot?: string | null; recipient_name_snapshot?: string | null; is_historical?: boolean; profiles?: { full_name?: string } | { full_name?: string }[]; care_recipients?: { display_name?: string } | { display_name?: string }[]; receipt_snapshot?: { requesterName?: string; recipientName?: string } };
type HistoryResponse = { data: HistoryRow[]; page: number; pageSize: number; total: number };
export const statusLabels: Record<string,string> = { draft: "Rascunho", submitted: "Enviada", under_review: "Em análise", approved: "Aprovada", separated: "Separada", delivered: "Entregue", cancelled: "Cancelada" };
const emptyFilter = { protocol: "", status: "", from: "", to: "" };

export function RequisitionHistory() { return <Workspace title="Histórico de requisições">{(context) => context.patient ? <PatientHistory context={context} /> : <Notice>Selecione ou cadastre um paciente para consultar o histórico.</Notice>}</Workspace>; }

function PatientHistory({ context }: { context: WorkspaceContext }) {
  const [rows, setRows] = useState<HistoryResponse | null>(null);
  const [draft, setDraft] = useState(emptyFilter);
  const [filter, setFilter] = useState(emptyFilter);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: "20", careRecipientId: context.patient!.id });
    for (const [key,value] of Object.entries(filter)) if (value.trim()) params.set(key,value.trim());
    api<HistoryResponse>(`/api/requisitions?${params}`,undefined,controller.signal).then((body) => { setRows(body); setError(""); }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page,filter,context.patient,attempt]);
  return <div className="space-y-5">
    <form className={`${panelClass} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`} onSubmit={(event) => { event.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setError("A data inicial precisa ser anterior ou igual à final."); return; } setLoading(true); setError(""); setPage(1); setFilter({...draft}); }}>
      <label className="text-sm font-semibold">Protocolo<input value={draft.protocol} onChange={(event) => setDraft({...draft,protocol:event.target.value})} placeholder="HC-000012" className={inputClass} /></label>
      <label className="text-sm font-semibold">Estado<select value={draft.status} onChange={(event) => setDraft({...draft,status:event.target.value})} className={inputClass}><option value="">Todos</option>{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold">De<input type="date" value={draft.from} onChange={(event) => setDraft({...draft,from:event.target.value})} className={inputClass} /></label>
      <label className="text-sm font-semibold">Até<input type="date" value={draft.to} onChange={(event) => setDraft({...draft,to:event.target.value})} className={inputClass} /></label>
      <button type="submit" className={`${primaryClass} self-end`}>Buscar</button><p className="text-xs text-(--muted) sm:col-span-2 lg:col-span-5">Datas e horários apresentados no fuso de São Paulo.</p>
    </form>
    {loading && <Notice>Carregando histórico…</Notice>}
    {error && <Notice error>{error}<button className={`${buttonClass} ml-3`} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Tentar novamente</button></Notice>}
    {!loading && !error && rows?.data.length === 0 && <div className={panelClass}>Nenhuma requisição encontrada para os filtros selecionados.</div>}
    {!loading && !error && rows && rows.data.length > 0 && <section className={panelClass}><p className="mb-3 text-sm text-(--muted)">{rows.total} registro(s)</p><ul className="divide-y divide-(--line)">{rows.data.map((row) => <li key={row.id} className="py-4"><Link href={`/historico/${row.id}?careRecipientId=${context.patient!.id}`} className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-(--brand)">{row.protocol}</p><p className="mt-1 text-sm">{row.recipient_name_snapshot ?? row.receipt_snapshot?.recipientName ?? displayName(row.care_recipients)} · {row.requester_name_snapshot ?? row.receipt_snapshot?.requesterName ?? displayName(row.profiles)}</p><p className="mt-1 text-xs text-(--muted)">{row.is_historical && !row.created_at ? "Registro histórico · data original desconhecida" : row.created_at ? formatBrazilDate(row.created_at) : "Data desconhecida"}</p></div><span className="rounded-full bg-[#edf5f1] px-3 py-1 text-xs font-semibold">{(row.status ? statusLabels[row.status] : null) ?? row.status ?? "Desconhecido"}</span></Link><p className="mt-2 text-xs text-(--muted)">Notificações: {row.notifications.length ? Array.from(new Set(row.notifications.map((notification) => notification.state))).map((state) => `${deliveryLabels[state] ?? state}: ${row.notifications.filter((notification) => notification.state === state).length}`).join(" · ") : "Nenhuma configurada"}</p></li>)}</ul></section>}
    {rows && rows.total > rows.pageSize && <nav aria-label="Páginas do histórico" className="flex items-center justify-between"><button disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }} className={buttonClass}>Anterior</button><span className="text-sm">Página {rows.page} de {Math.ceil(rows.total / rows.pageSize)}</span><button disabled={page * rows.pageSize >= rows.total || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className={buttonClass}>Próxima</button></nav>}
  </div>;
}

function displayName(value: HistoryRow["profiles"] | HistoryRow["care_recipients"]) { const item = (Array.isArray(value) ? value[0] : value) as { full_name?: string; display_name?: string } | undefined; return item?.full_name ?? item?.display_name ?? "Desconhecido"; }
