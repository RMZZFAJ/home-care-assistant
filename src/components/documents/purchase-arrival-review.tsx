"use client";

import { Menu } from "@base-ui/react/menu";
import { useId, useRef, useState } from "react";
import { ActionButton, FormField, LoadingIndicator, TextAreaField } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Notice } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { can } from "@/lib/client/capabilities";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { arrivalReviewBatchLimit, arrivalReviewQueue, requireArrivalReviewReceipt, type ArrivalReviewDecision,
  type ArrivalReviewQueue, type ArrivalReviewReceipt, type ArrivalReviewRow } from "@/lib/validation/purchase-arrival-review";
import type { WorkspaceContext } from "@/types/workspace";
import { unlinkedOriginLabel } from "@/lib/validation/unlinked-arrival";

const endpoint = "/api/purchases/arrivals/review";
const reviewSteps = [{ label: "Conferindo as parcelas selecionadas", icon: "file" },
  { label: "Consultando o resultado", icon: "check" }] as const;
const documentReviewSteps = [...reviewSteps, { label: "Atualizando a ficha", icon: "refresh" }] as const;
const outcomeLabels = { approved: "Chegada aprovada", rejected: "Chegada recusada", correction_requested: "Correção solicitada",
  already_decided: "Chegada já decidida", changed: "A ficha mudou. Confira a versão atual.", blocked: "Decisão bloqueada" } as const;
type Choice = { decision: "approve" | "skip" | "reject" | "request_correction"; reason?: string };

function MaterialStatus({ item }: { item: ArrivalReviewRow["materials"][number] }) {
  const difference = item.expectedQuantity === null ? null : quantity(item.expectedQuantity).minus(item.quantity);
  let caption = "Quantidade disponível após aprovação.";
  if (difference?.gt(0)) caption = (item.remainingAction === "short" ? "Entrega encerrada com falta de " : "Aguardando outra entrega de ") + formatQuantity(difference.toFixed(), item.unit) + ".";
  else if (difference?.lt(0)) caption = "Excedente conferido de " + formatQuantity(difference.abs().toFixed(), item.unit) + ".";
  else if (difference) caption = "Chegada completa.";
  const attention = Boolean(difference && !difference.eq(0));
  return <p className={"hca-purchase-status " + (attention ? "hca-arrival-attention" : "hca-arrival-confirmed")}>
    <Icon name={attention ? "clock" : "check"} width={14} height={14} />{caption}
  </p>;
}

