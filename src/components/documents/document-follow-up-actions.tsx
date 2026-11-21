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
import type { DocumentDecisionIntention } from "@/lib/validation/document-decisions";
import { DocumentDecisionFailure, useDocumentDecision } from "./use-document-decision";
import { DocumentArchivePolicy } from "./document-archive-policy";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "./document-operation-failure-dialog";

type Purpose = "complete" | "reopen";
type Blocker = FollowUpReference["blockers"][number];
type BlockerAction = { id: string; label: string; open: (returnToReview: () => void) => void };
type FollowUpBlockerActions = Partial<Record<Blocker, BlockerAction[]>>;
type FollowUpFailure = { outcome: "rejected" | "uncertain"; description: string; cause?: unknown };
const uncertainDecision = "A ação ainda está sem confirmação. Confira o resultado da mesma tentativa.";
const rejectedDecision = "A conferência confirmou que esta tentativa não alterou a ficha.";
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
  id, patientId, kind, code, patientName, actor, userId, canComplete, canReopen, cancelled, disabled, preservedFacts, onUpdated, onShowMaterials, onCompleteAndArchive, reviewControl, blockerActions,
}: {
  id: string; patientId: string; kind: FollowUpReference["kind"]; code: string; patientName: string; actor: string; userId: string;
  canComplete: boolean; canReopen: boolean; cancelled: boolean; disabled: boolean;
  preservedFacts?: ReactNode;
  onUpdated: () => void;
  onShowMaterials: () => void;
  onCompleteAndArchive?: () => void;
  reviewControl?: Ref<(opener: HTMLButtonElement | null) => void>;
  blockerActions?: FollowUpBlockerActions;
}) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const continueToArchiveRef = useRef(false);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<FollowUpFailure | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState<"close" | "materials" | null>(null);
  const [result, setResult] = useState<FollowUpReference | null>(null);
  const [resolving, setResolving] = useState(false);
  const decision = useDocumentDecision({ userId, documentId: id, domain: "lifecycle", action: purpose ?? "none" });
  const uncertain = decision.uncertain || failure?.outcome === "uncertain";
  const activeFailure = failure ?? (decision.uncertain && decision.recoveryMessage
    ? { outcome: "uncertain" as const, description: uncertainDecision } : null);
  const exhausted = recoveryAttempts >= operationRecoveryLimit;

  const readReference = useCallback((value: unknown) => {
    const raw = value && typeof value === "object" && "data" in value ? value.data : null;
    const row = followUpReference.parse(raw);
    if (row.documentId !== id || row.patientId !== patientId || row.kind !== kind)
      throw new Error("A referência recebida pertence a outro contexto. Consulte a ficha novamente.");
    return row;
  }, [id, patientId, kind]);
  const reference = useScopedRead(purpose && !result && !resolving ? `/api/documents/${id}?reference=follow-up` : null, userId, readReference);
  useOperationActivity(reference.loading && Boolean(purpose) && !activeFailure, { title: "Conferindo situação da ficha" });

  const facts = reference.loading || reference.error || conflict ? null : reference.data;
  const reopening = purpose === "reopen";
  const alreadyCompleted = !reopening && facts?.state === "completed" && !uncertain;
  const unavailable = disabled || !facts || (reopening ? !facts.canReopen : !facts.canComplete || facts.blockers.length > 0);
  const canSend = Boolean(purpose && !unavailable && (!reopening || reason.trim().length >= 3));
  const title = reopening ? "Reverter decisão e reabrir" : "Revisar e concluir";
  const confirmation = reopening ? "Reabrir acompanhamento" : "Concluir";

  function open(next: Purpose, opener: HTMLButtonElement | null) {
    if (disabled || (next === "complete" ? !canComplete : !canReopen)) return;
    openerRef.current = opener;
    continueToArchiveRef.current = false;
    setReason("");
    setFailure(null);
    setRecoveryAttempts(0);
    setConflict(false);
    reference.refresh();
    setPurpose(next);
  }
  useImperativeHandle(reviewControl, () => (opener: HTMLButtonElement | null) => open("complete", opener));

  function closeReview(destination: "close" | "materials" = "close") {
    if (uncertain || (!alreadyCompleted && reason.trim())) {
      setDiscard(destination);
      return;
    }
    setPurpose(null);
    setFailure(null);
    if (destination === "materials") onShowMaterials();
  }

  function resolve(action: BlockerAction) {
    if (decision.busy || uncertain) return;
    setResolving(true);
    action.open(() => {
      reference.refresh();
      setFailure(null);
      setConflict(false);
      setResolving(false);
    });
  }

  function reviewCurrentReference() {
    reference.refresh();
    setConflict(false);
    setFailure(null);
  }

  async function submit(archiveNext = false, recovering = false) {
    if (!purpose || decision.busy || (recovering && exhausted) || (!uncertain && (!canSend || !facts))) return;
    if (!uncertain) continueToArchiveRef.current = archiveNext;
    if (recovering) setRecoveryAttempts(attempts => attempts + 1);
    setFailure(null);
    try {
      const verify = (value: unknown, intention: DocumentDecisionIntention) => {
        const row = readReference({ data: value });
        if (row.state !== (reopening ? "reopened" : "completed") || row.lastAct?.actorId !== userId ||
          row.version <= intention.expectedVersion)
          throw new Error("Confira o resultado da decisão antes de tentar novamente.");
      };
      const outcome = uncertain ? await decision.checkPrevious(verify) : await decision.execute({
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
      if (outcome?.state === "not_applied") {
        setFailure({ outcome: "rejected", description: rejectedDecision });
      } else if (uncertain && !outcome) {
        setFailure({ outcome: "uncertain", description: uncertainDecision });
      }
    } catch (error) {
      const cause = error instanceof DocumentDecisionFailure ? error.cause : error;
      if (error instanceof DocumentDecisionFailure && error.outcome === "not_applied") {
        const referenceChanged = cause instanceof ApiError && cause.status === 409;
        setConflict(referenceChanged);
        setFailure({ outcome: "rejected", cause, description: referenceChanged
          ? `${rejectedDecision} Confira a situação atual antes de confirmar novamente.` : rejectedDecision });
      } else setFailure({ outcome: "uncertain", cause, description: uncertainDecision });
    }
  }

  const prior = facts?.decision;
  const priorLabel = facts?.state === "cancelled" ? "Cancelada" : "Concluída";
  const closeResult = () => { setResult(null); setPurpose(null); onUpdated(); };
  const recoveryAction = !uncertain && (conflict || reference.error) ? { label: "Consultar referência atual", onClick: reviewCurrentReference }
    : !exhausted && (uncertain || canSend) ? {
      label: uncertain ? "Conferir resultado" : "Tentar novamente",
      onClick: () => void submit(continueToArchiveRef.current, true),
    } : undefined;
  return <>
    {canReopen ? <ActionButton disabled={disabled} onClick={event => open("reopen", event.currentTarget)}>
      <Icon name="refresh" />{cancelled ? "Reverter cancelamento" : "Reverter conclusão"}
    </ActionButton> : canComplete && !reviewControl ? <ActionButton disabled={disabled} onClick={event => open("complete", event.currentTarget)}>
      <Icon name="check" />Revisar conclusão
    </ActionButton> : null}
    <Dialog open={Boolean(purpose) && !result && !resolving && !activeFailure} keyboardScrollable title={title} kicker={`${code} · ${patientName}`}
      subtitle={alreadyCompleted ? "A ficha já foi concluída." : reopening ? "A reversão ficará vinculada à decisão anterior." :
        facts?.blockers.length ? "Resolva as pendências antes de concluir a ficha." : "Confira as condições da ficha antes de concluir."}
      finalFocus={openerRef} closeDisabled={decision.busy} onClose={() => closeReview()} footer={<>
        <ActionButton variant="quiet" disabled={decision.busy} onClick={() => closeReview()}><Icon name="back" />Voltar à ficha</ActionButton>
        {!reopening && onCompleteAndArchive && !uncertain && !alreadyCompleted ? <ActionButton disabled={decision.busy || !canSend} onClick={() => void submit(true)}>
          <Icon name="archive" />Concluir e arquivar
        </ActionButton> : null}
        {!alreadyCompleted ? <ActionButton variant="primary" disabled={decision.busy || (uncertain ? exhausted : !canSend)} onClick={() => void submit(false, uncertain)}>
          <Icon name={reopening ? "undo" : "check"} />{uncertain ? "Conferir resultado" : confirmation}
        </ActionButton> : null}
      </>}>
      <div className="hca-delivery-receipt hca-document-follow-up">
        {decision.recoveryMessage && !uncertain ? <Notice>{decision.recoveryMessage}</Notice> : null}
        {reference.error || conflict ? <Notice error>
          {reference.error || "A ficha mudou durante a revisão. Confira a nova referência."}
          <ActionButton compact onClick={reviewCurrentReference}>Consultar referência atual</ActionButton>
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
              ? <li key={check} className="hca-follow-up-blocker"><Icon name="alert" />
                {blockerActions?.[check]?.length ? <div>
                  <strong>{labels[check][1]}</strong>
                  <p>{labels[check][2]}</p>
                  <div className="hca-follow-up-resolve">{blockerActions[check].map(action =>
                    <ActionButton key={action.id} compact disabled={decision.busy || uncertain} onClick={() => resolve(action)}>{action.label}</ActionButton>)}</div>
                </div> : <details>
                  <summary><strong>{labels[check][1]}</strong></summary>
                  <p>{labels[check][2]}</p>
                  <ActionButton compact disabled={decision.busy || uncertain} onClick={() => closeReview("materials")}>Consultar ficha</ActionButton>
                </details>}</li>
              : <li key={check}><Icon name="check-circle" /><strong>{labels[check][0]}</strong></li>)}
            <li><Icon name="check-circle" /><div><strong>Histórico preservado</strong><p>Vínculos, decisões e movimentações continuam disponíveis.</p></div></li>
          </>}
        </ul> : null}
        {alreadyCompleted && reason.trim() ? <Notice>A observação abaixo ficou apenas nesta revisão. Para registrá-la na ficha, publique um andamento.</Notice> : null}
        {facts && !alreadyCompleted && (reopening ? !facts.canReopen : !facts.canComplete) ?
          <Notice>A decisão está indisponível para esta ficha e este acesso.</Notice> : null}
        {reopening ? <>{preservedFacts}<Notice><strong>Sem movimentação automática</strong><p>O estoque permanece como está. Uma nova movimentação exige seu próprio registro.</p></Notice></> : null}
        {!uncertain ? <FormField label={reopening ? "Justificativa da reversão" : "Observação da conclusão"} required={reopening}>
          <TextAreaField rows={3} maxLength={1000} readOnly={decision.busy || alreadyCompleted} value={reason} onChange={event => setReason(event.currentTarget.value)} />
        </FormField> : null}
        {facts && !reopening && !unavailable && !uncertain && !decision.busy ?
          <DocumentArchivePolicy id={id} patientId={patientId} version={facts.version} /> : null}
      </div>
    </Dialog>
    {discard ? <Dialog open title={uncertain ? "Sair antes de conferir o resultado?" : "Sair sem concluir?"}
      onClose={() => setDiscard(null)} footer={<>
        <ActionButton onClick={() => setDiscard(null)}>Voltar à revisão</ActionButton>
        <ActionButton variant="primary" onClick={() => {
          setDiscard(null);
          setPurpose(null);
          setFailure(null);
          if (discard === "materials") onShowMaterials();
          else if (uncertain) onUpdated();
        }}>
          {uncertain ? "Voltar à ficha" : "Sair e descartar"}
        </ActionButton>
      </>}><p>{uncertain ? "A referência da tentativa continua disponível para conferência." : "Os valores digitados nesta decisão serão descartados."}</p></Dialog> : null}
    {purpose && activeFailure && !discard && !result && !decision.busy ? <DocumentOperationFailureDialog
      {...activeFailure} title={reopening ? "Não foi possível reabrir o acompanhamento" : "Não foi possível concluir a ficha"}
      operation={confirmation} fallbackCode="DECISAO_SEM_CONFIRMACAO" attempts={recoveryAttempts}
      onClose={() => closeReview()} closeLabel="Voltar à ficha" action={recoveryAction}
      exhaustedMessage={exhausted ? "Copie os detalhes para a supervisão e volte à ficha." : undefined} /> : null}
    {result ? <Dialog open success title={result.state === "reopened" ? "Acompanhamento reaberto" : "Ficha concluída"}
      subtitle={result.state === "reopened" ? "A decisão anterior e a justificativa permanecem no histórico." : "A conclusão foi registrada na ficha."}
      onClose={closeResult} footer={<ActionButton variant="primary" onClick={closeResult}>Voltar à ficha</ActionButton>}>
      {result.state === "reopened" ? <><p>As movimentações de estoque foram preservadas.</p>{preservedFacts}</> : null}
    </Dialog> : null}
  </>;
}
