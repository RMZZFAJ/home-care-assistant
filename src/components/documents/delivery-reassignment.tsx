"use client";

import { useEffect, useState, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { documentPatientName } from "@/lib/documents/presentation";
import { formatBrazilDate } from "@/lib/receipt";
import type { DeliveryReassignmentContext, SupplyDocument } from "@/types/documents";

type Replacement = { recipientId: string; reason: string };

const shiftTime = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function DeliveryReassignment({
  data, patientName, latestVersion, busy, blocked, uncertain, conflict, error,
  opener, onSubmit, onRefresh, onRecover, onClose,
}: {
  data: SupplyDocument;
  patientName: string;
  latestVersion: number;
  busy: boolean;
  blocked: boolean;
  uncertain: boolean;
  conflict: boolean;
  error: string;
  opener: RefObject<HTMLButtonElement | null>;
  onSubmit: (body: Replacement, version: number) => void;
  onRefresh: () => void;
  onRecover: () => void;
  onClose: () => void;
}) {
  const [reference, setReference] = useState<DeliveryReassignmentContext | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [person, setPerson] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: DeliveryReassignmentContext }>(
      "/api/documents/" + data.id + "?reference=recipient-reassignment",
      undefined, controller.signal,
    ).then(({ data: context }) => {
      if (controller.signal.aborted) return;
      if (context.documentId !== data.id) throw new Error("Não foi possível verificar as opções desta ficha.");
      setReference(context);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setReadError(cause instanceof Error ? cause.message : "Não foi possível consultar pessoas e plantões.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [data.id, attempt]);

  const selectedId = person ?? reference?.suggestedId;
  const selected = reference?.people.find(candidate => candidate.id === selectedId);
  const outdated = Boolean(reference && reference.version < latestVersion);
  const candidates = (reference?.people ?? []).map(candidate => {
    const active = reference?.shifts.find(shift => shift.professionalId === candidate.id);
    const upcoming = reference?.nextShifts.find(shift => shift.professionalId === candidate.id);
    const detail = active ? "Em plantão · " + shiftTime.format(new Date(active.startsAt)) + " às " + shiftTime.format(new Date(active.endsAt))
      : upcoming ? "Próximo plantão · " + formatBrazilDate(upcoming.startsAt) + " até " + formatBrazilDate(upcoming.endsAt)
        : "Disponível para designação";
    return { ...candidate, detail, priority: active ? 0 : upcoming ? 1 : 2 };
  }).sort((first, second) => first.priority - second.priority);

  return <RecordDrawer
    modal exitDialog title="Trocar recebedor"
    kicker={(data.kind ?? "ENT") + " · " + documentPatientName(data.canonical_snapshot, patientName)}
    subtitle="Escolha uma pessoa habilitada para conferir esta entrega."
    popupClassName="hca-reassignment-dialog" onClose={onClose}
    restoreFocusTo={opener.current} busy={busy} uncertainOutcome={uncertain}
    hasUnsavedChanges={person !== null || Boolean(reason.trim())}
    footer={close => <>
      <ActionButton disabled={busy} onClick={close}>Voltar</ActionButton>
      <ActionButton variant="primary"
        disabled={busy || !uncertain && (blocked || conflict || outdated || loading || !selected || reason.trim().length < 3)}
        onClick={uncertain ? onRecover : () => {
          if (reference && selected) onSubmit({ recipientId: selected.id, reason: reason.trim() }, reference.version);
        }}>
        {uncertain ? "Conferir resultado" : "Confirmar novo recebedor"}
      </ActionButton>
    </>}
  >
    <div className="hca-reassignment">
      {error ? <Notice error>{error}</Notice> : null}
      {loading ? <Notice>Consultando pessoas elegíveis e plantões…</Notice> : null}
      {readError ? <Notice error>{readError}</Notice> : null}
      {conflict || outdated ? <Notice>A referência mudou. Consulte novamente as pessoas e revise sua escolha.</Notice> : null}
      {blocked ? <Notice>A troca está indisponível para este acesso ou para a situação atual da ficha.</Notice> : null}
      {conflict || outdated || readError ? <ActionButton disabled={loading || uncertain || blocked} onClick={() => {
        setLoading(true);
        setReadError("");
        setReference(null);
        setAttempt(value => value + 1);
        onRefresh();
      }}>Atualizar pessoas e plantões</ActionButton> : null}
      {reference ? <>
        <DefinitionGrid items={[
          { label: "Entrega", value: data.code },
          { label: "Recebedor atual", value: reference.currentRecipientName ?? "Pessoa designada no documento" },
          { label: "Expedição", value: formatBrazilDate(reference.dispatchedAt) },
          { label: "Conferência", value: "Ainda não registrada" },
        ]} />
        <fieldset className="hca-reassignment-people" disabled={uncertain || blocked || conflict || outdated}>
          <legend>Quem vai conferir?</legend>
          {!candidates.length ? <Notice>Nenhuma outra pessoa está habilitada. Procure a administração para verificar os vínculos.</Notice> : null}
          {person && !selected ? <Notice>A pessoa escolhida não está mais habilitada para esta entrega. Escolha outra opção.</Notice> : null}
          {candidates.map(candidate => <button
            key={candidate.id}
            type="button"
            className="hca-reassignment-person"
            aria-pressed={candidate.id === selected?.id}
            onClick={() => setPerson(candidate.id)}
          >
            <span className="hca-reassignment-initials" aria-hidden="true">{candidate.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span>
            <span className="hca-reassignment-person-copy">
              <strong>{candidate.name}</strong>
              <span><Icon name={candidate.priority < 2 ? "clock" : "user"} width={14} height={14} />{candidate.detail}</span>
            </span>
            <span className="hca-reassignment-choice" aria-hidden="true">{candidate.id === selected?.id ? <Icon name="check" width={13} height={13} /> : null}</span>
          </button>)}
        </fieldset>
      </> : null}
      <FormField label="Motivo da troca" required>
        <TextAreaField rows={2} minLength={3} maxLength={1000} required
          placeholder="Explique por que outra pessoa fará a conferência."
          value={reason} disabled={uncertain || blocked} onChange={event => setReason(event.target.value)} />
      </FormField>
      <p className="hca-muted">A troca será registrada no histórico. A pessoa selecionada será avisada conforme as regras de comunicação. As quantidades expedidas permanecem as mesmas.</p>
    </div>
  </RecordDrawer>;
}

export function DeliveryReassignmentResult({ data, onClose }: { data: SupplyDocument; onClose: () => void }) {
  const selection = data.workflow_data.recipientSelection;
  const previous = data.workflow_data.recipientSelectionHistory?.findLast(item => item.recipientId === selection?.previousRecipientId)
    ?? (data.transfer?.declaration.recipient.id === selection?.previousRecipientId ? data.transfer?.declaration.recipient : null);
  const previousName = previous && ("recipientName" in previous ? previous.recipientName : previous.name);
  return <Dialog open success title="Recebedor atualizado"
    subtitle={`${selection?.recipientName ?? "A pessoa indicada"} fará a conferência da ${data.code}. As quantidades expedidas foram preservadas.`}
    onClose={onClose}
    footer={<ActionButton variant="primary" onClick={onClose}>Voltar à ficha</ActionButton>}>
    <DefinitionGrid items={[
      { label: "Recebedor anterior", value: previousName || "Nome não preservado" },
      { label: "Novo recebedor", value: selection?.recipientName },
      { label: "Motivo", value: selection?.reason, wide: true },
    ]} />
  </Dialog>;
}