function ArrivalReviewCard({ row, choice, update }: {
  row: ArrivalReviewRow; choice: Choice; update: (choice: Choice) => void;
}) {
  const one = row.materials.length === 1 ? row.materials[0] : null;
  const title = one?.name ?? `${row.materials.length} materiais`;
  const correction = choice.decision === "request_correction";
  const reject = choice.decision === "reject";
  return <article className="hca-purchase-line" data-receipt-id={row.receiptId} data-inactive={choice.decision === "skip" || undefined}>
    <div className="hca-purchase-line-heading">
      <div><h3>{title}</h3>{one ? <p>{formatQuantity(one.quantity, one.unit)} informados</p> : null}</div>
      {correction || reject ? <span className={"hca-purchase-status " + (correction ? "hca-arrival-attention" : "hca-arrival-rejected")}>
        {correction ? "Pendência" : "Recusa"}
      </span> : <label className="hca-purchase-switch">
        <input type="checkbox" role="switch" aria-label={`Aprovar entrada · ${title}`} checked={choice.decision === "approve"}
          onChange={event => update({ decision: event.currentTarget.checked ? "approve" : "skip" })} />
      </label>}
      <Menu.Root modal={false}>
        <Menu.Trigger aria-label={`Opções da chegada · ${title}`} render={<ActionButton variant="quiet" compact className="hca-purchase-options" />}><Icon name="more" /></Menu.Trigger>
        <MenuPopup>
          {correction || reject ? <Menu.Item className="hca-menu-item" onClick={() => update({ decision: "approve" })}><Icon name="refresh" />Desfazer decisão</Menu.Item> : <>
            <Menu.Item className="hca-menu-item" onClick={() => update({ decision: "request_correction" })}><Icon name="note" />Abrir pendência</Menu.Item>
            <Menu.Item className="hca-menu-item doc-menu-danger" onClick={() => update({ decision: "reject" })}><Icon name="close" />Recusar chegada</Menu.Item>
          </>}
        </MenuPopup>
      </Menu.Root>
    </div>
    <p className="text-sm text-(--muted)">{row.documentCode}{row.origin ? ` · ${unlinkedOriginLabel[row.origin]}` : ""} · {row.author ?? "Autor não preservado"} · {formatBrazilDate(row.submittedAt)}</p>
    {!one ? <ul className="space-y-2">{row.materials.map(item => <li key={item.lineId}>
      <strong>{item.name} · {formatQuantity(item.quantity, item.unit)} informados</strong><MaterialStatus item={item} />
    </li>)}</ul> : null}
    {correction || reject ? <FormField label={correction ? "O que precisa ser corrigido?" : "Motivo da recusa"}>
      <TextAreaField rows={2} value={choice.reason ?? ""} maxLength={1000} required minLength={3}
        placeholder={correction ? `Explique a correção para ${row.author ?? "o autor"}.` : "Explique por que esta chegada será cancelada."}
        onChange={event => update({ decision: choice.decision, reason: event.currentTarget.value })} />
    </FormField> : <>
      {one ? <MaterialStatus item={one} /> : null}
      {row.materials.some(item => item.familyStock !== null) ? <details className="hca-arrival-stock">
        <summary><Icon name="stock" />Estoque familiar</summary>
        {row.materials.map(item => item.familyStock === null ? null : <p key={item.lineId}>
          {!one ? `${item.name} · ` : ""}Disponíveis hoje: {formatQuantity(item.familyStock, item.unit)} · Após aprovação: {formatQuantity(quantity(item.familyStock).plus(item.quantity).toFixed(), item.unit)}
        </p>)}
      </details> : null}
    </>}
  </article>;
}

export function PurchaseArrivalReview({ context, documentId, hasPending, onReviewed }: {
  context: WorkspaceContext; documentId?: string; hasPending?: boolean; onReviewed?: () => Promise<void>;
}) {
  const patient = context.patient;
  if (!patient || patient.role !== "admin" || !can(context, "com.read") || !can(context, "com.validate")) return null;
  return <ArrivalReviewEntry key={`${context.userId}:${patient.id}:${documentId ?? "all"}`} patientId={patient.id}
    patientName={patient.display_name} userId={context.userId} documentId={documentId} hasPending={hasPending} onReviewed={onReviewed} />;
}

