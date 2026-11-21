"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { ActionButton, DefinitionGrid, FormField, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { awaitsDeliveryNeed, currentDeliveryNeed, deliveryTransit } from "@/lib/documents/family-fulfillment";
import { readCountedDeliveryReceipt } from "@/lib/documents/delivery-receipt";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { DeliveryResolutionBody } from "@/lib/validation/delivery-receipt";
import type { SupplyDocument } from "@/types/documents";
import { DeliveryMaterialMenu } from "./delivery-material-menu";

type Resolution = DeliveryResolutionBody["resolution"];
const familyOptions: { value: Resolution; label: string }[] = [
  { value: "not_sent", label: "Permaneceu com a família" },
  { value: "returned", label: "Retornou à família" },
  { value: "missing", label: "Perda confirmada" },
];
const teamOptions: typeof familyOptions = [
  { value: "received", label: "A equipe recebeu depois" },
  { value: "not_sent", label: "Permaneceu com a equipe" },
  { value: "returned", label: "Retornou à equipe" },
  { value: "missing", label: "Perda confirmada" },
];

export function canAssessDeliveryNeed(data: SupplyDocument, context: WorkspaceContext) {
  return context.patient?.id === data.care_recipient_id && ["family", "admin"].includes(context.patient?.role ?? "") &&
    can(context, "ent.create") && can(context, "ent.read");
}

export function canReconcileFromFamily(data: SupplyDocument, context: WorkspaceContext) {
  return data.kind === "ENT" && data.payload.source === "FAMILY" && Boolean(data.workflow_data.acceptedAt) && canAssessDeliveryNeed(data, context);
}

type MaterialDecisionFields = { disposition?: Resolution; amount?: string; reason?: string; complete?: boolean };
type ReconciliationEditor = {
  lineId?: string;
  appliedVersion?: number;
  fields: Record<string, MaterialDecisionFields>;
};

