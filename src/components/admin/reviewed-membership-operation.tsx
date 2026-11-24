"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { api, ApiError } from "@/lib/client/api";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";
import {
  reviewedMembershipPointer, verifyReviewedMembership,
  type ReviewedMembershipScope, type ReviewedMembershipCommand, type ReviewedMembershipResult,
} from "@/lib/validation/reviewed-membership";

const retainedAttempt = z.strictObject({
  pointer: reviewedMembershipPointer,
  retries: z.number().int().min(0).max(operationRecoveryLimit),
});
type Pending = z.infer<typeof retainedAttempt>;
type Failure = { reason: unknown; uncertain: boolean; key: string };
type Intent = NonNullable<ReviewedMembershipCommand["intent"]>;

function readAttempt(storage: string) {
  try { return retainedAttempt.parse(JSON.parse(sessionStorage.getItem(storage) ?? "null")); }
  catch { return null; }
}

function writeAttempt(storage: string, value: Pending | null) {
  try {
    if (value) sessionStorage.setItem(storage, JSON.stringify(value));
    else sessionStorage.removeItem(storage);
  } catch { /* The open workspace still holds the exact reference. */ }
}

type OperationScope = Pick<ReviewedMembershipScope, "patientId" | "mode">;

function attemptStorage(prefix: string, scope: OperationScope) {
  return `${prefix}${scope.mode}:${scope.patientId}`;
}

function readAvailableAttempt(prefix: string, scope: OperationScope | null, userId: string) {
  if (scope) {
    const saved = readAttempt(attemptStorage(prefix, scope));
    return saved?.pointer.patientId === scope.patientId && saved.pointer.mode === scope.mode ? saved : null;
  }
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (!key.startsWith(prefix)) continue;
      const saved = readAttempt(key);
      if (saved?.pointer.mode === "patient" && saved.pointer.targetId === userId && key === attemptStorage(prefix, saved.pointer)) return saved;
    }
  } catch { /* Session storage can be unavailable. */ }
  return null;
}

export function useReviewedMembershipOperation(userId: string, context: OperationScope | null) {
  const prefix = `hca:reviewed-membership:${userId}:`;
  const patientId = context?.patientId;
  const mode = context?.mode;
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<ReviewedMembershipResult | null>(null);
  const [busy, setBusy] = useState(false);
  const activeRef = useRef(false);
  const runningRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    void Promise.resolve().then(() => {
      if (activeRef.current) setPending(readAvailableAttempt(prefix, patientId && mode ? { patientId, mode } : null, userId));
    });
    return () => { activeRef.current = false; };
  }, [prefix, patientId, mode, userId]);
  useOperationActivity(busy, { title: "Confirmando a alteração do vínculo" });

  async function run(scope: ReviewedMembershipScope | null, intent: Intent | null) {
    if (runningRef.current) return false;
    const saved = readAvailableAttempt(prefix, context, userId) ?? pending;
    if (scope ? saved !== null : !saved || saved.retries >= operationRecoveryLimit) return false;
    const attempt = saved
      ? { ...saved, retries: saved.retries + 1 }
      : { pointer: { ...scope!, key: crypto.randomUUID() }, retries: 0 };
    const storage = attemptStorage(prefix, attempt.pointer);
    writeAttempt(storage, attempt);
    runningRef.current = true;
    setBusy(true); setPending(attempt); setFailure(null);
    const command = { ...attempt.pointer, intent };
    try {
      const received = verifyReviewedMembership(command, await api<unknown>("/api/admin/memberships", command));
      if (activeRef.current) setResult(received);
    } catch (reason) {
      const certain = intent !== null && reason instanceof ApiError && reason.status >= 400 && reason.status < 500
        && reason.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED"].includes(reason.code ?? "");
      if (certain) writeAttempt(storage, null);
      if (activeRef.current) {
        if (certain) setPending(null);
        setFailure({ reason, uncertain: !certain, key: attempt.pointer.key });
      }
    } finally {
      runningRef.current = false;
      if (activeRef.current) setBusy(false);
    }
    return true;
  }

  function finish() {
    const outcome = result?.outcome ?? null;
    if (result) writeAttempt(attemptStorage(prefix, result), null);
    setPending(readAvailableAttempt(prefix, context, userId));
    setResult(null);
    return outcome;
  }

  return {
    available: pending, busy, failure, result, finish,
    blocked: busy || pending !== null,
    submit: (scope: ReviewedMembershipScope, intent: Intent) => run(scope, intent),
    recover: () => run(null, null),
    openRecovery: () => pending && setFailure({ reason: null, uncertain: true, key: pending.pointer.key }),
    closeFailure: () => setFailure(null),
  };
}

type Operation = ReturnType<typeof useReviewedMembershipOperation>;

export function ReviewedMembershipFeedback({ operation, onConfirmed, focus }: {
  operation: Operation;
  onConfirmed?: (value: AdministrativeOutcome) => void;
  focus?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { available, busy, failure, result } = operation;
  const outcome = result?.outcome;
  const title = result?.state === "closed" ? "Tentativa encerrada" : outcome?.kind === "proposal" ? "Proposta registrada"
    : outcome?.status === "revoked" ? "Vínculo revogado" : outcome?.action === "membershipStatus" ? "Vínculo reativado" : "Vínculo atualizado";
  const description = result?.state === "closed" ? "A consulta confirmou que esta tentativa não alterou o vínculo."
    : outcome?.kind === "proposal" ? "Um administrador local distinto precisa decidir a proposta. O acesso ainda não foi alterado."
      : outcome?.status === "revoked" ? "A revogação preservou o histórico. As pendências continuam nos próprios processos."
        : "A alteração foi registrada no histórico da residência.";
  function closeResult() {
    const confirmed = operation.finish();
    if (confirmed) onConfirmed?.(confirmed);
  }
  return <>
    {available && !result ? <FeedbackBanner tone="warning">
      Há uma alteração de vínculo aguardando confirmação. <ActionButton disabled={busy} onClick={operation.openRecovery}>Conferir resultado</ActionButton>
    </FeedbackBanner> : null}
    {result ? <Dialog open title={title} subtitle={description} headingIcon="info" success={result.state === "recorded"}
      onClose={closeResult} finalFocus={focus} footer={<ActionButton variant="primary" onClick={closeResult}>Concluir</ActionButton>}>{null}</Dialog> : null}
    {failure ? <DocumentOperationFailureDialog
      title={failure.uncertain ? "Não foi possível confirmar o vínculo" : "Não foi possível alterar o vínculo"}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.reason}
      description={failure.uncertain ? "Consulte a mesma tentativa para saber o que foi registrado."
        : failure.reason instanceof Error ? failure.reason.message : "Confira os dados atuais do vínculo."}
      operation="Administrar vínculo" fallbackCode="VINCULO_NAO_CONFIRMADO" attemptReference={failure.key}
      attempts={available?.retries ?? 0} guidance="A referência identifica a alteração que você confirmou."
      action={failure.uncertain && available && available.retries < operationRecoveryLimit
        ? { label: "Conferir resultado", onClick: () => void operation.recover() } : undefined}
      exhaustedMessage={available?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      closeLabel="Voltar" onClose={operation.closeFailure} finalFocus={focus} /> : null}
  </>;
}

export function ReviewedOwnMembershipRecovery({ userId }: { userId: string }) {
  const operation = useReviewedMembershipOperation(userId, null);
  return <ReviewedMembershipFeedback operation={operation} />;
}