function ArrivalReviewEntry({ patientId, patientName, userId, documentId, hasPending = true, onReviewed }: {
  patientId: string; patientName: string; userId: string; documentId?: string; hasPending?: boolean; onReviewed?: () => Promise<void>;
}) {
  const storage = `hca:arrival-review:${userId}:${patientId}`;
  const [pendingKey, setPendingKey] = useState<string | null>(() => {
    try { return sessionStorage.getItem(storage); } catch { return null; }
  });
  const [open, setOpen] = useState(false), [exit, setExit] = useState(false);
  const [queue, setQueue] = useState<ArrivalReviewQueue>({ arrivals: [], next: null });
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0), [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<ArrivalReviewReceipt, { state: "recorded" }> | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const sendingRef = useRef(false), readingRef = useRef(false), triggerRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  useOperationActivity(busy, { title: "Registrando decisões das chegadas", stage, steps: onReviewed ? documentReviewSteps : reviewSteps });
  const groups = new Map<string, ArrivalReviewRow[]>();
  const selected: ArrivalReviewDecision[] = [];
  for (const row of queue.arrivals) {
    const groupKey = row.documentId ?? "unlinked";
    const group = groups.get(groupKey);
    if (group) group.push(row); else groups.set(groupKey, [row]);
    const choice = choices[row.receiptId];
    if (!choice || choice.decision === "skip") continue;
    const target = { documentId: row.documentId, receiptId: row.receiptId, version: row.version };
    selected.push(choice.decision === "approve" ? { ...target, decision: "approve" } : { ...target, decision: choice.decision, reason: choice.reason?.trim() ?? "" });
  }

  async function load(more = false) {
    if (readingRef.current || (more && !queue.next)) return;
    readingRef.current = true; setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ careRecipientId: patientId });
      if (documentId) query.set("documentId", documentId);
      if (more && queue.next) { query.set("beforeAt", queue.next.at); query.set("beforeId", queue.next.id); }
      const response = await api<{ data: unknown }>(endpoint + "?" + query);
      const page = arrivalReviewQueue.parse(response.data);
      const prior = more ? queue.arrivals : [];
      const added = page.arrivals.filter(row => !prior.some(item => item.receiptId === row.receiptId));
      setQueue({ arrivals: [...prior, ...added], next: page.next });
      setChoices(previous => ({ ...(more ? previous : {}), ...Object.fromEntries(added.map((row, index) =>
        [row.receiptId, { decision: prior.length + index < arrivalReviewBatchLimit ? "approve" : "skip" }])) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar as chegadas."); }
    finally { readingRef.current = false; setLoading(false); }
  }
  function forget() {
    setPendingKey(null);
    try { sessionStorage.removeItem(storage); } catch { /* The confirmed result remains available in this view. */ }
  }
  async function apply(outcome: ArrivalReviewReceipt) {
    forget();
    if (outcome.state === "not_applied") {
      setError("A conferência confirmou que nenhuma decisão foi registrada. Você pode consultar as chegadas e tentar novamente.");
      return;
    }
    setRefreshFailed(false);
    if (onReviewed) {
      setStage(2);
      try { await onReviewed(); } catch { setRefreshFailed(true); }
    }
    setResult(outcome); setOpen(false); setError("");
    window.dispatchEvent(new Event("hca:data-changed"));
  }
  async function send(recover = false) {
    if (sendingRef.current || (recover ? !pendingKey : Boolean(pendingKey) || !selected.length || selected.length > arrivalReviewBatchLimit)) return;
    if (!recover && selected.some(entry => entry.decision !== "approve" && entry.reason.length < 3)) {
      setError("Informe o motivo da recusa ou o que precisa ser corrigido.");
      return;
    }
    sendingRef.current = true; setBusy(true); setStage(recover ? 1 : 0); setError("");
    const key = pendingKey ?? crypto.randomUUID();
    const attempt = { key, careRecipientId: patientId };
    setPendingKey(key);
    try { sessionStorage.setItem(storage, key); } catch { /* Keep the same key in the open operation. */ }
    try {
      if (!recover) {
        try {
          const response = await api<{ data: unknown }>(endpoint, { ...attempt, entries: selected });
          await apply(requireArrivalReviewReceipt(response.data, key, selected));
          return;
        } catch { setStage(1); }
      }
      const response = await api<{ data: unknown }>(endpoint + "/reconcile", attempt);
      await apply(requireArrivalReviewReceipt(response.data, key, recover ? undefined : selected));
    } catch {
      setError("O resultado ainda não pôde ser confirmado. Confira a mesma tentativa antes de repetir a decisão. Se persistir, procure a supervisão.");
    } finally { sendingRef.current = false; setBusy(false); }
  }
  function openReview() {
    setOpen(true); setError(""); setDirty(false);
    if (!pendingKey) { setQueue({ arrivals: [], next: null }); setChoices({}); void load(); }
  }
  function closeReview() { setOpen(false); setExit(false); }
  function requestClose() { if (!pendingKey && dirty) setExit(true); else closeReview(); }
  const changed = result?.results.some(row => ["approved", "rejected", "correction_requested"].includes(row.status));

  return <>
    {hasPending || pendingKey ? <ActionButton ref={triggerRef} variant={documentId ? "primary" : undefined} onClick={openReview}>
      <Icon name="truck" width={16} height={16} />{pendingKey ? "Conferir resultado das chegadas" : "Conferir chegadas"}
    </ActionButton> : null}
    <Dialog open={open} title={documentId && queue.arrivals.length <= 1 ? "Conferir entrada no estoque" : "Conferir chegadas"}
      kicker={`${documentId ? "COM" : "Chegadas"} · ${patientName}`} subtitle="Os itens marcados entram no estoque familiar. Desmarque para decidir depois ou use os três pontos para pedir correção ou recusar."
      onClose={requestClose} closeDisabled={busy} finalFocus={triggerRef}
      footer={<><ActionButton disabled={busy} onClick={requestClose}>Voltar</ActionButton>
        {pendingKey ? <ActionButton variant="primary" disabled={busy} onClick={() => void send(true)}>Conferir mesmo resultado</ActionButton>
          : <ActionButton variant="primary" type="submit" form={formId} disabled={loading || !selected.length || selected.length > arrivalReviewBatchLimit}>Confirmar decisões</ActionButton>}</>}>
      <form id={formId} className="hca-purchase-list" onSubmit={event => { event.preventDefault(); void send(); }}>
        {error ? <Notice error>{error}</Notice> : null}
        {pendingKey ? <p>Uma confirmação foi enviada. Consulte seu resultado antes de revisar outra chegada.</p> : <>
          {loading ? <LoadingIndicator label="Consultando chegadas" /> : null}
          {!loading && !error && !queue.arrivals.length ? <p>Nenhuma chegada aguarda conferência neste momento.</p> : null}
          {!loading && error && !queue.arrivals.length ? <ActionButton onClick={() => void load()}>Consultar chegadas</ActionButton> : null}
          {selected.length > arrivalReviewBatchLimit ? <Notice error>Selecione até {arrivalReviewBatchLimit} chegadas por confirmação.</Notice> : null}
          {[...groups].map(([id, rows]) => <section key={id} aria-label={id === "unlinked" ? "Chegadas avulsas" : `Chegadas de ${rows[0].documentCode}`} className="hca-purchase-list">
            {rows.map(row => <ArrivalReviewCard key={row.receiptId} row={row} choice={choices[row.receiptId] ?? { decision: "skip" }}
              update={choice => { setDirty(true); setChoices(previous => ({ ...previous, [row.receiptId]: choice })); }} />)}
          </section>)}
          {queue.next ? <ActionButton disabled={loading} onClick={() => void load(true)}>Mostrar mais chegadas</ActionButton> : null}
        </>}
      </form>
    </Dialog>
    <Dialog open={exit} title="Sair sem concluir?" onClose={() => setExit(false)} subtitle="Se sair agora, suas escolhas serão descartadas."
      footer={<><ActionButton onClick={() => setExit(false)}>Voltar à conferência</ActionButton><ActionButton onClick={closeReview}>Sair e descartar</ActionButton></>}>{null}</Dialog>
    <Dialog open={Boolean(result)} success={Boolean(changed)} onClose={() => setResult(null)}
      title={changed ? "Decisões registradas" : "Resultado da conferência"} finalFocus={triggerRef}
      footer={<ActionButton variant="primary" onClick={() => setResult(null)}>Concluir</ActionButton>}>
      {refreshFailed ? <Notice>O resultado foi registrado. Use Atualizar ficha para consultar a versão atual.</Notice> : null}
      <ul className="hca-purchase-list">{result?.results.map(row => <li key={row.receiptId} className="hca-purchase-line">
        <strong>{row.status === "approved" && queue.arrivals.find(item => item.receiptId === row.receiptId)?.materials.every(item => quantity(item.quantity).eq(0))
          ? "Chegada aprovada sem movimentação de estoque" : outcomeLabels[row.status]}</strong>
        <p>{[row.documentCode, row.materials.join(", "), row.submittedAt && formatBrazilDate(row.submittedAt)].filter(Boolean).join(" · ") || row.receiptId}</p>
      </li>)}</ul>
    </Dialog>
  </>;
}