export function DeliveryReconciliation({ data, context, busy, blocked, uncertain, error, conflict, finalFocus, latest, onSubmit, onRecover, onClose }: {
  data: SupplyDocument;
  context: WorkspaceContext;
  busy: boolean;
  blocked: boolean;
  uncertain: boolean;
  error: string;
  conflict?: ReactNode;
  finalFocus: RefObject<HTMLButtonElement | null>;
  latest?: { version: number; lineId: string; nextLineId: string };
  onSubmit: (body: DeliveryResolutionBody) => void;
  onRecover: () => void;
  onClose: () => void;
}) {
  const [editor, setEditor] = useState<ReconciliationEditor>({ fields: {} });
  const assessmentHintId = useId();
  const [discard, setDiscard] = useState(false);
  const activeHeadingRef = useRef<HTMLHeadingElement>(null);
  if (latest && editor.appliedVersion !== latest.version) {
    const fields = { ...editor.fields };
    delete fields[latest.lineId];
    setEditor({ lineId: latest.nextLineId, appliedVersion: latest.version, fields });
  }
  const candidates = data.lines.filter(line => {
    const counted = readCountedDeliveryReceipt(line.metadata);
    return deliveryTransit(line).gt(0) || (counted && quantity(counted.remainingTransitQuantity).gt(0)) ||
      line.metadata.issueOpen || quantity(line.reconciled_quantity).gt(0) || awaitsDeliveryNeed(data, line) || currentDeliveryNeed(data, line);
  });
  const active = candidates.find(line => line.id === editor.lineId && deliveryTransit(line).gt(0)) ?? candidates.find(line => deliveryTransit(line).gt(0));
  const remaining = active ? deliveryTransit(active) : quantity(0);
  const ownReceipt = data.recipient_id === context.userId;
  const options = ownReceipt ? [{ value: "received" as const, label: data.payload.destination === "FAMILY" ? "A família recebeu depois" : "A equipe recebeu depois" }]
    : data.payload.source === "FAMILY" ? familyOptions : teamOptions.filter(option => option.value !== "received");
  const current = active ? editor.fields[active.id] : undefined;
  const disposition = current?.disposition ?? options[0].value;
  const value = current?.amount ?? remaining.toFixed();
  const reason = current?.reason ?? "";
  const validAmount = validQuantity(value, 6, false) && quantity(value).lte(remaining);
  const canAssess = active && validAmount && quantity(value).eq(remaining) && awaitsDeliveryNeed(data, active) && canAssessDeliveryNeed(data, context);
  const canComplete = active && quantity(active.accepted_quantity).gt(0) || canAssess && disposition === "received";
  const disabled = busy || blocked || uncertain;

  useEffect(() => {
    if (editor.lineId) activeHeadingRef.current?.focus();
  }, [editor.lineId, editor.appliedVersion]);

  function update(change: MaterialDecisionFields) {
    if (active) setEditor(previous => ({ ...previous, fields: { ...previous.fields, [active.id]: { ...previous.fields[active.id], ...change } } }));
  }

  function requestClose() {
    if (busy) return;
    if (!uncertain && candidates.some(line => deliveryTransit(line).gt(0) && editor.fields[line.id])) setDiscard(true);
    else onClose();
  }

  function submit() {
    if (!active || disabled || !validAmount || reason.trim().length < 3) return;
    onSubmit({
      lineId: active.id, quantity: quantity(value).toFixed(), resolution: disposition, reason: reason.trim(),
      ...(canAssess ? { familyAssessment: current?.complete && canComplete ? "complete" : "partial" } : {}),
    });
  }

  const decidedLine = candidates.find(line => line.id === latest?.lineId);
  return (<>
    <Dialog open title="Resolver diferença de quantidade" subtitle={candidates.length > 1
      ? "Selecione um material para registrar o destino da quantidade em aberto."
      : data.kind === "DEV" ? "Informe o destino das unidades em aberto." : "Informe o destino das unidades em aberto e confirme a avaliação deste material."}
      keyboardScrollable finalFocus={finalFocus} closeDisabled={busy} onClose={requestClose} footer={<>
        <ActionButton disabled={busy || uncertain} onClick={requestClose}>{active ? "Voltar" : "Voltar à ficha"}</ActionButton>
        {active || uncertain ? <ActionButton variant="primary" disabled={busy || !uncertain && (blocked || !validAmount || reason.trim().length < 3)}
          onClick={uncertain ? onRecover : submit}>{uncertain ? "Conferir resultado" : "Registrar decisão do item"}</ActionButton> : null}
      </>}>
      <div className="hca-delivery-receipt hca-delivery-reconciliation">
        <p className="sr-only" role="status">{decidedLine ? `Decisão registrada para ${decidedLine.name_snapshot}.` : ""}</p>
        {error ? <Notice error>{error}</Notice> : null}
        {conflict}
        {uncertain ? <Notice>Confira o resultado da tentativa antes de registrar outra decisão.</Notice> : null}
        {candidates.map(line => {
          const open = line.id === active?.id;
          const transit = deliveryTransit(line);
          const review = currentDeliveryNeed(data, line);
          return <article className="hca-receipt-line" key={line.id}>
            <header><div>
              <h3 ref={open ? activeHeadingRef : undefined} tabIndex={open ? -1 : undefined}>{line.name_snapshot}</h3>
              <p>{formatQuantity(line.quantity)} expedidos · {formatQuantity(line.accepted_quantity)} recebidos
                <span className="sr-only"> · Unidade: {line.unit_snapshot}</span></p>
            </div>
              <DeliveryMaterialMenu data={data} line={line} disabled={busy} />
            </header>
            {transit.gt(0) ? <p><span className="hca-receipt-change">{formatQuantity(transit.toFixed(), line.unit_snapshot)} em apuração</span></p> : <>
              <p>Diferença conciliada</p>
              {review ? <p className="hca-purchase-status" data-tone="success"><Icon name="check-circle" />
                {review.decision === "complete" ? "Necessidade integralmente atendida" : "Atendimento parcial · necessidade em aberto"}</p>
                : awaitsDeliveryNeed(data, line) ? <p className="hca-purchase-status"><Icon name="clock" />Avaliação familiar pendente</p> : null}
            </>}
            {open ? <div className="hca-reconcile-fields">
              <FormField label="O que aconteceu?">
                <SelectField value={disposition} disabled={disabled} onChange={event => {
                  const option = options.find(item => item.value === event.currentTarget.value);
                  if (option) update({ disposition: option.value });
                }}>
                  {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
              </FormField>
              <div className="hca-reconcile-amount">
                <FormField label="Quantidade esclarecida">
                  <div className="hca-receipt-quantity">
                    <TextInput type="text" inputMode="decimal" maxLength={64} value={value} readOnly={disabled} onChange={event => update({ amount: event.currentTarget.value })} />
                    <span>{line.unit_snapshot}</span>
                  </div>
                </FormField>
              </div>
              <FormField label="Como foi conferido?" required>
                <TextAreaField rows={2} maxLength={1000} placeholder="Descreva o que foi verificado." value={reason} readOnly={disabled} onChange={event => update({ reason: event.currentTarget.value })} />
              </FormField>
              {canAssess ? <label className="hca-purchase-switch hca-reconcile-assessment">
                <span><strong>Necessidade integralmente atendida</strong>
                  <small id={assessmentHintId}>Desligado indica atendimento parcial. A escolha ficará registrada com a conciliação.</small>
                </span>
                <input type="checkbox" role="switch" checked={Boolean(current?.complete && canComplete)}
                  aria-label="Necessidade integralmente atendida" aria-describedby={assessmentHintId}
                  disabled={disabled || !canComplete} onChange={event => update({ complete: event.currentTarget.checked })} />
              </label> : awaitsDeliveryNeed(data, line) ? <Notice>A necessidade aguarda decisão familiar.</Notice> : null}
            </div> : transit.gt(0) ? <ActionButton compact variant="quiet" className="justify-self-start" disabled={disabled}
              onClick={() => setEditor(previous => ({ ...previous, lineId: line.id }))}>Avaliar este material<span className="sr-only"> · {line.name_snapshot}</span></ActionButton> : null}
          </article>;
        })}
      </div>
    </Dialog>
    {discard ? <Dialog open title="Sair sem concluir a conciliação?" onClose={() => setDiscard(false)} footer={<>
      <ActionButton onClick={() => setDiscard(false)}>Voltar ao preenchimento</ActionButton>
      <ActionButton variant="primary" onClick={onClose}>Sair e descartar</ActionButton>
    </>}><p>O preenchimento em aberto será descartado. As decisões já registradas ficam na ficha.</p></Dialog> : null}
  </>);
}

export function DeliveryReconciliationResult({ data, body, onClose }: {
  data: SupplyDocument;
  body: DeliveryResolutionBody;
  onClose: () => void;
}) {
  const line = data.lines.find(item => item.id === body.lineId);
  const review = line && body.familyAssessment ? currentDeliveryNeed(data, line) : undefined;
  const remaining = line && deliveryTransit(line);
  const someRemaining = data.lines.some(item => deliveryTransit(item).gt(0) ||
    quantity(readCountedDeliveryReceipt(item.metadata)?.excessQuantity ?? 0).gt(0));
  const destination = body.resolution === "received"
    ? data.payload.destination === "FAMILY" ? "A família recebeu depois" : "A equipe recebeu depois"
    : (data.payload.source === "FAMILY" ? familyOptions : teamOptions).find(option => option.value === body.resolution)?.label;
  return <Dialog open success onClose={onClose}
    title={remaining?.gt(0) ? "Apuração parcial registrada" : "Diferença conciliada"}
    footer={<ActionButton variant="primary" onClick={onClose}>Voltar à ficha</ActionButton>}>
    <div className="hca-delivery-receipt"><article className="hca-receipt-line">
      <h3>{line?.name_snapshot}</h3>
      <DefinitionGrid items={[
        { label: "Destino físico", value: destination },
        { label: "Quantidade esclarecida", value: formatQuantity(body.quantity, line?.unit_snapshot) },
        ...(remaining?.gt(0) ? [{ label: "Ainda em apuração", value: formatQuantity(remaining.toFixed(), line?.unit_snapshot) }] : []),
      ]} />
      {review ? <p>{review.decision === "complete" ? "Necessidade integralmente atendida" : "Atendimento parcial · necessidade em aberto"}. {review.actorName} avaliou a necessidade ao resolver a diferença desta entrega.</p> : null}
      {line && !review && awaitsDeliveryNeed(data, line) ? <p>A necessidade aguarda avaliação familiar.</p> : null}
      {someRemaining ? <p>A ficha ainda tem quantidades em apuração.</p> : null}
    </article></div>
  </Dialog>;
}
