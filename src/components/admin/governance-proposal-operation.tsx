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
  ownAccessChange: z.boolean().optional(),
});
type Pending = z.infer<typeof pendingSchema>;
type Intent = NonNullable<z.infer<typeof proposalAttemptInput>["intent"]>;
type Result = z.infer<typeof proposalDecisionResponse>;

const proposalStorage = (userId: string, patientId: string) => `hca:proposal-decision:${userId}:${patientId}`;
const ownAccessStorage = (userId: string) => `hca:proposal-decision:${userId}:own-access`;

function readAttempt(userId: string, patientId?: string): Pending | null {
  try {
    const own = patientId ? null : proposalAttemptPointer.parse(JSON.parse(sessionStorage.getItem(ownAccessStorage(userId)) ?? "null"));
    const scope = patientId ?? own?.careRecipientId;
    if (!scope) return null;
    const saved = pendingSchema.parse(JSON.parse(sessionStorage.getItem(proposalStorage(userId, scope)) ?? "null"));
    if (saved.pointer.careRecipientId !== scope || own && (!saved.ownAccessChange ||
      saved.pointer.proposalId !== own.proposalId || saved.pointer.attemptKey !== own.attemptKey)) return null;
    return saved;
  } catch { return null; }
}

export function hasOwnGovernanceProposalAttempt(userId: string, patientId: string) {
  return readAttempt(userId)?.pointer.careRecipientId === patientId;
}

function writeAttempt(userId: string, attempt: Pending) {
  try {
    sessionStorage.setItem(proposalStorage(userId, attempt.pointer.careRecipientId), JSON.stringify(attempt));
    if (attempt.ownAccessChange) sessionStorage.setItem(ownAccessStorage(userId), JSON.stringify(attempt.pointer));
  } catch { /* The open workspace still holds the exact reference. */ }
}

function clearAttempt(userId: string, pointer: Pending["pointer"]) {
  try {
    const own = readAttempt(userId)?.pointer.attemptKey === pointer.attemptKey;
    if (readAttempt(userId, pointer.careRecipientId)?.pointer.attemptKey === pointer.attemptKey)
      sessionStorage.removeItem(proposalStorage(userId, pointer.careRecipientId));
    if (own) sessionStorage.removeItem(ownAccessStorage(userId));
  } catch { /* Session storage can be unavailable. */ }
}

export function useGovernanceProposalOperation(userId: string, patientId?: string) {
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
      setPending(readAttempt(userId, patientId));
      setReady(true);
    });
    return () => controller.abort();
  }, [patientId, userId]);
  useOperationActivity(busy, { title: "Conferindo decisão da proposta" });

  function clear(pointer: Pending["pointer"]) {
    clearAttempt(userId, pointer);
    setPending(null);
  }

  async function run(initial: { proposalId: string; intent: Intent; ownAccessChange: boolean } | null) {
    const signal = lifetimeRef.current?.signal;
    if (!signal || signal.aborted || !ready || runningRef.current || result) return;
    const saved = readAttempt(userId, patientId) ?? pending;
    let attempt: Pending;
    if (initial) {
      if (!patientId || saved) return;
      attempt = {
        pointer: { careRecipientId: patientId, proposalId: initial.proposalId, attemptKey: crypto.randomUUID() },
        retries: 0, ownAccessChange: initial.ownAccessChange,
      };
    } else {
      if (!saved || saved.retries >= operationRecoveryLimit) return;
      attempt = { ...saved, retries: saved.retries + 1 };
    }
    runningRef.current = true;
    writeAttempt(userId, attempt);
    setPending(attempt);
    setBusy(true);
    setFailure(null);
    try {
      const reply = proposalDecisionResponse.parse(await api<unknown>("/api/patient-settings/proposals", {
        ...attempt.pointer, intent: initial?.intent ?? null,
      }, signal));
      if (reply.result.careRecipientId !== attempt.pointer.careRecipientId || reply.result.proposalId !== attempt.pointer.proposalId ||
        reply.result.attemptKey !== attempt.pointer.attemptKey ||
        (initial && (reply.result.state !== "recorded" ||
          (initial.intent.decision === "reject") !== (reply.result.status === "rejected"))))
        throw new Error("A resposta não confirma a decisão desta proposta.");
      if (signal.aborted) return;
      // Revocation can unmount the administrative screen before the result is seen.
      if (!attempt.ownAccessChange) clear(attempt.pointer);
      setResult(reply);
    } catch (cause) {
      if (signal.aborted) return;
      const definite = initial !== null && cause instanceof ApiError && cause.status >= 400 && cause.status < 500 &&
        cause.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED"].includes(cause.code ?? "");
      if (definite) clear(attempt.pointer);
      setFailure({ cause, uncertain: !definite, key: attempt.pointer.attemptKey });
    } finally {
      runningRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  return {
    busy, ready, pending, failure, result,
    submit: (proposalId: string, intent: Intent, ownAccessChange: boolean) => run({ proposalId, intent, ownAccessChange }),
    recover: () => run(null),
    openRecovery: () => pending && setFailure({ cause: null, uncertain: true, key: pending.pointer.attemptKey }),
    closeFailure: () => setFailure(null),
    closeResult: () => {
      if (result) clear(result.result);
      setResult(null);
    },
  };
}

export function GovernanceProposalFeedback({ operation, onRefresh, focus }: {
  operation: ReturnType<typeof useGovernanceProposalOperation>;
  onRefresh: () => void;
  focus?: RefObject<HTMLElement | null>;
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
    {pending && !busy && !failure && !result ? <FeedbackBanner tone="warning">
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

export function OwnGovernanceProposalRecovery({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const operation = useGovernanceProposalOperation(userId);
  return <GovernanceProposalFeedback operation={operation} onRefresh={onRefresh} />;
}
