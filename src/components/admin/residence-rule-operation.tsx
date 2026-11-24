"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { z } from "zod";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { api, ApiError } from "@/lib/client/api";
import { residenceRulePointer, verifyResidenceRule, type ResidenceRuleCommand, type ResidenceRuleResult, type ResidenceRuleScope } from "@/lib/validation/reviewed-residence-rule";

export const residenceRuleEndpoint = "/api/admin/residence-rules";
const retainedAttempt = z.strictObject({ pointer: residenceRulePointer, retries: z.number().int().min(0).max(operationRecoveryLimit) });
type Pending = z.infer<typeof retainedAttempt>;

export function useResidenceRuleOperation(userId: string, scope: ResidenceRuleScope) {
  const { patientId, mode, purpose } = scope;
  const storage = `hca:residence-rule:${userId}:${patientId}:${mode}:${purpose}`;
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<{ cause: unknown; uncertain: boolean; key: string } | null>(null);
  const [result, setResult] = useState<ResidenceRuleResult | null>(null);
  const [conflictingReference, setConflictingReference] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);
  const lifetimeRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetimeRef.current = controller;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      try {
        const saved = retainedAttempt.safeParse(JSON.parse(sessionStorage.getItem(storage) ?? "null")).data;
        if (saved && saved.pointer.patientId === patientId && saved.pointer.mode === mode && saved.pointer.purpose === purpose) setPending(saved);
      } catch { /* A blocked or malformed session store cannot restore an attempt. */ }
      setReady(true);
    });
    return () => controller.abort();
  }, [storage, patientId, mode, purpose]);
  useOperationActivity(busy, { title: "Conferindo a configuração da residência" });

  function keep(value: Pending | null) {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(storage, JSON.stringify(value));
      else sessionStorage.removeItem(storage);
    } catch { /* The exact reference also stays in this open workspace. */ }
  }

  async function run(intent: ResidenceRuleCommand["intent"]) {
    const signal = lifetimeRef.current?.signal;
    if (!signal || signal.aborted || !ready || runningRef.current || result) return;
    if (intent ? pending !== null : !pending || pending.retries >= operationRecoveryLimit) return;
    const attempt = pending ? { ...pending, retries: pending.retries + 1 }
      : { pointer: { ...scope, key: crypto.randomUUID() }, retries: 0 };
    runningRef.current = true;
    keep(attempt);
    setBusy(true);
    setFailure(null);
    try {
      const command = { ...attempt.pointer, intent };
      const reply = verifyResidenceRule(command, await api<unknown>(residenceRuleEndpoint, command, signal));
      if (signal.aborted) return;
      keep(null);
      setResult(reply);
    } catch (cause) {
      if (signal.aborted) return;
      const definite = intent !== null && cause instanceof ApiError && cause.status >= 400 && cause.status < 500
        && cause.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED"].includes(cause.code ?? "");
      if (definite) keep(null);
      if (intent && cause instanceof ApiError && cause.status === 409) setConflictingReference(intent.referenceHash);
      setFailure({ cause, uncertain: !definite, key: attempt.pointer.key });
    } finally {
      runningRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  return {
    busy, blocked: !ready || busy || Boolean(pending) || Boolean(result),
    pending, failure, result, conflictingReference, submit: run, recover: () => run(null),
    openRecovery: () => pending && setFailure({ cause: null, uncertain: true, key: pending.pointer.key }),
    closeFailure: () => setFailure(null), closeResult: () => setResult(null),
  };
}

export function ResidenceRuleFeedback({ operation, threshold, onFinish, focus }: {
  operation: ReturnType<typeof useResidenceRuleOperation>; threshold: boolean;
  onFinish: () => void; focus: RefObject<HTMLElement | null>;
}) {
  const { pending, failure, result, busy } = operation;
  const closed = result?.state === "closed";
  const proposed = result?.outcome?.kind === "proposal";
  const title = closed ? "Tentativa encerrada" : proposed ? "Proposta registrada" : threshold ? "Limite registrado" : "Destinatário registrado";
  const description = closed ? "A consulta confirmou que esta tentativa não alterou a configuração."
    : proposed ? "Outro administrador da residência precisa decidir a proposta antes de a alteração entrar em vigor."
      : threshold ? "O limite passa a acompanhar somente o estoque da custódia selecionada. O saldo foi preservado."
        : "Os avisos seguem as regras do evento e os canais autorizados. O envio externo depende de destino verificado, consentimento e serviço disponível.";
  function finish() { operation.closeResult(); onFinish(); }
  return <>
    {pending && !busy && !failure ? <FeedbackBanner tone="warning">
      Há uma configuração aguardando confirmação. <ActionButton onClick={operation.openRecovery}>Conferir resultado</ActionButton>
    </FeedbackBanner> : null}
    {failure && !busy ? <DocumentOperationFailureDialog
      title={failure.uncertain ? "A resposta da configuração não chegou" : "Não foi possível registrar a configuração"}
      description={failure.uncertain ? "Consulte a tentativa original para saber se a alteração foi registrada."
        : failure.cause instanceof Error ? failure.cause.message : "Confira a configuração atual da residência."}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.cause}
      operation={threshold ? "Configurar limite de estoque" : "Configurar destinatário"}
      fallbackCode="REGRA_RESIDENCIA_NAO_CONFIRMADA" attemptReference={failure.key}
      attempts={pending?.retries ?? 0} guidance="A referência identifica o envio confirmado nesta residência."
      action={failure.uncertain && pending && pending.retries < operationRecoveryLimit
        ? { label: "Conferir resultado", onClick: () => void operation.recover() } : undefined}
      exhaustedMessage={pending?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      closeLabel="Voltar" onClose={operation.closeFailure} /> : null}
    {result ? <Dialog open title={title} subtitle={description} success={!closed} onClose={finish} finalFocus={focus}
      footer={<ActionButton variant="primary" onClick={finish}>Concluir</ActionButton>}>{null}</Dialog> : null}
  </>;
}
