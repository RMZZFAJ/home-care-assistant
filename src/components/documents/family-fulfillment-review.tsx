"use client";

import { useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react";
import { z } from "zod";
import { ActionButton, DefinitionGrid, FormField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { DocumentSection } from "@/components/ui/model-section";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { ApiError } from "@/lib/client/api";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { deliveryNeedRequest } from "@/lib/documents/delivery-receipt";
import { awaitsDeliveryNeed, currentDeliveryNeed, deliveryTransit, familyReviewDescription, linkedDeliveryNeed } from "@/lib/documents/family-fulfillment";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument, SupplyLine } from "@/types/documents";
import { useDocumentDecision } from "./use-document-decision";
import { DeliveryMaterialMenu } from "./delivery-material-menu";
import { canAssessDeliveryNeed } from "./delivery-reconciliation";
import { RelatedDocument } from "./related-document";

const decisionSchema = z.enum(["partial", "complete"]);
const packetSchema = z.object({
  key: z.uuid(), lineId: z.uuid(), decision: decisionSchema, reason: z.string().max(1000), version: z.number().int().positive(),
}).strict();
const resultSchema = z.object({
  key: z.uuid(), documentId: z.uuid(), lineId: z.uuid(), decision: decisionSchema, reviewId: z.uuid(), recordedAt: z.string(), recovered: z.boolean(),
});
type Decision = z.infer<typeof decisionSchema>;
type Packet = z.infer<typeof packetSchema>;

// This RPC checks its official receipt before rejecting a stale reference.
const definitiveRejection = (cause: unknown) => cause instanceof ApiError && cause.status === 409 && cause.code === "VERSION_CONFLICT";

type Opening = { lineId: string; onClose: () => void; opener: RefObject<HTMLButtonElement | null> };
type Outcome = { line?: SupplyLine; decision?: Decision; reason: string };
export type OpenPendingFamilyReview = (lineId: string, onClose: () => void) => boolean;

export function canRecordFamilyReview(data: SupplyDocument, context: WorkspaceContext, readOnly: boolean) {
  return !readOnly && ["confirmed", "disputed"].includes(data.status) && canAssessDeliveryNeed(data, context);
}

export function FamilyFulfillmentReview({ data, context, onReviewed, readOnly = false, opening, reviewControl }: {
  data: SupplyDocument; context: WorkspaceContext; onReviewed: () => void; readOnly?: boolean; opening?: Opening;
  reviewControl?: Ref<OpenPendingFamilyReview>;
}) {
  const storageKey = `hca:fulfillment-review:${context.userId}:${data.id}`;
  const [pending, setPending] = useState<Packet | null>(() => {
    try {
      const parsed = packetSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  });
  const [lineId, setLineId] = useState<string | null>(opening?.lineId ?? pending?.lineId ?? null);
  const [requesting, setRequesting] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [discard, setDiscard] = useState(false);
  const [version, setVersion] = useState(data.version);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const returnToReviewRef = useRef<(() => void) | null>(null);
  const family = useCommandIntent<Packet, unknown>((raw, packet) => {
    const result = resultSchema.safeParse(raw);
    return result.success && result.data.key === packet.key && result.data.documentId === data.id &&
      result.data.lineId === packet.lineId && result.data.decision === packet.decision;
  }, definitiveRejection);
  const team = useDocumentDecision({ userId: context.userId, documentId: data.id, domain: "supply", action: "request_fulfillment_review" });

  useOperationActivity(family.busy, {
    title: "Registrando avaliação familiar",
    steps: [{ label: "Preservando o recebimento confirmado", icon: "truck" }, { label: "Conferindo a avaliação", icon: "check" }],
  });

  const samePatient = context.patient?.id === data.care_recipient_id;
  const canRecoverFamily = samePatient && can(context, "ent.read");
  const active = !readOnly && samePatient && ["confirmed", "disputed"].includes(data.status);
  const eligible = canRecordFamilyReview(data, context, readOnly);
  const receiver = active && data.payload.destination === "CARE_TEAM" && context.userId === data.recipient_id && can(context, "ent.receive");
  const lines = data.lines.filter(line => data.workflow_data.acceptedAt && linkedDeliveryNeed(data, line));
  const selected = lines.find(line => line.id === lineId);
  const latest = selected ? currentDeliveryNeed(data, selected) : undefined;
  const request = selected ? deliveryNeedRequest(selected.metadata) : null;
  const previous = latest?.decision ?? selected?.family_fulfillment;
  const received = Boolean(selected && quantity(selected.accepted_quantity).gt(0));
  const choice = decision ?? (received ? previous : "partial");
  const stale = data.version !== version;
  const ready = !stale && reason.trim().length >= 3 && Boolean(selected && (requesting ? receiver : eligible && choice && (choice !== "complete" || received)));
  const busy = family.busy || team.busy;
  const recoveringTeam = requesting && team.uncertain;
  const recoveringFamily = !requesting && Boolean(pending && pending.lineId === lineId);
  const otherPending = !requesting && pending && !recoveringFamily;

  function show(line: SupplyLine, teamRequest = false) {
    setLineId(line.id);
    setRequesting(teamRequest);
    setDecision(null);
    setReason("");
    setError("");
    setVersion(data.version);
  }

  useImperativeHandle(reviewControl, () => (requestedId, onClose) => {
    if (!eligible || busy || lineId || outcome) return false;
    const requested = lines.find(line => line.id === requestedId);
    if (!requested || !awaitsDeliveryNeed(data, requested)) return false;

    returnToReviewRef.current = onClose;
    openerRef.current = null;
    show(requested);
    if (pending) setLineId(pending.lineId);
    return true;
  });

  function close() {
    setDiscard(false);
    setLineId(null);
    const returnToReview = returnToReviewRef.current;
    returnToReviewRef.current = null;
    if (returnToReview) {
      returnToReview();
      return;
    }
    opening?.onClose();
    const trigger = (opening?.opener ?? openerRef).current;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    }));
  }

  function requestClose() {
    if (busy) return;
    if (!recoveringFamily && !recoveringTeam && (reason.trim() || decision)) setDiscard(true);
    else close();
  }

  function clearFamilyPacket() {
    setPending(null);
    try { sessionStorage.removeItem(storageKey); } catch { /* The result is known in this session. */ }
  }

  async function recordFamily() {
    if (busy || otherPending || (pending ? !canRecoverFamily : !selected || !choice || !ready)) return;
    const recovering = Boolean(pending);
    const packet = pending ?? { key: crypto.randomUUID(), lineId: selected!.id, decision: choice!, reason: reason.trim(), version };
    setPending(packet);
    try { sessionStorage.setItem(storageKey, JSON.stringify(packet)); } catch { /* The open dialog retains the command. */ }
    try {
      if (family.uncertain) await family.recover();
      else await family.send(`/api/documents/${data.id}/fulfillment-review`, packet);
      clearFamilyPacket();
      setLineId(null);
      setOutcome({ line: selected, decision: packet.decision, reason: packet.reason });
      onReviewed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a avaliação.");
      if (definitiveRejection(cause) || !recovering && cause instanceof ApiError && cause.status >= 400 && cause.status < 500) clearFamilyPacket();
    }
  }

  async function recordTeam() {
    if (busy || !team.uncertain && (!ready || !selected)) return;
    try {
      const result = team.uncertain ? await team.checkPrevious() : await team.execute({
        domain: "supply", action: "request_fulfillment_review", expectedVersion: data.version,
        body: { lineId: selected!.id, reason: reason.trim() },
      });
      if (result?.state === "applied") {
        setLineId(null);
        const statement = result.intention.body.reason;
        setOutcome({ line: lines.find(line => line.id === result.intention.body.lineId), reason: typeof statement === "string" ? statement : reason.trim() });
        onReviewed();
      } else if (result?.state === "not_applied") {
        setError("A conferência confirmou que nada foi alterado. Você pode tentar novamente nesta tela.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a solicitação.");
    }
  }

  if (!lines.length && !pending && !team.recoveryMessage) return null;
  let title = "Reavaliar necessidade";
  if (recoveringFamily) title = "Verificar avaliação familiar";
  else if (requesting) title = "Pedir reavaliação";
  else if (latest) title = "Rever atendimento do item";
  const shortage = Boolean(selected && quantity(selected.accepted_quantity).lt(selected.quantity));
  const hasTransit = Boolean(selected && deliveryTransit(selected).gt(0));
  const subtitle = requesting ? "Conte à família por que o material recebido é insuficiente."
    : latest ? "Atualize sua avaliação sobre a quantidade recebida."
      : shortage && !hasTransit ? "A quantidade já foi conciliada. A família ainda precisa avaliar se o recebimento atende à necessidade."
        : request ? "A equipe pediu uma nova avaliação. Confira o motivo e registre a decisão da família."
          : "Confira a quantidade recebida e registre se ela atende à necessidade.";
  const linkedRequests = data.linkedRequisitions?.filter(link => selected?.requisitionItemIds.some(id => link.itemIds.includes(id))) ?? [];
  const origins = data.originDocuments?.filter(origin => origin.type === "REQ" && selected?.product_id &&
    origin.productIds.includes(selected.product_id) && !linkedRequests.some(link => link.id === origin.documentId)) ?? [];

  return (<>
    {!opening ? <DocumentSection title="Atendimento da necessidade" icon="users">
      <div className="hca-delivery-receipt">
        {team.recoveryMessage ? <Notice>{team.recoveryMessage}</Notice> : null}
        {lines.map(line => {
          const review = currentDeliveryNeed(data, line);
          const waiting = awaitsDeliveryNeed(data, line);
          const received = quantity(line.accepted_quantity).gt(0);
          return <article className="hca-receipt-line" key={line.id}>
            <header><div>
              <h3>{line.name_snapshot}</h3>
              <p>{formatQuantity(line.accepted_quantity, line.unit_snapshot)} recebidos de {formatQuantity(line.quantity, line.unit_snapshot)} expedidos</p>
            </div></header>
            {waiting ? <Notice>Aguardando avaliação familiar.</Notice> : null}
            {review ? <p>{familyReviewDescription(review)}</p> : null}
            {!waiting && !review ? <p>{line.family_fulfillment === "complete" ? "Necessidade integralmente atendida" : "Atendimento parcial · necessidade em aberto"}</p> : null}
            {eligible && (waiting || received) ? <ActionButton disabled={Boolean(pending) || busy} onClick={event => { openerRef.current = event.currentTarget; show(line); }}>
              {review ? "Rever atendimento de " : "Avaliar suficiência de "}{line.name_snapshot}
            </ActionButton> : null}
            {receiver && !waiting && !line.metadata.issueOpen && quantity(line.accepted_quantity).eq(line.quantity) ? <ActionButton disabled={Boolean(pending) || team.uncertain || busy} onClick={event => { openerRef.current = event.currentTarget; show(line, true); }}>
              Pedir reavaliação de {line.name_snapshot}
            </ActionButton> : null}
          </article>;
        })}
        {pending && !lineId ? <ActionButton onClick={() => { setRequesting(false); setLineId(pending.lineId); }}>Verificar avaliação pendente</ActionButton> : null}
        {team.uncertain && !lineId ? <ActionButton onClick={() => { setRequesting(true); setLineId(lines[0]?.id ?? data.id); }}>Verificar pedido de reavaliação</ActionButton> : null}
      </div>
    </DocumentSection> : null}
      <Dialog open={Boolean(lineId)} title={title} subtitle={subtitle} keyboardScrollable closeDisabled={busy}
        finalFocus={opening?.opener ?? openerRef} onClose={requestClose} footer={<>
        <ActionButton disabled={busy} onClick={requestClose}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={busy || Boolean(otherPending) || !ready && !(recoveringFamily && canRecoverFamily) && !recoveringTeam} onClick={() => {
          setError("");
          if (requesting) void recordTeam(); else void recordFamily();
        }}>
          {recoveringFamily ? "Verificar mesma avaliação" : requesting ? (recoveringTeam ? "Verificar pedido" : "Enviar pedido") : "Registrar avaliação"}
        </ActionButton>
      </>}>
        <div className="hca-delivery-receipt hca-delivery-need">
          {error ? <Notice error>{error}</Notice> : null}
          {otherPending ? <Notice>Existe uma confirmação pendente para outro material desta entrega. Abra a entrega para verificá-la.</Notice> : null}
          {stale && !recoveringFamily && !recoveringTeam ? <Notice>A entrega mudou durante a avaliação. Confira os dados atuais antes de registrar.
            <ActionButton compact onClick={() => setVersion(data.version)}>Usar dados atuais</ActionButton></Notice> : null}
          {selected ? <article className="hca-receipt-line">
            <header><div><h3>{selected.name_snapshot}</h3>
              <p>{formatQuantity(selected.accepted_quantity, selected.unit_snapshot)} recebidos</p></div>
              <DeliveryMaterialMenu data={data} line={selected} disabled={busy} />
            </header>
            {request && !requesting && !latest ? <figure className="hca-need-reason">
              <figcaption><Icon name="note" />Motivo informado pela equipe</figcaption>
              <blockquote>{request.reason}</blockquote>
              <small>{request.actorName} · {formatBrazilDate(request.recordedAt)}</small>
            </figure> : null}
            {!requesting && shortage && !latest ? <div className="hca-need-reason">
              <strong>Recebimento menor</strong>
              <p>Das {formatQuantity(selected.quantity, selected.unit_snapshot)} expedidas, {formatQuantity(selected.accepted_quantity)} foram recebidas.</p>
              <p>{hasTransit ? "Parte do material ainda está em apuração." : "A conciliação foi registrada e a necessidade ainda aguarda avaliação familiar."}</p>
            </div> : null}
            {recoveringFamily || recoveringTeam ? <Notice>O resultado ainda precisa ser verificado. O conteúdo e a identidade desta avaliação foram preservados.</Notice> : <>
              {!requesting ?
                <fieldset className="hca-need-options">
                  <legend>A necessidade foi atendida?</legend>
                  <ActionButton aria-pressed={choice === "partial"} onClick={() => setDecision("partial")}>Parcialmente</ActionButton>
                  <ActionButton aria-pressed={choice === "complete"} disabled={!received} onClick={() => setDecision("complete")}>Integralmente</ActionButton>
                </fieldset> : null}
              <FormField label={requesting ? "Motivo do pedido" : "Justificativa da avaliação"} required>
                <TextAreaField rows={2} maxLength={1000} value={reason}
                  placeholder={requesting ? "Descreva o que ainda falta." : "Explique sua decisão sobre o material."}
                  onChange={event => setReason(event.currentTarget.value)} />
              </FormField>
            </>}
            <details className="hca-receipt-fold hca-need-history">
              <summary><Icon name="history" />Avaliação e fichas de origem<Icon name="down" /></summary>
              <DefinitionGrid items={[
                { label: "Avaliação anterior", value: previous === "complete" ? "Integralmente suprida" : "Parcialmente suprida" },
                { label: "Recebimento confirmado", value: formatQuantity(selected.accepted_quantity, selected.unit_snapshot) },
                ...(latest ? [{ label: "Registrada por", value: `${latest.actorName} · ${formatBrazilDate(latest.recordedAt)}`, wide: true }] : []),
                ...(latest?.reason ? [{ label: "Justificativa anterior", value: latest.reason, wide: true }] : []),
              ]} />
              <div className="hca-need-links">
                {linkedRequests.map(link => <RelatedDocument key={link.id} id={link.id} label={link.code} compact />)}
                {origins.map(link => <RelatedDocument key={link.documentId} id={link.documentId} label={link.code} compact />)}
                {data.code ? <RelatedDocument id={data.id} type="ENT" label={data.code} compact /> : null}
              </div>
            </details>
          </article> : null}
        </div>
      </Dialog>
      {discard ? <Dialog open title="Sair sem registrar a avaliação?" onClose={() => setDiscard(false)} footer={<>
        <ActionButton onClick={() => setDiscard(false)}>Voltar ao preenchimento</ActionButton>
        <ActionButton variant="primary" onClick={close}>Sair e descartar</ActionButton>
      </>}><p>As alterações deste preenchimento serão descartadas.</p></Dialog> : null}
      {outcome ? <Dialog open success title={outcome.decision ? "Avaliação registrada" : "Reavaliação solicitada"}
        subtitle={outcome.decision ? "O recebimento confirmado foi preservado." : "A família poderá avaliar se o recebido atende à necessidade."}
        finalFocus={opening?.opener ?? openerRef} onClose={() => { setOutcome(null); close(); }}
        footer={<ActionButton variant="primary" onClick={() => { setOutcome(null); close(); }}>Voltar à ficha</ActionButton>}>
        <DefinitionGrid items={[
          ...(outcome.line ? [{ label: "Material", value: outcome.line.name_snapshot }, { label: "Recebimento confirmado", value: formatQuantity(outcome.line.accepted_quantity, outcome.line.unit_snapshot) }] : []),
          { label: "Necessidade", value: outcome.decision === "complete" ? "Integralmente suprida" : outcome.decision === "partial" ? "Parcialmente suprida" : "Revisão familiar pendente" },
          { label: "Justificativa", value: outcome.reason, wide: true },
        ]} />
      </Dialog> : null}
  </>);
}
