"use client";

import { useRef, useState } from "react";
import { useDocumentDecision } from "@/components/documents/use-document-decision";
import { ActionButton, DefinitionGrid, FormField, Pill, SelectField, TextAreaField } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { formatZonedDate } from "@/lib/schedules/time";
import type { DocumentDecisionIntention, DocumentDecisionReceipt } from "@/lib/validation/document-decisions";
import type { BalanceCountPermission, BalanceCountPermissionRequest } from "@/types/balances";

type Entry = { request: BalanceCountPermissionRequest } | { permission: BalanceCountPermission };
const statusLabels = { pending: "Aguardando autorização", approved: "Profissional autorizado", rejected: "Pedido recusado" };

export function BalanceCountPermissionAction({ entry, context, timezone, onChanged }: {
  entry: Entry; context: WorkspaceContext; timezone?: string; onChanged: () => void;
}) {
  const request = "request" in entry ? entry.request : null;
  const permission = "permission" in entry ? entry.permission : null;
  const action = request ? "request_count_permission" : "decide_count_permission";
  const documentId = request?.assignmentId ?? permission!.id;
  const decision = useDocumentDecision({ userId: context.userId, documentId, domain: "balance_workspace", action, patientId: context.patient!.id });
  const openerRef = useRef<HTMLButtonElement>(null);
  const [snapshot, setSnapshot] = useState<Entry | null>(null);
  const [text, setText] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const selectedRequest = snapshot && "request" in snapshot ? snapshot.request : null;
  const selectedPermission = snapshot && "permission" in snapshot ? snapshot.permission : null;
  const reference = selectedRequest?.referenceHash ?? selectedPermission?.decision?.referenceHash;
  const currentReference = request?.referenceHash ?? permission?.decision?.referenceHash;
  const available = request ? !request.alreadyPending : Boolean(permission?.decision);
  const changed = Boolean(snapshot && (!available || currentReference !== reference));
  const targets = selectedPermission?.decision?.targets ?? [];
  const chosen = targets.find(target => target.id === shiftId) ?? (targets.length === 1 ? targets[0] : undefined);
  const getDate = (value: string) => formatZonedDate(value, timezone);

  function open() {
    setSnapshot(entry); setText(""); setShiftId(""); setResult(""); setError(""); setLeaving(false);
  }
  function close() {
    if (decision.busy || decision.uncertain) return;
    if (!result && (text.trim() || shiftId) && !leaving) setLeaving(true);
    else setSnapshot(null);
  }
  function confirmed(receipt: DocumentDecisionReceipt | null) {
    if (!receipt) return;
    if (receipt.state === "not_applied") { setError("A conferência confirmou que esta tentativa não alterou o balanço."); return; }
    setError("");
    setResult(request ? "Autorização solicitada" : receipt.result.status === "approved" ? "Profissional autorizado" : "Pedido recusado");
    onChanged();
  }
  async function recover() {
    try { confirmed(await decision.checkPrevious()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Confira novamente o resultado."); }
  }
  async function send(approve?: boolean) {
    if (!reference || changed || decision.busy || decision.uncertain || result) return;
    if (selectedRequest && text.trim().length < 3) { setError("Explique por que você precisa fazer este balanço."); return; }
    if (approve && !chosen) return;
    const input: DocumentDecisionIntention = {
      domain: "balance_workspace", action, referenceHash: reference, expectedVersion: selectedRequest?.version ?? 0,
      body: selectedRequest ? { reason: text.trim() } : { approve, note: text.trim(), ...(approve && chosen ? { shiftId: chosen.id, shiftVersion: chosen.version } : {}) },
    };
    setError("");
    try { confirmed(await decision.execute(input)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Confira o resultado desta tentativa."); onChanged(); }
  }
  const selected = selectedRequest ?? selectedPermission;
  const title = result || (leaving ? "Sair sem confirmar?" : request ? "Pedir autorização para contar" : "Autorizar este profissional?");
  return <>
    {request?.alreadyPending ? <Pill tone="warning">Autorização solicitada</Pill> : null}
    {available ? <ActionButton ref={openerRef} onClick={open} disabled={decision.busy}>{request ? "Pedir autorização" : "Decidir pedido"}</ActionButton> : null}
    {!snapshot && decision.recoveryMessage ? <Notice error={decision.uncertain}>{decision.recoveryMessage}</Notice> : null}
    {!snapshot && decision.uncertain ? <ActionButton onClick={() => void recover()} disabled={decision.busy}>Conferir resultado</ActionButton> : null}
    {selected ? <Dialog open title={title} headingIcon={request ? "user" : "shield"} success={Boolean(result)}
      onClose={close} closeDisabled={decision.busy || decision.uncertain}
      finalFocus={() => openerRef.current ?? document.getElementById("balance-count-permission-history")}
      footer={result ? <ActionButton variant="primary" onClick={close}>Voltar aos balanços</ActionButton>
        : leaving ? <><ActionButton onClick={() => setLeaving(false)}>Voltar ao preenchimento</ActionButton><ActionButton variant="danger" onClick={close}>Sair e descartar</ActionButton></>
        : decision.uncertain ? <ActionButton variant="primary" disabled={decision.busy} onClick={() => void recover()}>Conferir resultado</ActionButton>
        : <><ActionButton onClick={close} disabled={decision.busy}>Voltar</ActionButton>
          {request ? <ActionButton variant="primary" disabled={decision.busy || changed} onClick={() => void send()}>Enviar pedido</ActionButton>
            : <><ActionButton variant="danger" disabled={decision.busy || changed} onClick={() => void send(false)}>Recusar</ActionButton>
              <ActionButton variant="primary" disabled={decision.busy || changed || !chosen} onClick={() => void send(true)}>Autorizar</ActionButton></>}</>}>
      {result ? <p>{request ? "Seu motivo foi encaminhado à administração do paciente. Aguarde a decisão antes de contar." : "A decisão ficou registrada no histórico do balanço."}</p>
        : leaving ? <p>O texto deste preenchimento será descartado ao sair.</p>
        : <div className="hca-form-stack">
          <DefinitionGrid items={[
            { label: "Balanço", value: `${getDate(selected.startsAt)} → ${getDate(selected.endsAt)}`, wide: true },
            { label: "Responsável atual", value: selected.responsibleName },
            { label: "Quem solicita", value: selectedPermission?.requesterName ?? context.fullName },
          ]} />
          {selectedPermission ? <blockquote className="hca-muted whitespace-pre-wrap wrap-anywhere">{selectedPermission.reason}</blockquote>
            : <p>A administração do paciente avaliará o pedido antes de liberar a contagem.</p>}
          {selectedPermission && !targets.length ? <Notice>A autorização requer um plantão publicado compatível com o prazo atual. Confira a escala ou recuse o pedido.</Notice> : null}
          {selectedPermission && targets.length ? <FormField label="Plantão para a contagem" required>
            <SelectField value={chosen?.id ?? ""} onChange={event => setShiftId(event.currentTarget.value)} disabled={decision.busy || decision.uncertain || changed}>
              {targets.length > 1 ? <option value="">Selecione o plantão</option> : null}
              {targets.map(shift => <option key={shift.id} value={shift.id}>{shift.type} · {getDate(shift.startsAt)} → {getDate(shift.endsAt)}</option>)}
            </SelectField>
          </FormField> : null}
          <FormField label={request ? "Por que você precisa fazer este balanço?" : "Observação da decisão"} required={Boolean(request)}>
            <TextAreaField value={text} maxLength={1000} disabled={decision.busy || decision.uncertain} onChange={event => setText(event.currentTarget.value)} />
          </FormField>
          {changed ? <Notice>A referência mudou. Seu texto permanece disponível.
            {available ? <ActionButton onClick={() => { setSnapshot(entry); setShiftId(""); setError(""); }}>Conferir situação atual</ActionButton> : null}
          </Notice> : null}
          {error || decision.error ? <Notice error>{error || decision.error}</Notice> : null}
        </div>}
    </Dialog> : null}
  </>;
}

export function BalanceCountPermissionHistory({ rows, context, timezone, onChanged }: {
  rows: BalanceCountPermission[]; context: WorkspaceContext; timezone?: string; onChanged: () => void;
}) {
  if (!rows.length) return null;
  return <section className="ui-card hca-form-stack" aria-label="Autorizações de contagem">
    <h2 id="balance-count-permission-history" tabIndex={-1}>Autorizações de contagem</h2>
    {rows.map(row => <article key={row.id} className="hca-record" aria-label="Pedido para fazer o balanço">
      <div className="hca-record-main">
        <strong>{row.requesterName}</strong>
        <small>{statusLabels[row.status]} · {formatZonedDate(row.createdAt, timezone)}</small>
        <p className="whitespace-pre-wrap wrap-anywhere">{row.reason}</p>
        {row.decidedAt ? <p>{row.deciderName} · {formatZonedDate(row.decidedAt, timezone)}</p> : null}
        {row.decisionNote ? <p className="whitespace-pre-wrap wrap-anywhere">{row.decisionNote}</p> : null}
      </div>
      <BalanceCountPermissionAction entry={{ permission: row }} context={context} timezone={timezone} onChanged={onChanged} />
    </article>)}
  </section>;
}
