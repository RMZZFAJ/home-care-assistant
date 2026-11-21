"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { z } from "zod";
import { ActionButton, DefinitionGrid, FormField, Pill, SelectField, TextAreaField } from "@/components/ui/controls";
import { WizardQuantityInput } from "@/components/forms/wizard-material-tools";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { documentPatientName } from "@/lib/documents/presentation";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { SupplyDocument } from "@/types/documents";
import { DeliveryConsumptionReferences } from "./delivery-cancellation";

export type CancellationAction = "cancel" | "consent_cancel" | "refuse_cancellation" | "withdraw_cancellation";

const previewQuantity = z.string().regex(/^\d+(?:\.\d{1,6})?$/).max(40);
const previewSchema = z.object({ data: z.object({
  documentId: z.uuid(), patientId: z.uuid(), version: z.number().int().positive(), sourceReady: z.boolean(),
  lines: z.array(z.object({
    lineId: z.uuid(), acceptedQuantity: previewQuantity, availableConsumedQuantity: previewQuantity, minimumReturnQuantity: previewQuantity,
  })).max(1000),
}) });

function receiverName(data: SupplyDocument) {
  const receipt = data.events.find(event => event.action === "ent.receive");
  const author = data.workflow_data.acceptedBy ?? receipt?.actorId;
  const selection = data.workflow_data.recipientSelection;
  if (selection?.recipientId === author && selection?.recipientName) return selection.recipientName;
  const declared = data.transfer?.declaration.recipient;
  if (declared?.id === author && declared?.name) return declared.name;
  const outcome = data.deliveryCancellation?.request.outcome;
  if (outcome?.actorId === author && outcome?.actorName) return outcome.actorName;
  return "Recebedor original";
}

