"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api, buttonClass, errorMessage, inputClass, Notice, panelClass, primaryClass, Workspace, type WorkspaceContext } from "@/components/workspace";
import { deliveryLabels as notificationLabels, recipientGroupLabels, deliveryErrorLabels, type DeliveryStatus } from "@/lib/notifications/presentation";
import { textRows } from "@/lib/text-rows";
import { formatBrazilDate } from "@/lib/receipt";
import { PrintButton } from "./print-button";
import { statusLabels } from "./requisition-history";
import type { RequisitionReceipt } from "@/types/requisition";

type Item = { id: string; product_id: string | null; custom_name: string | null; current_stock: number | null; urgent: boolean; product_name_snapshot?: string; unit_snapshot?: string; products?: { name?: string; unit?: string } | null };
type Detail = { id: string; care_recipient_id: string; protocol: string; status: string | null; created_at: string | null; is_historical?: boolean; source_created_at?: string | null; receipt_snapshot?: RequisitionReceipt | null; profiles?: { full_name?: string } | null; care_recipients?: { display_name?: string } | null; requisition_items: Item[]; requisition_observations: { body: string; created_at: string }[]; requisition_status_history: { id: string; from_status: string; to_status: string; changed_at: string; reason?: string }[]; requisition_notifications: DeliveryStatus[] };
const nextStates: Record<string,string[]> = { submitted: ["under_review","cancelled"], under_review: ["approved","cancelled"], approved: ["separated"], separated: ["delivered"] };

export function RequisitionDetail({ id }: { id: string }) { return <Workspace title="Comprovante e acompanhamento">{(context) => <DetailContent id={id} context={context} />}</Workspace>; }

function DetailContent({ id, context }: { id: string; context: WorkspaceContext }) {
  const [data,setData] = useState<Detail | null>(null);
  const [receipt,setReceipt] = useState<RequisitionReceipt | null>(null);
  const [attempt,setAttempt] = useState(0);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: Detail; receipt?: RequisitionReceipt }>(`/api/requisitions/${id}`,undefined,controller.signal).then((body) => { setData(body.data); setReceipt(body.receipt ?? body.data.receipt_snapshot ?? null); setError(""); }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o comprovante."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id,attempt]);
  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/requisitions/${id}/status`, { method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ status: form.get("status"), reason: form.get("reason") }) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(body,"Não foi possível alterar o estado."));
      setMessage("Estado atualizado e registrado na auditoria."); setLoading(true); setAttempt((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar."); } finally { setBusy(false); }
  }
  const transitions = data?.status ? nextStates[data.status] : undefined;
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="flex flex-wrap justify-between gap-3 print:hidden"><Link className={buttonClass} href="/historico">← Voltar ao histórico</Link><PrintButton /><button className={buttonClass} disabled={loading} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Atualizar acompanhamento</button></div>
    {loading && <Notice>Carregando comprovante persistido…</Notice>}
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {data && !loading && <><section className={panelClass}><p className="text-sm font-semibold text-(--brand)">Comprovante persistido</p><h2 className="mt-2 text-3xl font-bold">{data.protocol}</h2><p className="mt-4"><strong>Estado:</strong> {data.status ? statusLabels[data.status] ?? data.status : "Desconhecido"}</p><p className="mt-2"><strong>Paciente:</strong> {receipt?.recipientName ?? data.care_recipients?.display_name ?? "Desconhecido"}</p><p className="mt-2"><strong>Solicitante:</strong> {receipt?.requesterName ?? (data.is_historical ? "Desconhecido no registro histórico" : data.profiles?.full_name ?? "Desconhecido")}</p><p className="mt-2"><strong>Data:</strong> {data.is_historical && receipt?.createdAt == null ? "Data original desconhecida" : formatBrazilDate(receipt?.createdAt ?? data.source_created_at ?? data.created_at)}</p>{receipt?.legacyReconstructed && <p className="mt-3 text-xs text-(--muted)">Registro legado: os dados disponíveis foram reconstruídos para consulta.</p>}</section>
    <section className={panelClass}><h2 className="font-bold">Itens registrados</h2><ul className="mt-3 space-y-3">{receipt ? [...receipt.lines.map((item) => ({ key: item.productId, name: item.productName, stock: item.currentStock, urgent: item.urgent })), ...receipt.extraItems.map((item) => ({ key: item.id, name: item.name, stock: item.currentStock, urgent: item.urgent }))].map((item) => <li key={item.key} className="rounded border border-(--line) p-3 text-sm"><strong>{item.name}</strong><p>{item.stock == null ? "Estoque desconhecido" : `Estoque informado: ${item.stock}`}{item.urgent ? " · Urgente" : ""}</p></li>) : data.requisition_items.map((item) => <li key={item.id} className="text-sm">{item.product_name_snapshot ?? item.custom_name ?? item.products?.name ?? item.product_id} — {item.current_stock == null ? "Estoque desconhecido" : `estoque informado: ${item.current_stock}`}{item.urgent ? " · Urgente" : ""}</li>)}</ul></section>
    <section className={panelClass}><h2 className="font-bold">Observações</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{textRows(receipt?.observations ?? data.requisition_observations.map((item) => item.body)).map((row) => <li key={row.key}>{row.value}</li>)}</ul>{!(receipt?.observations.length ?? data.requisition_observations.length) && <p className="mt-3 text-sm">Nenhuma observação.</p>}</section>
    <section className={panelClass}><h2 className="font-bold">Notificações</h2><p className="mt-2 text-xs text-(--muted)">A aceitação pelo provedor não confirma a entrega. O estado é atualizado por eventos confirmados.</p><ul className="mt-3 space-y-3">{data.requisition_notifications.map((item) => <li key={item.id} className="rounded border border-(--line) p-3 text-sm"><p>{recipientGroupLabels[item.recipient_group] ?? item.recipient_group} · {item.recipient_label} · {item.channel}</p><p className="mt-1 font-semibold">{notificationLabels[item.state] ?? item.state} · {item.attempts} tentativa(s)</p>{item.attempted_at && <p className="mt-1 text-xs text-(--muted)">Última tentativa: {formatBrazilDate(item.attempted_at)}</p>}{item.error_code && <p className="mt-2">{deliveryErrorLabels[item.error_code] ?? deliveryErrorLabels.PROCESSING_FAILED}</p>}</li>)}</ul>{!data.requisition_notifications.length && <p className="mt-3 text-sm">Nenhuma notificação configurada.</p>}</section>
    <section className={panelClass}><h2 className="font-bold">Histórico de estados</h2><ol className="mt-3 space-y-3">{data.requisition_status_history.map((item) => <li key={item.id} className="text-sm"><strong>{statusLabels[item.to_status] ?? item.to_status}</strong> · {formatBrazilDate(item.changed_at)}{item.reason && <p className="mt-1 text-(--muted)">{item.reason}</p>}</li>)}</ol></section>
    {(context.isGlobalAdmin || (context.patient?.id === data.care_recipient_id && ["admin","supervisor"].includes(context.patient.role))) && transitions && <section className={`${panelClass} print:hidden`}><h2 className="mb-4 font-bold">Atualizar acompanhamento</h2><form onSubmit={transition} className="space-y-4"><label className="block text-sm font-semibold">Próximo estado<select name="status" required className={inputClass}>{transitions.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label><label className="block text-sm font-semibold">Justificativa<textarea name="reason" required minLength={3} maxLength={1000} rows={3} className={inputClass} /></label><button type="submit" disabled={busy} className={primaryClass}>{busy ? "Salvando…" : "Salvar alteração"}</button></form></section>}</>}
  </div>;
}
