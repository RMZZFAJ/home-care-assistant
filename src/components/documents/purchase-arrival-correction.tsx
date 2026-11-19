"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { ActionButton, FormField, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import { arrivalCorrectionExpected } from "@/lib/documents/purchase";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { resubmitArrival } from "@/lib/validation/purchase-arrival";
import type { DocumentDecisionIntention, DocumentDecisionReceipt } from "@/lib/validation/document-decisions";
import type { PurchaseReceipt, PurchaseReceiptLine, SupplyDocument, SupplyLine } from "@/types/documents";
import { PurchaseDetails, PurchaseReceiptContent } from "./purchase-details";
import { SupplyLineSummary } from "./supply-line-summary";
import { useDocumentDecision } from "./use-document-decision";

const requestAction = "request_receipt_correction";
const resubmitAction = "resubmit_receipt";

type CorrectionEditor = { receiptId: string; version: number; action: typeof requestAction | typeof resubmitAction; };

function ArrivalCorrectionQuantity({ document, receipt, item, line }: {
  document: SupplyDocument; receipt: PurchaseReceipt; item: PurchaseReceiptLine; line: SupplyLine;
}) {
  const [value, setValue] = useState(item.quantity);
  const [confirmedAgainst, setConfirmedAgainst] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const expected = arrivalCorrectionExpected(document, receipt, item, line);
  const physical = validQuantity(value, 6, true) ? quantity(value) : null;
  const latest = receipt.corrections?.at(-1);
  return <article className="hca-purchase-line">
    <div className="hca-purchase-line-heading"><div><h3>{line.name_snapshot}</h3>
      <p>Informado anteriormente: {formatQuantity(item.quantity, line.unit_snapshot)}</p></div>
      <ActionButton variant="quiet" compact className="hca-purchase-options" ref={optionsRef}
        aria-label={"Detalhes de " + line.name_snapshot} onClick={() => setShowDetails(true)}><Icon name="more" /></ActionButton></div>
    {latest ? <>
      <p className="hca-arrival-attention hca-purchase-status"><Icon name="clock" />Correção solicitada por {latest.requesterName ?? "quem conferiu a chegada"}</p>
      <p className="whitespace-pre-wrap">{latest.reason}</p>
    </> : null}
    <label className="hca-purchase-field"><span>Quantidade corrigida</span>
      <span className="hca-purchase-quantity">
        <TextInput name={line.id} required inputMode="decimal" maxLength={64} value={value}
          aria-label={"Quantidade corrigida · " + line.name_snapshot}
          onChange={event => { setValue(event.currentTarget.value); setConfirmedAgainst(null); }} />
        <span aria-hidden="true">{line.unit_snapshot}</span>
      </span>
    </label>
    {physical?.lt(expected) ? <FormField label={"Destino da falta · " + line.name_snapshot}
      helpText={"Restam " + formatQuantity(expected.minus(physical).toFixed(), line.unit_snapshot)}>
      <SelectField name={line.id + ":remainingAction"} defaultValue={item.remainingAction ?? "wait"}>
        <option value="wait">Aguardar nova entrega</option><option value="short">Encerrar com falta</option>
      </SelectField>
    </FormField> : null}
    {physical?.gt(expected) ? <label className="hca-purchase-status hca-arrival-attention">
      <input type="checkbox" name={line.id + ":excess"} checked={confirmedAgainst === expected.toFixed()}
        onChange={event => setConfirmedAgainst(event.currentTarget.checked ? expected.toFixed() : null)} />
      <span>Conferi {formatQuantity(physical.minus(expected).toFixed(), line.unit_snapshot)} a mais.</span>
    </label> : null}
    <Dialog open={showDetails} title="Detalhes do material" onClose={() => setShowDetails(false)} finalFocus={optionsRef}>
      <SupplyLineSummary line={line} type="COM" status={document.status}
        purchaseLine={document.purchaseProgress?.lines.find(row => row.lineId === line.id)} />
    </Dialog>
  </article>;
}

