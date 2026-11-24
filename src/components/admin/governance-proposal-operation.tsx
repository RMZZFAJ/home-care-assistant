"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { z } from "zod";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { api, ApiError } from "@/lib/client/api";
import { proposalAttemptInput, proposalAttemptPointer, proposalDecisionResponse } from "@/lib/validation/governance-proposal";

const pendingSchema = z.strictObject({
  pointer: proposalAttemptPointer, retries: z.number().int().min(0).max(operationRecoveryLimit),
});
type Pending = z.infer<typeof pendingSchema>;
type Intent = NonNullable<z.infer<typeof proposalAttemptInput>["intent"]>;
type Result = z.infer<typeof proposalDecisionResponse>;

export function useGovernanceProposalOperation(userId: string, patientId: string) {
  const storage = ["hca", "proposal-decision", userId, patientId].join(":");
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<{ cause: unknown; uncertain: boolean; key: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);
  const lifetimeRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetimeRef.current = controller;
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      try {
        const parsed = pendingSchema.safeParse(JSON.parse(sessionStorage.getItem(storage) ?? "null"));
        if (parsed.success && parsed.data.pointer.careRecipientId === patientId) setPending(parsed.data);
      } catch { /* Recovery continues while this workspace stays open. */ }
      setReady(true);
    });
    return () => controller.abort();
  }, [patientId, storage]);
  useOperationActivity(busy, { title: "Conferindo decisão da proposta" });

  function keep(value: Pending | null) {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(storage, JSON.stringify(value));
      else sessionStorage.removeItem(storage);
    } catch { /* The exact reference remains in this workspace. */ }
  }

  async function run(initial: { proposalId: string; intent: Intent } | null) {
    const signal = lifetimeRef.current?.signal;
    if (!signal || signal.aborted || !ready || runningRef.current || result) return;
    if (initial ? pending !== null : !pending || pending.retries >= operationRecoveryLimit) return;
    const attempt: Pending = pending
      ? { ...pending, retries: pending.retries + 1 }
      : { pointer: { careRecipientId: patientId, proposalId: initial!.proposalId, attemptKey: crypto.randomUUID() }, retries: 0 };
    runningRef.current = true;
    keep(attempt);
    setBusy(true);
    setFailure(null);
    try {
      const reply = proposalDecisionResponse.parse(await api<unknown>("/api/patient-settings/proposals", {
        ...attempt.pointer, intent: initial?.intent ?? null,
      }, signal));
      if (reply.result.careRecipientId !== patientId || reply.result.proposalId !== attempt.pointer.proposalId ||
        reply.result.attemptKey !== attempt.pointer.attemptKey ||
        (initial && (reply.result.state !== "recorded" ||
          (initial.intent.decision === "reject") !== (reply.result.status === "rejected"))))
        throw new Error("A resposta não confirma a decisão desta proposta.");
      if (signal.aborted) return;
      keep(null);
      setResult(reply);
    } catch (cause) {
      if (signal.aborted) return;
      const definite = initial !== null && cause instanceof ApiError && cause.status >= 400 && cause.status < 500 &&
        cause.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED"].includes(cause.code ?? "");
      if (definite) keep(null);
      setFailure({ cause, uncertain: !definite, key: attempt.pointer.attemptKey });
    } finally {
      runningRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  return {
    busy, ready, pending, failure, result,
    submit: (proposalId: string, intent: Intent) => run({ proposalId, intent }),
    recover: () => run(null),
    openRecovery: () => pending && setFailure({ cause: null, uncertain: true, key: pending.pointer.attemptKey }),
    closeFailure: () => setFailure(null),
    closeResult: () => setResult(null),
  };
}

export function GovernanceProposalFeedback({ operation, onRefresh, focus }: {
  operation: ReturnType<typeof useGovernanceProposalOperation>;
  onRefresh: () => void;
  focus: RefObject<HTMLElement | null>;
}) {
  const { pending, failure, result, busy } = operation;
  function finish() {
    operation.closeResult();
    onRefresh();
  }
  const state = result?.result.status ?? "closed";
  const copy = {
    applied: ["Proposta aplicada", "A decisão foi confirmada e a configuração da residência foi atualizada."],
    rejected: ["Proposta rejeitada", "A configuração vigente foi preservada. A decisão fica disponível no histórico."],
    awaiting_acceptance: ["Proposta aprovada", "A decisão local foi registrada. O destinatário ainda precisa aceitar o convite."],
    closed: ["Tentativa encerrada", "A consulta confirmou que esta tentativa não registrou uma decisão."],
  } as const;
  return <>
    {pending && !busy && !failure ? <FeedbackBanner tone="warning">
      Há uma decisão de proposta aguardando confirmação. <ActionButton onClick={operation.openRecovery}>Conferir resultado</ActionButton>
    </FeedbackBanner> : null}
    {failure && !busy ? <DocumentOperationFailureDialog
      title={failure.uncertain ? "A resposta da decisão não chegou" : "Não foi possível decidir a proposta"}
      description={failure.uncertain ? "Consulte a mesma tentativa para saber o que foi registrado."
        : failure.cause instanceof Error ? failure.cause.message : "Confira a proposta e a configuração vigente."}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.cause}
      operation="Decidir proposta" fallbackCode="PROPOSTA_RESULTADO_NAO_CONFIRMADO" attemptReference={failure.key}
      attempts={pending?.retries ?? 0} guidance="A referência identifica a decisão que você confirmou."
      action={failure.uncertain && pending && pending.retries < operationRecoveryLimit
        ? { label: "Conferir resultado", onClick: () => void operation.recover() } : undefined}
      exhaustedMessage={pending?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      closeLabel="Voltar" finalFocus={focus} onClose={() => { operation.closeFailure(); if (!failure.uncertain) onRefresh(); }} /> : null}
    {result ? <Dialog open title={copy[state][0]} subtitle={copy[state][1]} success={state !== "closed"}
      onClose={finish} finalFocus={focus} footer={<ActionButton variant="primary" onClick={finish}>Concluir</ActionButton>}>
      {result.invitationUrl ? <FormField label="Convite aprovado">
        <TextInput readOnly value={result.invitationUrl} onFocus={event => event.currentTarget.select()} />
      </FormField> : state === "awaiting_acceptance" ? <p>O convite pode ser reemitido no painel da proposta, se o link original não estiver disponível.</p> : null}
    </Dialog> : null}
  </>;
}