export function DeliveryCancellationDecision({ action, data, patientName, actor, busy, blocked, uncertain, error, conflict, finalFocus, focusRevision, onAction, onCompare, onSubmit, onRecover, onClose, onCloseUncertain }: {
  action: CancellationAction;
  data: SupplyDocument;
  patientName: string;
  actor: string;
  busy: boolean;
  blocked: boolean;
  uncertain: boolean;
  error: string;
  conflict?: ReactNode;
  finalFocus: RefObject<HTMLButtonElement | null>;
  focusRevision: number;
  onAction: (action: "consent_cancel" | "refuse_cancellation") => void;
  onCompare: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
  onRecover: () => void;
  onClose: () => void;
  onCloseUncertain: () => void;
}) {
  const requesting = action === "cancel";
  const withdrawing = action === "withdraw_cancellation";
  const consenting = action === "consent_cancel";
  const [reason, setReason] = useState("");
  const [returns, setReturns] = useState<Record<string, string>>({});
  const [checkedReference, setCheckedReference] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const hintId = useId();
  const fieldsRef = useRef<HTMLDivElement>(null);
  const previousFocusRevisionRef = useRef(focusRevision);
  useEffect(() => {
    if (focusRevision === previousFocusRevisionRef.current) return;
    previousFocusRevisionRef.current = focusRevision;
    const fields = fieldsRef.current;
    const first = consenting ? fields?.querySelector("input[inputmode=decimal]") : null;
    const target = first ?? fields?.querySelector("textarea");
    if (target instanceof HTMLElement) target.focus();
  }, [focusRevision, consenting]);
  const reference = data.deliveryCancellation;
  const request = reference?.request;
  const { id, care_recipient_id: patientId, version } = data;
  const decodePreview = useCallback((value: unknown) => {
    const parsed = previewSchema.safeParse(value);
    if (!parsed.success || parsed.data.data.documentId !== id || parsed.data.data.patientId !== patientId || parsed.data.data.version !== version ||
      new Set(parsed.data.data.lines.map(line => line.lineId)).size !== parsed.data.data.lines.length)
      throw new Error("A referência do pedido mudou. Consulte a situação atual da ficha.");
    return parsed.data.data;
  }, [id, patientId, version]);
  const preview = useScopedRead(requesting ? `/api/documents/${id}?reference=cancellation-preview` : null, `${version}:${focusRevision}`, decodePreview);
  useOperationActivity(preview.loading, { title: "Consultando saldo da entrega" });
  const previewData = !preview.loading && !preview.error && preview.data?.sourceReady ? preview.data : null;
  const showSources = consenting && !blocked && reference?.sourceReady && reference.sourceAccess !== false && reference.referenceHash;
  const transit = quantity(reference?.unresolvedTransit ?? "0").gt(0);
  const rows = showSources ? reference.lines.map(line => {
    const value = returns[line.lineId] ?? (line.minimumReturnQuantity === undefined ? "" : formatQuantity(line.minimumReturnQuantity));
    const valid = validQuantity(value, line.quantityDecimals ?? 6, true) &&
      quantity(value).gte(line.minimumReturnQuantity ?? "0") && quantity(value).lte(line.acceptedQuantity);
    return { line, value, valid };
  }) : [];
  const checkKey = JSON.stringify([reference?.referenceHash, reference?.request.id, data.version, focusRevision, rows.map(row => row.value)]);
  const physicallyChecked = checkKey === checkedReference;
  const consentReady = Boolean(showSources) && !transit && rows.length === data.lines.length && rows.every(row => row.valid) && physicallyChecked;
  const canSubmit = !blocked && reason.trim().length >= 3 &&
    (requesting || request?.status === "pending" && (!consenting || consentReady));

  const close = () => {
    if (uncertain) onCloseUncertain();
    else if (reason.trim() || Object.keys(returns).length || physicallyChecked) setDiscard(true);
    else onClose();
  };

  const receiver = receiverName(data);
  const patient = documentPatientName(data.canonical_snapshot, patientName);
  const title = requesting ? "Solicitar cancelamento" : withdrawing ? "Retirar pedido de cancelamento" : "Analisar pedido de cancelamento";
  const submitLabel = requesting ? "Enviar pedido" : withdrawing ? "Retirar pedido" : consenting ? "Consentir e registrar devolução" : "Recusar cancelamento";
  const subtitle = requesting ? "Confira o pedido antes de encaminhá-lo ao recebedor original."
    : withdrawing ? "O recebimento e o estoque serão preservados." : "A decisão será registrada com a autoria de quem recebeu.";

  function submit() {
    if (!canSubmit) return;
    const body = { reason: reason.trim() };
    if (requesting) onSubmit(body);
    else if (request && consenting && consentReady) onSubmit({
      ...body, requestId: request.id, referenceHash: reference?.referenceHash,
      lines: rows.map(({ line, value }) => ({ lineId: line.lineId, returnQuantity: quantity(value).toFixed() })),
    });
    else if (request && !consenting) onSubmit({ ...body, requestId: request.id });
  }

  return <>
    <Dialog open title={title} kicker={[data.code, patient].filter(Boolean).join(" · ")} subtitle={subtitle}
      popupClassName="hca-cancellation-dialog" keyboardScrollable
      closeDisabled={busy} finalFocus={finalFocus} onClose={close} footer={<>
        <ActionButton variant="quiet" disabled={busy || uncertain} onClick={close}><Icon name="back" />{withdrawing ? "Manter pedido" : "Voltar à ficha"}</ActionButton>
        <ActionButton variant={requesting && !uncertain ? "danger" : "primary"} disabled={busy || !uncertain && !canSubmit}
          onClick={uncertain ? onRecover : submit}>
          <Icon name={requesting ? "send" : "check"} />{uncertain ? "Conferir resultado" : submitLabel}
        </ActionButton>
      </>}>
      <div ref={fieldsRef} className="hca-delivery-receipt hca-cancellation-decision">
        {error ? <Notice error>{error}</Notice> : null}
        {conflict}
        {requesting ? <>
          <DefinitionGrid items={[
            { label: "Ficha", value: data.code },
            { label: "Paciente", value: patient },
            { label: "Responsável pela ação", value: actor },
            { label: "Referência", value: formatBrazilDate(data.events.find(item => item.version === data.version)?.createdAt ?? data.created_at) },
          ]} />
          <ul className="hca-cancellation-checklist">
            <li><Icon name="check" /><div><strong>Recebimento já registrado</strong><p>{receiver} registrou a conferência desta ficha.</p></div></li>
          </ul>
          {!preview.loading && preview.error ? <Notice>Referências indisponíveis. <ActionButton compact onClick={preview.refresh}>Consultar novamente</ActionButton></Notice> : null}
          {data.lines.map(line => {
            const source = previewData?.lines.find(item => item.lineId === line.id && quantity(item.acceptedQuantity).eq(line.accepted_quantity));
            return <article className="hca-receipt-line" key={line.id}>
              <header><h3>{line.name_snapshot}</h3></header>
              <DefinitionGrid className="hca-cancellation-quantities" items={[
                { label: "Recebido", value: formatQuantity(line.accepted_quantity, line.unit_snapshot) },
                { label: "Consumo confirmado disponível", value: source ? formatQuantity(source.availableConsumedQuantity, line.unit_snapshot) : "Indisponível" },
                { label: "Saldo para conferir", value: source ? formatQuantity(source.minimumReturnQuantity, line.unit_snapshot) : "Indisponível" },
              ]} />
            </article>;
          })}
          <Notice><strong>A decisão pertence a quem recebeu</strong><p>O pedido será encaminhado ao recebedor original. A devolução e o cancelamento dependem de sua decisão pessoal e da conferência física.</p></Notice>
        </> : request ? <DefinitionGrid items={[
          { label: "Pedido por", value: request.requestedName ?? "Nome histórico não preservado" },
          { label: "Recebimento por", value: receiver },
          { label: "Data do pedido", value: formatBrazilDate(request.requestedAt) },
          { label: "Motivo do pedido", value: request.reason },
        ]} /> : null}
        {!requesting && !withdrawing && !uncertain ? <FormField label="Sua decisão">
          <SelectField value={action} disabled={busy || blocked} onChange={event => {
            setCheckedReference(null);
            onAction(event.currentTarget.value === "consent_cancel" ? "consent_cancel" : "refuse_cancellation");
          }}>
            <option value="consent_cancel">Consentir com o cancelamento</option>
            <option value="refuse_cancellation">Recusar o cancelamento</option>
          </SelectField>
        </FormField> : null}
        {!requesting && !withdrawing && !reference?.sourceReady && !conflict && !uncertain ?
          <ActionButton disabled={busy} onClick={onCompare}>Atualizar referências</ActionButton> : null}
        {consenting && !uncertain ? <>
          {transit ? <Notice>Concilie o material ainda em trânsito antes de consentir.</Notice> : null}
          {!showSources && !conflict ? <Notice error>As fontes de consumo estão indisponíveis para esta decisão. Atualize as referências ou registre sua recusa.</Notice> : null}
          {rows.map(({ line, value, valid }) => <article className="hca-receipt-line" key={line.lineId}>
            <header className="hca-cancellation-material">
              <span className="hca-wizard-material-icon"><Icon name="box" /></span>
              <div><h3>{line.name}</h3><p>{line.unit}</p></div>
            </header>
            <DefinitionGrid className="hca-cancellation-quantities" items={[
              { label: "Recebido", value: formatQuantity(line.acceptedQuantity, line.unit) },
              { label: "Consumo disponível", value: formatQuantity(line.availableConsumedQuantity, line.unit) },
              { label: "Retorno esperado", value: formatQuantity(line.minimumReturnQuantity, line.unit) },
            ]} />
            {quantity(line.acceptedQuantity).gt(0) ? <FormField label={<>Quantidade fisicamente devolvida<span className="sr-only"> · {line.name}</span></>}
              error={valid ? undefined : "Informe o retorno físico dentro do saldo e da precisão deste material."}>
              <WizardQuantityInput unit={line.unit} inputMode="decimal" maxLength={64} value={value} readOnly={busy || blocked} onChange={event => {
                const next = event.currentTarget.value;
                setReturns(previous => ({ ...previous, [line.lineId]: next }));
                setCheckedReference(null);
              }} />
            </FormField> : null}
            {valid ? <p>Consumo a referenciar: {formatQuantity(quantity(line.acceptedQuantity).minus(quantity(value)).toFixed(), line.unit)}</p> : null}
            <DeliveryConsumptionReferences line={line} inDecision />
          </article>)}
          {rows.length && !transit ? <label className="hca-purchase-switch hca-reconcile-assessment">
            <span><strong>Conferi a devolução física e as referências de consumo</strong><small id={hintId}>Meu consentimento ficará registrado com a minha autoria.</small></span>
            <input type="checkbox" role="switch" aria-label="Conferi a devolução física e as referências de consumo" aria-describedby={hintId}
              checked={physicallyChecked} disabled={busy || blocked || rows.some(row => !row.valid)}
              onChange={event => {
                const checked = event.currentTarget.checked;
                if (checked) setReturns(Object.fromEntries(rows.map(row => [row.line.lineId, row.value])));
                setCheckedReference(checked ? checkKey : null);
              }} />
          </label> : null}
          {showSources && !conflict ? <ActionButton compact disabled={busy} onClick={onCompare}>Conferir fontes atuais da conciliação</ActionButton> : null}
        </> : null}
        {uncertain ? <Notice>Confira o resultado antes de enviar outra decisão.</Notice> :
          <FormField label={requesting ? "Motivo do pedido de cancelamento" : withdrawing ? "Motivo da retirada" : "Motivo da sua decisão"} required>
            <TextAreaField rows={2} maxLength={1000} value={reason} readOnly={busy}
              onChange={event => setReason(event.currentTarget.value)} />
          </FormField>}
      </div>
    </Dialog>
    {discard ? <Dialog open title="Sair sem concluir?" onClose={() => setDiscard(false)} footer={<>
      <ActionButton onClick={() => setDiscard(false)}>Voltar ao preenchimento</ActionButton>
      <ActionButton variant="primary" onClick={onClose}>Sair e descartar</ActionButton>
    </>}><p>Os valores digitados nesta decisão serão descartados.</p></Dialog> : null}
  </>;
}