export function PurchaseArrivalCorrections({ data, context, onUpdated }: {
  data: SupplyDocument; context: WorkspaceContext; onUpdated: (read: SupplyDocument) => void;
}) {
  const scope = { userId: context.userId, documentId: data.id, domain: "supply" as const };
  const request = useDocumentDecision({ ...scope, action: requestAction });
  const resubmit = useDocumentDecision({ ...scope, action: resubmitAction });
  const [editor, setEditor] = useState<CorrectionEditor | null>(null);
  const [reason, setReason] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<CorrectionEditor["action"] | null>(null);
  const [exit, setExit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const formId = useId();
  const active = context.patient?.id === data.care_recipient_id && !["cancelled", "rejected", "administratively_closed"].includes(data.status);
  const mayRequest = active && context.patient?.role === "admin" && can(context, "com.validate");
  const mayResubmit = active && can(context, "com.receive");
  const mayRequestReceipt = (receipt: PurchaseReceipt) => mayRequest && receipt.state === "pending" && receipt.submitted_by !== context.userId;
  const mayResubmitReceipt = (receipt: PurchaseReceipt) => mayResubmit && receipt.state === "correction_requested" && receipt.submitted_by === context.userId;
  const selected = data.receipts.find(receipt => receipt.id === editor?.receiptId);
  const correcting = editor?.action === resubmitAction;
  const decision = correcting ? resubmit : request;
  const eligible = selected && (correcting ? mayResubmitReceipt(selected) : mayRequestReceipt(selected));
  const busy = request.busy || resubmit.busy || refreshing;
  const stale = editor && editor.version !== data.version;

  function finish() { setEditor(null); setExit(false); }
  function closeEditor() { if (dirty) setExit(true); else finish(); }
  function open(receipt: PurchaseReceipt, action: CorrectionEditor["action"]) {
    setEditor({ receiptId: receipt.id, version: data.version, action });
    setReason(""); setError(""); setDirty(false);
  }
  function verifiedRead(raw: Record<string, unknown>, intention: DocumentDecisionIntention) {
    const confirmed = requireSupplyConfirmation({ data: raw, persistence: "confirmed" }, {
      id: data.id, patientId: data.care_recipient_id, type: "COM", minimumVersion: intention.expectedVersion + 1,
    });
    const receipt = confirmed.receipts.find(item => item.id === intention.body.receiptId);
    const change = receipt?.corrections?.at(-1);
    if (!receipt || !change || (intention.action === requestAction
      ? receipt.state !== "correction_requested" || change.requesterId !== context.userId || change.reason !== intention.body.reason
      : receipt.state !== "pending" || receipt.submitted_by !== context.userId || !change.resubmittedAt)) {
      throw new Error("A resposta não confirmou a correção desta chegada.");
    }
    if (intention.action === resubmitAction) {
      const { lines } = resubmitArrival.parse(intention.body);
      if (lines.length !== receipt.lines.length || !lines.every(line => receipt.lines.some(item =>
        item.lineId === line.lineId && item.quantity === line.quantity && item.expectedQuantity === line.expectedQuantity &&
        item.remainingAction === line.remainingAction && item.excessConfirmed === line.excessConfirmed))) {
        throw new Error("As quantidades corrigidas não foram confirmadas.");
      }
    }
    return confirmed;
  }
  function apply(result: DocumentDecisionReceipt | null) {
    if (!result) return;
    if (result.state === "not_applied") {
      setError("A conferência confirmou que nada foi alterado. Você pode tentar novamente. Se persistir, procure a supervisão.");
      return;
    }
    const updated = verifiedRead(result.result, result.intention);
    if (updated.version >= data.version) onUpdated(updated);
    setSuccess(result.intention.action === requestAction ? requestAction : resubmitAction);
    finish();
  }
  async function recover(recovery: typeof decision) {
    try { apply(await recovery.checkPrevious(verifiedRead)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a correção."); }
  }
  async function refresh() {
    setRefreshing(true);
    try {
      const current = await api<{ data: SupplyDocument }>(`/api/documents/${data.id}`);
      if (current.data.id !== data.id || current.data.care_recipient_id !== data.care_recipient_id || current.data.version < data.version)
        throw new Error("A resposta não confirmou a versão desta ficha.");
      onUpdated(current.data);
      setEditor(previous => previous && { ...previous, version: current.data.version });
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar a chegada."); }
    finally { setRefreshing(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !selected || !eligible || stale || busy || decision.uncertain) return;
    setError("");
    try {
      const body: Record<string, unknown> = { receiptId: selected.id };
      if (correcting) {
        const fields = new FormData(event.currentTarget);
        body.lines = selected.lines.map(item => {
          const material = data.lines.find(line => line.id === item.lineId);
          if (!material) throw new Error("Este material precisa ser conferido na ficha atual.");
          const value = String(fields.get(material.id) ?? "");
          if (!validQuantity(value, 6, true)) throw new Error("Confira a quantidade de " + material.name_snapshot + ".");
          const expected = arrivalCorrectionExpected(data, selected, item, material);
          const physical = quantity(value);
          if (physical.gt(expected) && fields.get(material.id + ":excess") !== "on") throw new Error("Confirme o excedente de " + material.name_snapshot + ".");
          return { lineId: material.id, quantity: physical.toFixed(), expectedQuantity: expected.toFixed(),
            ...(physical.lt(expected) ? { remainingAction: fields.get(material.id + ":remainingAction") } : {}),
            ...(physical.gt(expected) ? { excessConfirmed: true } : {}) };
        });
      } else body.reason = reason.trim();
      apply(await decision.execute({ domain: "supply", action: editor.action, body, expectedVersion: editor.version }, verifiedRead));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a correção."); }
  }

  return <>
    {!editor && Object.entries({ request, resubmit }).map(([name, recovery]) => recovery.recoveryMessage || recovery.uncertain ? <Notice key={name} error={recovery.uncertain}>
        {recovery.recoveryMessage || recovery.error}
        {recovery.uncertain ? <ActionButton disabled={busy} onClick={() => void recover(recovery)}>Conferir mesmo resultado</ActionButton> : null}
    </Notice> : null)}
    <PurchaseDetails data={data} arrivalActions={receipt => {
      if (mayResubmitReceipt(receipt)) return <ActionButton className="mt-3" variant="primary" disabled={busy || resubmit.uncertain}
        onClick={() => open(receipt, resubmitAction)}>Corrigir chegada</ActionButton>;
      if (mayRequestReceipt(receipt)) return <ActionButton className="mt-3" disabled={busy || request.uncertain}
        onClick={() => open(receipt, requestAction)}>Abrir pendência</ActionButton>;
      return null;
    }} />
    <Dialog open={Boolean(editor)} title={correcting ? "Corrigir chegada" : "Abrir pendência na chegada"}
      kicker={"COM · " + (context.patient?.display_name ?? data.code)}
      subtitle={correcting ? `${selected?.submitted_name ?? "O autor"} é responsável por ajustar o lançamento e reenviá-lo para aprovação.` : "Informe o que o autor precisa conferir e reenviar para aprovação."}
      onClose={closeEditor} closeDisabled={busy}
      footer={<><ActionButton disabled={busy} onClick={closeEditor}>Voltar</ActionButton>
        {decision.uncertain ? <ActionButton variant="primary" disabled={busy} onClick={() => void recover(decision)}>Conferir mesmo resultado</ActionButton>
          : <ActionButton variant="primary" type="submit" form={formId} disabled={!eligible || busy || Boolean(stale)}>{correcting ? "Reenviar para aprovação" : "Confirmar pendência"}</ActionButton>}</>}
    >
      <form id={formId} className="hca-purchase-list" onChange={() => setDirty(true)} onSubmit={event => void submit(event)}>
        {error ? <Notice error>{error}</Notice> : null}
        {!eligible ? <Notice error>A parcela já mudou de situação ou sua autorização foi alterada.</Notice> : null}
        {stale || error && !decision.uncertain ? <ActionButton disabled={busy} onClick={() => void refresh()}>Consultar versão atual da chegada</ActionButton> : null}
        {selected && (correcting ? selected.lines.map(item => {
          const material = data.lines.find(line => line.id === item.lineId);
          return material ? <ArrivalCorrectionQuantity key={item.lineId} document={data} receipt={selected} item={item} line={material} /> : null;
        }) : <>
          <PurchaseReceiptContent receipt={selected} lines={data.lines} />
          <FormField label="O que precisa ser corrigido?"><TextAreaField value={reason} onChange={event => setReason(event.currentTarget.value)} required rows={3} minLength={3} maxLength={1000} /></FormField>
        </>)}
      </form>
    </Dialog>
    <Dialog open={exit} title="Sair sem concluir?" onClose={() => setExit(false)}
      subtitle="Se sair agora, o preenchimento desta ação será descartado."
      footer={<><ActionButton onClick={() => setExit(false)}>Voltar ao preenchimento</ActionButton><ActionButton onClick={finish}>Sair e descartar</ActionButton></>}>{null}</Dialog>
    <Dialog open={Boolean(success)} success onClose={() => setSuccess(null)}
      title={success === requestAction ? "Correção solicitada" : "Chegada reenviada"}
      subtitle={success === requestAction ? "O autor pode corrigir a quantidade e reenviar para aprovação." : "A quantidade corrigida aguarda nova aprovação."}
      footer={<ActionButton variant="primary" onClick={() => setSuccess(null)}>Concluir</ActionButton>}>{null}</Dialog>
  </>;
}
