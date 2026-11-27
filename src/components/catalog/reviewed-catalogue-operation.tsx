"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton } from "@/components/ui/controls";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { api, ApiError } from "@/lib/client/api";
import { reviewedCataloguePointer, verifyReviewedCatalogueReceipt, type CatalogueScope, type ReviewedCatalogueCommand, type ReviewedCatalogueReceipt } from "@/lib/validation/catalogue-preparation";

const endpoint = "/api/admin/catalogue-actions";
const retainedAttempt = z.strictObject({ pointer: reviewedCataloguePointer, lookups: z.number().int().min(0).max(operationRecoveryLimit) });
type Pending = z.infer<typeof retainedAttempt>;
type Failure = { key: string; purpose: CatalogueScope["purpose"]; cause: unknown; uncertain: boolean };

export function reviewedCatalogueUrl({ patientId, mode, purpose, targetId }: CatalogueScope, selection?: string) {
  return endpoint + "?" + new URLSearchParams({
    ...(patientId ? { patientId } : {}), mode, purpose, ...(targetId ? { targetId } : {}), ...(selection ? { selection } : {}),
  });
}

export function useReviewedCatalogueOperation(userId: string, context: Pick<CatalogueScope, "patientId" | "mode">, purposes: readonly CatalogueScope["purpose"][]) {
  const { patientId, mode } = context;
  const storageKey = `hca:catalogue-action:${userId}:${patientId ?? "general"}:${mode}:${purposes.join(",")}`;
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<ReviewedCatalogueReceipt | null>(null);
  const [recovered, setRecovered] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  useOperationActivity(busy, { title: "Conferindo a alteração do catálogo" });

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      try {
        const saved = retainedAttempt.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null")).data;
        if (saved && saved.pointer.patientId === patientId && saved.pointer.mode === mode && purposes.includes(saved.pointer.purpose))
          setPending(saved);
      } catch { /* The open tab can still use the exact reference if storage is unavailable. */ }
      setReady(true);
    });
    return () => controller.abort();
  }, [mode, patientId, purposes, storageKey]);

  function keep(value: Pending | null) {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch { /* Retain the reference in memory while this surface is open. */ }
  }

  async function run(command: ReviewedCatalogueCommand, lookups: number, onRejected?: (error: ApiError) => void) {
    const signal = controllerRef.current?.signal;
    if (!signal || signal.aborted || !ready || runningRef.current || result) return;
    const { intent, ...pointer } = command;
    runningRef.current = true;
    keep({ pointer, lookups });
    setBusy(true);
    setFailure(null);
    try {
      const confirmed = verifyReviewedCatalogueReceipt(userId, command, await api<unknown>(endpoint, command, signal));
      if (signal.aborted) return;
      keep(null);
      setRecovered(intent === null && confirmed.state === "recorded");
      setResult(confirmed);
    } catch (cause) {
      if (signal.aborted) return;
      const rejected = intent !== null && cause instanceof ApiError && cause.status >= 400 && cause.status < 500
        && cause.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED", "IDEMPOTENCY_CONFLICT"].includes(cause.code ?? "");
      if (rejected) {
        keep(null);
        onRejected?.(cause);
      }
      setFailure({ key: pointer.key, purpose: pointer.purpose, cause, uncertain: !rejected });
    } finally {
      runningRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  return {
    busy, pending, failure, result, recovered, blocked: !ready || busy || Boolean(pending || result),
    submit: (scope: CatalogueScope, intent: NonNullable<ReviewedCatalogueCommand["intent"]>, onRejected?: (error: ApiError) => void) => {
      if (pending || scope.patientId !== patientId || scope.mode !== mode || !purposes.includes(scope.purpose)) return;
      return run({ ...scope, key: crypto.randomUUID(), intent }, 0, onRejected);
    },
    recover: () => {
      if (pending && pending.lookups < operationRecoveryLimit) return run({ ...pending.pointer, intent: null }, pending.lookups + 1);
    },
    openRecovery: () => pending && setFailure({ key: pending.pointer.key, purpose: pending.pointer.purpose, cause: null, uncertain: true }),
    closeFailure: () => setFailure(null), closeResult: () => setResult(null),
  };
}

export function ReviewedCatalogueFeedback({ operation, onFinish, onReview, identity = false, showPending = true }: {
  operation: ReturnType<typeof useReviewedCatalogueOperation>;
  onFinish: (receipt: ReviewedCatalogueReceipt) => void;
  onReview?: () => void;
  identity?: boolean;
  showPending?: boolean;
}) {
  const { pending, failure, result, busy, recovered } = operation;
  const canCompare = failure?.cause instanceof ApiError && failure.cause.code === "VERSION_CONFLICT" && !failure.uncertain;
  const action = failure?.uncertain && pending && pending.lookups < operationRecoveryLimit
    ? { label: "Conferir resultado", onClick: () => void operation.recover() }
    : canCompare && onReview ? { label: identity ? "Conferir atualização" : "Conferir cadastro atual", onClick: onReview } : undefined;
  const closed = result?.state === "closed";
  const proposed = result?.outcome && "proposalId" in result.outcome;
  const unit = result?.purpose === "unit_create";
  const precision = result?.purpose === "unit_configure";
  const presentation = result?.outcome && "presentationId" in result.outcome ? result.outcome : null;
  const presentationFailure = failure?.purpose === "presentation_create" || failure?.purpose === "presentation_edit";
  const presentationAttempt = result?.purpose === "presentation_create" || result?.purpose === "presentation_edit";
  const title = closed ? (presentationAttempt ? "Gravação não concluída" : "Tentativa encerrada") : proposed ? "Proposta registrada"
    : identity ? "Situação registrada"
      : unit ? "Unidade criada" : precision ? "Precisão registrada" : presentation ? "Apresentação registrada"
      : result?.purpose === "adopt" ? "Modelo adotado" : result?.purpose === "create" ? "Material adicionado" : "Cadastro atualizado";
  function finish() {
    if (!result) return;
    operation.closeResult();
    onFinish(result);
  }
  return <>
    {showPending && pending && !busy && !failure
      ? <ActionButton onClick={operation.openRecovery}>Conferir resultado pendente</ActionButton> : null}
    {failure && !busy ? <DocumentOperationFailureDialog
      title={failure.uncertain ? presentationFailure ? "A resposta da edição não chegou" : "A resposta do catálogo não chegou"
        : presentationFailure ? "Não foi possível salvar a apresentação" : "Não foi possível registrar no catálogo"}
      description={failure.uncertain ? presentationFailure ? "Consulte o resultado da mesma edição antes de repetir a gravação."
        : identity ? "Consulte a tentativa original para saber se a decisão foi registrada." : "Consulte a tentativa original para saber se o cadastro foi gravado."
        : failure.cause instanceof Error ? failure.cause.message : "Confira os dados antes de confirmar."}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.cause}
      operation="Alterar catálogo" fallbackCode="CATALOGO_RESULTADO_NAO_CONFIRMADO" attemptReference={failure.key}
      attempts={pending?.lookups ?? 0} guidance="Use a referência para identificar a tentativa no catálogo."
      action={action} exhaustedMessage={pending?.lookups === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      closeLabel="Voltar" onClose={operation.closeFailure}
    /> : null}
    {result ? <Dialog open title={title} success={!closed} failure={closed ? "rejected" : undefined} onClose={finish}
      subtitle={closed ? "A consulta confirmou que esta tentativa não alterou o catálogo."
        : proposed ? "Outro administrador da residência decide a proposta em Pessoas e propostas."
          : identity ? "A decisão ficou no histórico. Os saldos e movimentos permanecem associados às identidades originais."
            : unit ? "A unidade ficou disponível no âmbito informado. Os registros anteriores preservam suas referências."
              : precision ? "A referência do material foi atualizada após conferir as quantidades existentes."
                : presentation ? recovered ? `A consulta confirmou a gravação original da versão ${presentation.version}.`
                  : `A versão ${presentation.version} ficou registrada. Os usos anteriores conservam a equivalência da ocasião.`
            : "O material está identificado no catálogo. Os estoques mantêm seus registros."}
      footer={<ActionButton variant="primary" onClick={finish}>Concluir</ActionButton>}>{null}</Dialog> : null}
  </>;
}
