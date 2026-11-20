"use client";

import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { ActionButton, DefinitionGrid, FormField, Pill, TextAreaField } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { ApiError, Notice } from "@/components/workspace";
import { followUpReference, type FollowUpReference } from "@/lib/documents/follow-up-lifecycle";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { DocumentDecisionFailure, useDocumentDecision } from "./use-document-decision";
import { DocumentArchivePolicy } from "./document-archive-policy";

type Purpose = "complete" | "reopen";
type Blocker = FollowUpReference["blockers"][number];
const checks: Record<FollowUpReference["kind"], Blocker[]> = {
  REQ: ["req_fulfillment", "req_delivery"],
  COM: ["com_approval", "com_expectation", "com_arrival", "com_validation"],
  ENT: ["ent_receipt", "ent_difference", "ent_need"],
  DEV: ["ent_receipt", "ent_difference"],
};
const labels: Record<Blocker, [ready: string, blocked: string, instruction: string]> = {
  req_fulfillment: ["Materiais atendidos", "Atendimento da requisição pendente", "Confira a suficiência dos materiais na requisição."],
  req_delivery: ["Entregas conferidas", "Entrega vinculada ainda em apuração", "Abra a entrega vinculada e confira as diferenças do recebimento."],
  com_approval: ["Itens e quantidades autorizados", "A avaliação da compra está pendente", "Confira a decisão de aprovação da compra."],
  com_expectation: ["Aquisição registrada ou encerrada", "Ainda há expectativa de aquisição", "Registre a aquisição ou decida sobre a expectativa restante."],
  com_arrival: ["Chegadas esclarecidas", "Material adquirido ainda sem chegada válida", "Confira as parcelas de chegada e a situação dos materiais."],
  com_validation: ["Chegadas conferidas", "Uma chegada aguarda revisão", "Revise ou corrija as parcelas de chegada pendentes."],
  ent_receipt: ["Recebimento registrado", "Conferência pessoal pendente", "A pessoa designada deve registrar o recebimento."],
  ent_difference: ["Quantidades conciliadas", "Diferença física em apuração", "Confira o saldo em trânsito, o excedente ou a divergência registrada."],
  ent_need: ["Necessidade avaliada", "Aguardando decisão familiar", "A família habilitada deve avaliar a suficiência do material."],
};

