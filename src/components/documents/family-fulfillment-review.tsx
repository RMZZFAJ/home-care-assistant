"use client";

import { useState } from "react";
import { z } from "zod";
import { ActionButton, FormField, TextAreaField } from "@/components/ui/controls";
import { DocumentSection } from "@/components/ui/model-section";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { ApiError } from "@/lib/client/api";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { deliveryNeedRequest } from "@/lib/documents/delivery-receipt";
import { awaitsDeliveryNeed, currentDeliveryNeed, familyReviewDescription, linkedDeliveryNeed } from "@/lib/documents/family-fulfillment";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument, SupplyLine } from "@/types/documents";
import { useDocumentDecision } from "./use-document-decision";
import { DeliveryMaterialMenu } from "./delivery-material-menu";
import { canAssessDeliveryNeed } from "./delivery-reconciliation";

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

export function FamilyFulfillmentReview({ data, context, onReviewed }: {
  data: SupplyDocument; context: WorkspaceContext; onReviewed: () => void;
}) {
  const storageKey = `hca:fulfillment-review:${context.userId}:${data.id}`;
  const [pending, setPending] = useState<Packet | null>(() => {
    try {
      const parsed = packetSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  });
  const [lineId, setLineId] = useState<string | null>(pending?.lineId ?? null);
  const [requesting, setRequesting] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
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

  const active = context.patient?.id === data.care_recipient_id && ["confirmed", "disputed"].includes(data.status);
  const eligible = active && canAssessDeliveryNeed(data, context);
  const receiver = active && data.payload.destination === "CARE_TEAM" && context.userId === data.recipient_id && can(context, "ent.receive");
  const lines = data.lines.filter(line => data.workflow_data.acceptedAt && linkedDeliveryNeed(data, line));
  const selected = lines.find(line => line.id === lineId);
  const latest = selected ? currentDeliveryNeed(data, selected) : undefined;
  const request = selected ? deliveryNeedRequest(selected.metadata) : null;
  const effective = latest?.decision ?? selected?.family_fulfillment;
  const reasonRequired = requesting || Boolean(decision && decision !== effective);
  const ready = Boolean(selected && (requesting ? receiver : eligible && decision) && (!reasonRequired || reason.trim().length >= 3));
  const busy = family.busy || team.busy;
  const recoveringTeam = requesting && team.uncertain;
  const recoveringFamily = !requesting && Boolean(pending);

  function show(line: SupplyLine, teamRequest = false) {
    setLineId(line.id);
    setRequesting(teamRequest);
    setDecision(null);
    setReason("");
    setError("");
  }

  function clearFamilyPacket() {
    setPending(null);
    try { sessionStorage.removeItem(storageKey); } catch { /* The result is known in this session. */ }
  }

  async function recordFamily() {
    if (busy || !pending && (!selected || !decision || !ready)) return;
    const recovering = Boolean(pending);
    const packet = pending ?? { key: crypto.randomUUID(), lineId: selected!.id, decision: decision!, reason: reason.trim(), version: data.version };
    setPending(packet);
    try { sessionStorage.setItem(storageKey, JSON.stringify(packet)); } catch { /* The open dialog retains the command. */ }
    try {
      if (family.uncertain) await family.recover();
      else await family.send(`/api/documents/${data.id}/fulfillment-review`, packet);
      clearFamilyPacket();
      setLineId(null);
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

  return (
    <DocumentSection title="Atendimento da necessidade" icon="users">
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
            {eligible && (waiting || received) ? <ActionButton disabled={Boolean(pending) || busy} onClick={() => show(line)}>
              {review ? "Rever atendimento de " : "Avaliar suficiência de "}{line.name_snapshot}
            </ActionButton> : null}
            {receiver && !waiting && !line.metadata.issueOpen && quantity(line.accepted_quantity).eq(line.quantity) ? <ActionButton disabled={Boolean(pending) || team.uncertain || busy} onClick={() => show(line, true)}>
              Pedir reavaliação de {line.name_snapshot}
            </ActionButton> : null}
          </article>;
        })}
        {pending && !lineId ? <ActionButton onClick={() => { setRequesting(false); setLineId(pending.lineId); }}>Verificar avaliação pendente</ActionButton> : null}
        {team.uncertain && !lineId ? <ActionButton onClick={() => { setRequesting(true); setLineId(lines[0]?.id ?? data.id); }}>Verificar pedido de reavaliação</ActionButton> : null}
      </div>
      <Dialog open={Boolean(lineId)} title={title} closeDisabled={busy} onClose={() => setLineId(null)} footer={<>
        <ActionButton disabled={busy} onClick={() => setLineId(null)}>Voltar à ficha</ActionButton>
        <ActionButton variant="primary" disabled={busy || !ready && !recoveringFamily && !recoveringTeam} onClick={() => {
          setError("");
          if (requesting) void recordTeam(); else void recordFamily();
        }}>
          {recoveringFamily ? "Verificar mesma avaliação" : requesting ? (recoveringTeam ? "Verificar pedido" : "Pedir reavaliação") : "Registrar avaliação familiar"}
        </ActionButton>
      </>}>
        <div className="hca-delivery-receipt hca-delivery-need">
          {error ? <Notice error>{error}</Notice> : null}
          {selected ? <article className="hca-receipt-line">
            <header><div><h3>{selected.name_snapshot}</h3>
              <p>{formatQuantity(selected.accepted_quantity, selected.unit_snapshot)} recebidos</p></div>
              <DeliveryMaterialMenu data={data} line={selected} disabled={busy} />
            </header>
            {request && !requesting ? <figure className="hca-need-reason">
              <figcaption>Motivo informado pela equipe</figcaption>
              <blockquote>{request.reason}</blockquote>
              <small>{request.actorName} · {formatBrazilDate(request.recordedAt)}</small>
            </figure> : null}
            {!requesting && quantity(selected.accepted_quantity).lt(selected.quantity) ? <div className="hca-need-reason">
              <strong>Recebimento menor</strong>
              <p>Das {formatQuantity(selected.quantity, selected.unit_snapshot)} expedidas, {formatQuantity(selected.accepted_quantity)} foram recebidas.</p>
            </div> : null}
            {recoveringFamily || recoveringTeam ? <Notice>O resultado ainda precisa ser verificado. O conteúdo e a identidade desta avaliação foram preservados.</Notice> : <>
              {requesting ? <p>Conte à família por que o material recebido é insuficiente.</p> :
                <fieldset className="hca-need-options">
                  <legend>A necessidade foi atendida?</legend>
                  <ActionButton aria-pressed={decision === "partial"} onClick={() => setDecision("partial")}>Parcialmente</ActionButton>
                  <ActionButton aria-pressed={decision === "complete"} disabled={!quantity(selected.accepted_quantity).gt(0)} onClick={() => setDecision("complete")}>Integralmente</ActionButton>
                </fieldset>}
              <FormField label={requesting ? "Motivo do pedido" : "Justificativa da avaliação"} required={reasonRequired}>
                <TextAreaField rows={2} maxLength={1000} value={reason}
                  placeholder={requesting ? "Descreva o que ainda falta." : "Explique sua decisão sobre o material."}
                  onChange={event => setReason(event.currentTarget.value)} />
              </FormField>
            </>}
          </article> : null}
        </div>
      </Dialog>
    </DocumentSection>
  );
}