export function DeliveryCancellationStatusDialog({ data, patientName, onClose, onWithdraw, onHistory }: {
  data: SupplyDocument;
  patientName: string;
  onClose: () => void;
  onWithdraw?: () => void;
  onHistory: () => void;
}) {
  const reference = data.deliveryCancellation;
  if (!reference) return null;
  const { request } = reference;
  const pending = request.status === "pending" && !reference.historical;
  const declined = request.status === "refused";
  const consented = request.status === "consented";
  const patient = documentPatientName(data.canonical_snapshot, patientName);
  const title = pending ? "Aguardando decisão do recebedor" : declined ? "Cancelamento não autorizado"
    : consented ? "Ficha cancelada" : reference.historical ? "Pedido anterior preservado" : "Pedido retirado";
  const subtitle = pending ? "O pedido foi encaminhado a quem registrou o recebimento." :
    declined || request.status === "withdrawn" ? "O recebimento e o estoque permanecem como estavam." :
      consented ? "A devolução real e o consumo confirmado permanecem registrados na ficha." : undefined;
  return <Dialog open title={title} kicker={[data.code, patient].filter(Boolean).join(" · ")} subtitle={subtitle}
    success={consented} popupClassName="hca-cancellation-dialog" keyboardScrollable onClose={onClose} footer={<>
    <ActionButton variant="quiet" onClick={onClose}><Icon name="back" />Voltar à ficha</ActionButton>
    {pending && onWithdraw ? <ActionButton onClick={onWithdraw}><Icon name="undo" />Retirar pedido</ActionButton> : null}
    {declined ? <ActionButton onClick={onHistory}><Icon name="history" />Consultar histórico</ActionButton> : null}
  </>}>
    <div className="hca-delivery-receipt hca-cancellation-decision">
      {!consented ? <DefinitionGrid items={[
        { label: "Ficha", value: data.code },
        { label: "Paciente", value: patient },
      ]} /> : null}
      <div className="hca-follow-up-prior hca-cancellation-context-row"><Icon name="user" /><div><h3>{receiverName(data)}</h3><p>Recebedor original</p></div>
        {pending ? <Pill tone="warning">Decisão pendente</Pill> : declined ? <Pill tone="danger">Recusado</Pill> : null}
      </div>
      <DefinitionGrid items={[
        { label: "Solicitado por", value: request.requestedName ?? "Nome histórico não preservado" },
        { label: "Data do pedido", value: formatBrazilDate(request.requestedAt) },
        { label: "Motivo", value: request.reason, wide: true },
        ...(request.outcome ? [{ label: "Decisão de", value: request.outcome.actorName ?? "Nome histórico não preservado" },
          { label: "Data da decisão", value: formatBrazilDate(request.outcome.recordedAt) },
          ...(declined ? [] : [{ label: "Motivo da decisão", value: request.outcome.reason, wide: true }])] : []),
      ]} />
      {declined && request.outcome ? <div className="hca-follow-up-prior hca-cancellation-context-row">
        <Icon name="comment" />
        <div><h3>Motivo da recusa</h3><p className="whitespace-pre-wrap">{request.outcome.reason}</p></div>
      </div> : null}
      {pending ? <Notice><strong>Estoque preservado</strong><p>O pedido não movimenta materiais. A decisão cabe ao recebedor original.</p></Notice> : null}
      {consented ? reference.lines.map(line => <article className="hca-receipt-line" key={line.lineId}>
        <h3>{line.name}</h3>
        <DefinitionGrid items={[
          { label: "Devolução real registrada", value: formatQuantity(line.returnQuantity, line.unit) },
          { label: "Consumo confirmado preservado", value: formatQuantity(line.consumedQuantity, line.unit) },
        ]} />
      </article>) : null}
    </div>
  </Dialog>;
}