export function DocumentFollowUpActions({
  id, patientId, kind, code, patientName, actor, userId, canComplete, canReopen, cancelled, disabled, preservedFacts, onUpdated, onShowMaterials, onCompleteAndArchive, reviewControl,
}: {
  id: string; patientId: string; kind: FollowUpReference["kind"]; code: string; patientName: string; actor: string; userId: string;
  canComplete: boolean; canReopen: boolean; cancelled: boolean; disabled: boolean;
  preservedFacts?: ReactNode;
  onUpdated: () => void;
  onShowMaterials: () => void;
  onCompleteAndArchive?: () => void;
  reviewControl?: Ref<(opener: HTMLButtonElement | null) => void>;
}) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const continueToArchiveRef = useRef(false);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState<"close" | "materials" | null>(null);
  const [result, setResult] = useState<FollowUpReference | null>(null);
  const decision = useDocumentDecision({ userId, documentId: id, domain: "lifecycle", action: purpose ?? "none" });

  const readReference = useCallback((value: unknown) => {
    const raw = value && typeof value === "object" && "data" in value ? value.data : null;
    const row = followUpReference.parse(raw);
    if (row.documentId !== id || row.patientId !== patientId || row.kind !== kind)
      throw new Error("A referência recebida pertence a outro contexto. Consulte a ficha novamente.");
    return row;
  }, [id, patientId, kind]);
  const reference = useScopedRead(purpose && !result ? `/api/documents/${id}?reference=follow-up` : null, userId, readReference);
  useOperationActivity(reference.loading && Boolean(purpose), { title: "Conferindo situação da ficha" });

  const facts = reference.loading || reference.error || conflict ? null : reference.data;
  const reopening = purpose === "reopen";
  const unavailable = disabled || !facts || (reopening ? !facts.canReopen : !facts.canComplete || facts.blockers.length > 0);
  const canSend = Boolean(purpose && !unavailable && (!reopening || reason.trim().length >= 3));
  const title = reopening ? "Reverter decisão e reabrir" : "Revisar e concluir";
  const confirmation = reopening ? "Reabrir acompanhamento" : "Concluir";

  function open(next: Purpose, opener: HTMLButtonElement | null) {
    if (disabled || (next === "complete" ? !canComplete : !canReopen)) return;
    openerRef.current = opener;
    continueToArchiveRef.current = false;
    setReason("");
    setError("");
    setConflict(false);
    reference.refresh();
    setPurpose(next);
  }
  useImperativeHandle(reviewControl, () => (opener: HTMLButtonElement | null) => open("complete", opener));

  function closeReview(destination: "close" | "materials" = "close") {
    if (decision.uncertain || reason.trim()) {
      setDiscard(destination);
      return;
    }
    setPurpose(null);
    if (destination === "materials") onShowMaterials();
  }

  async function submit(archiveNext = false) {
    if (!purpose || decision.busy || !decision.uncertain && (!canSend || !facts)) return;
    if (!decision.uncertain) continueToArchiveRef.current = archiveNext;
    setError("");
    try {
      const verify = (value: unknown) => {
        const row = readReference({ data: value });
        if (row.state !== (reopening ? "reopened" : "completed") || row.lastAct?.actorId !== userId ||
          (facts && row.version <= facts.version))
          throw new Error("Confira o resultado da decisão antes de tentar novamente.");
      };
      const outcome = decision.uncertain ? await decision.checkPrevious(verify) : await decision.execute({
        domain: "lifecycle", action: purpose, body: { reason: reason.trim() },
        expectedVersion: facts!.version, referenceHash: facts!.referenceHash,
      }, verify);
      if (outcome?.state === "applied") {
        const completed = readReference({ data: outcome.result });
        if (completed.state === "completed" && continueToArchiveRef.current && onCompleteAndArchive) {
          setPurpose(null);
          onUpdated();
          onCompleteAndArchive();
        } else setResult(completed);
      }
      if (outcome?.state === "not_applied") setError("A conferência confirmou que esta tentativa não alterou a ficha.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível confirmar a decisão.");
      if (failure instanceof DocumentDecisionFailure && failure.outcome === "not_applied" &&
        failure.cause instanceof ApiError && failure.cause.status === 409) setConflict(true);
    }
  }

  const prior = facts?.decision;
  const priorLabel = facts?.state === "cancelled" ? "Cancelada" : "Concluída";
  const closeResult = () => { setResult(null); setPurpose(null); onUpdated(); };
  return <>
    {canReopen ? <ActionButton disabled={disabled} onClick={event => open("reopen", event.currentTarget)}>
      <Icon name="refresh" />{cancelled ? "Reverter cancelamento" : "Reverter conclusão"}
    </ActionButton> : canComplete && !reviewControl ? <ActionButton disabled={disabled} onClick={event => open("complete", event.currentTarget)}>
      <Icon name="check" />Revisar conclusão
    </ActionButton> : null}
    <Dialog open={Boolean(purpose) && !result} title={title} kicker={`${code} · ${patientName}`}
      subtitle={reopening ? "A reversão ficará vinculada à decisão anterior." :
        facts?.blockers.length ? "Resolva as pendências antes de concluir a ficha." : "Confira as condições da ficha antes de concluir."}
      finalFocus={openerRef} closeDisabled={decision.busy} onClose={() => closeReview()} footer={<>
        <ActionButton variant="quiet" disabled={decision.busy} onClick={() => closeReview()}><Icon name="back" />Voltar à ficha</ActionButton>
        {!reopening && onCompleteAndArchive && !decision.uncertain ? <ActionButton disabled={decision.busy || !canSend} onClick={() => void submit(true)}>
          <Icon name="archive" />Concluir e arquivar
        </ActionButton> : null}
        <ActionButton variant="primary" disabled={decision.busy || !decision.uncertain && !canSend} onClick={() => void submit()}>
          <Icon name={reopening ? "undo" : "check"} />{decision.uncertain ? "Conferir resultado" : confirmation}
        </ActionButton>
      </>}>
      <div className="hca-delivery-receipt hca-document-follow-up">
        {error || decision.recoveryMessage ? <Notice error={Boolean(error)}>{error || decision.recoveryMessage}</Notice> : null}
        {reference.error || conflict ? <Notice error>
          {reference.error || "A ficha mudou durante a revisão. Confira a nova referência."}
          <ActionButton compact onClick={() => { reference.refresh(); setConflict(false); setError(""); }}>Consultar referência atual</ActionButton>
        </Notice> : null}
        <DefinitionGrid items={[
          { label: "Ficha", value: code }, { label: "Paciente", value: patientName },
          { label: "Responsável pela ação", value: actor },
          { label: "Referência", value: prior ? formatBrazilDate(prior.recordedAt) : facts ? "Versão " + facts.version : "Em consulta" },
        ]} />
        {reopening && prior ? <div className="hca-follow-up-prior">
          <Icon name="history" />
          <div><h3>Decisão que será revertida</h3>
            <p>{priorLabel} · {formatBrazilDate(prior.recordedAt)} · {prior.actorName ?? "Sistema"}</p>
            {prior.reason ? <p>{prior.reason}</p> : null}
          </div>
          <Pill>{priorLabel}</Pill>
        </div> : null}
        {facts ? <ul className="hca-cancellation-checklist">
          {reopening ? <>
            <li><Icon name="check-circle" /><div><strong>Acompanhamento reaberto</strong><p>A ficha volta a permitir as ações de acompanhamento.</p></div></li>
            <li><Icon name="check-circle" /><div><strong>Decisão anterior preservada</strong><p>A justificativa e a autoria permanecem no histórico.</p></div></li>
          </> : <>
            {(facts.physicalStatus === "cancelled" ? [] : checks[kind]).map(check => facts.blockers.includes(check)
              ? <li key={check} className="hca-follow-up-blocker"><Icon name="alert" /><details>
                <summary><strong>{labels[check][1]}</strong></summary>
                <p>{labels[check][2]}</p>
                <ActionButton compact disabled={decision.busy || decision.uncertain} onClick={() => closeReview("materials")}>Consultar ficha</ActionButton>
              </details></li>
              : <li key={check}><Icon name="check-circle" /><strong>{labels[check][0]}</strong></li>)}
            <li><Icon name="check-circle" /><div><strong>Histórico preservado</strong><p>Vínculos, decisões e movimentações continuam disponíveis.</p></div></li>
          </>}
        </ul> : null}
        {facts && (reopening ? !facts.canReopen : !facts.canComplete) ?
          <Notice>A decisão está indisponível para esta ficha e este acesso.</Notice> : null}
        {reopening ? <>{preservedFacts}<Notice><strong>Sem movimentação automática</strong><p>O estoque permanece como está. Uma nova movimentação exige seu próprio registro.</p></Notice></> : null}
        {!decision.uncertain ? <FormField label={reopening ? "Justificativa da reversão" : "Observação da conclusão"} required={reopening}>
          <TextAreaField rows={3} maxLength={1000} readOnly={decision.busy} value={reason} onChange={event => setReason(event.currentTarget.value)} />
        </FormField> : null}
        {facts && !reopening && !unavailable && !decision.uncertain && !decision.busy ?
          <DocumentArchivePolicy id={id} patientId={patientId} version={facts.version} /> : null}
      </div>
    </Dialog>
    {discard ? <Dialog open title={decision.uncertain ? "Sair antes de conferir o resultado?" : "Sair sem concluir?"}
      onClose={() => setDiscard(null)} footer={<>
        <ActionButton onClick={() => setDiscard(null)}>Voltar à revisão</ActionButton>
        <ActionButton variant="primary" onClick={() => {
          setDiscard(null);
          setPurpose(null);
          if (discard === "materials") onShowMaterials();
          else if (decision.uncertain) onUpdated();
        }}>
          {decision.uncertain ? "Voltar à ficha" : "Sair e descartar"}
        </ActionButton>
      </>}><p>{decision.uncertain ? "A referência da tentativa continua disponível para conferência." : "Os valores digitados nesta decisão serão descartados."}</p></Dialog> : null}
    {result ? <Dialog open success title={result.state === "reopened" ? "Acompanhamento reaberto" : "Ficha concluída"}
      subtitle={result.state === "reopened" ? "A decisão anterior e a justificativa permanecem no histórico." : "A conclusão foi registrada na ficha."}
      onClose={closeResult} footer={<ActionButton variant="primary" onClick={closeResult}>Voltar à ficha</ActionButton>}>
      {result.state === "reopened" ? <><p>As movimentações de estoque foram preservadas.</p>{preservedFacts}</> : null}
    </Dialog> : null}
  </>;
}
