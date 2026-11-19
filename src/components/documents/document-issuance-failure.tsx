"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/client/api";
import { issuanceReconciliationReceipt } from "@/lib/validation/issuance-reconciliation";

export const issuanceRecoverySteps = [
  { label: "Consultando o registro da tentativa", icon: "search" },
  { label: "Recuperando a confirmação", icon: "check" },
] as const;

export async function reconcileIssuance(
  careRecipientId: string,
  draft: { id: string; revision: number },
  idempotencyKey: string,
) {
  const response = await api<{ data: unknown }>("/api/drafts/issuance/reconcile", {
    careRecipientId, ...draft, idempotencyKey,
  });
  return issuanceReconciliationReceipt.parse(response.data);
}

type Failure = { outcome: "rejected" | "uncertain"; cause: unknown; draftSaved?: boolean; retryable?: boolean };

export function useIssuanceFailure() {
  const [failure, setFailure] = useState<Failure | null>(null);
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  return {
    failure, open, attempts,
    report(next: Failure) {
      setFailure(next);
      setOpen(true);
    },
    reopen() {
      if (!failure) return false;
      setOpen(true);
      return true;
    },
    close() { setOpen(false); },
    clear() {
      setFailure(null);
      setOpen(false);
      setAttempts(0);
    },
    retry(action: () => Promise<void>) {
      if (attempts >= 2) return;
      setAttempts(attempts + 1);
      setOpen(false);
      void action();
    },
  };
}

export function DocumentIssuanceFailure({
  state, operation, onRetry,
}: {
  state: ReturnType<typeof useIssuanceFailure>;
  operation: string;
  onRetry: () => Promise<void>;
}) {
  return state.open && state.failure
    ? <FailureDialog {...state.failure} operation={operation} attempts={state.attempts}
        onClose={state.close} onRetry={() => state.retry(onRetry)} />
    : null;
}

function FailureDialog({ outcome, draftSaved, retryable = true, cause, operation, attempts, onClose, onRetry }: Failure & {
  operation: string;
  attempts: number;
  onClose: () => void;
  onRetry: () => void;
}) {
  const supportRef = useRef<HTMLDetailsElement>(null);
  const diagnosisRef = useRef<HTMLPreElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const error = cause instanceof ApiError ? cause : null;
  const code = error?.code && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code) ? error.code : "EMISSAO_SEM_CONFIRMACAO";
  const reference = error?.correlationId;
  const title = outcome === "rejected" ? "Não foi possível gravar a ficha" : "Resultado ainda não confirmado";
  const canRetry = retryable && attempts < 2;
  const detail = [
    "Home Care Assistant",
    "Operação: " + operation,
    "Resultado: " + title,
    "Código: " + code,
    ...(reference && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reference) ? ["Referência: " + reference] : []),
    "Tentativas nesta revisão: " + attempts,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(detail);
      setCopyStatus("Diagnóstico copiado.");
    } catch {
      if (supportRef.current) supportRef.current.open = true;
      if (diagnosisRef.current) {
        const range = document.createRange();
        range.selectNodeContents(diagnosisRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        diagnosisRef.current.focus();
      }
      setCopyStatus("Selecione e copie o diagnóstico.");
    }
  }

  return <Dialog open failure={outcome} title={title}
    subtitle={outcome === "rejected"
      ? "A ficha não foi registrada nesta tentativa."
      : "Ainda não foi possível confirmar se a ficha foi registrada. Consulte esta tentativa antes de emitir outra ficha."}
    onClose={onClose}
    footer={<>
      <ActionButton onClick={onClose}>Voltar à revisão</ActionButton>
      {canRetry
        ? <ActionButton variant="primary" onClick={onRetry}><Icon name="refresh" />{outcome === "uncertain" ? "Consultar resultado" : "Tentar novamente"}</ActionButton>
        : <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>}
    </>}>
    {draftSaved ? <p className="hca-issuance-draft-saved"><Icon name="note" width={16} height={16} />Seu rascunho está salvo. Você poderá retomar o preenchimento.</p> : null}
    {attempts >= 2 ? <p className="hca-issuance-retry-limit">O problema persiste. Copie os detalhes para o responsável e retome a operação mais tarde.</p> : null}
    <details className="hca-issuance-support" ref={supportRef}>
      <summary><Icon name="info" width={15} height={15} />Detalhes para suporte<Icon name="down" width={15} height={15} /></summary>
      <p>Copie o diagnóstico e envie ao responsável pelo sistema.</p>
      <pre ref={diagnosisRef} tabIndex={-1}>{detail}</pre>
      <ActionButton onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>
    </details>
    <span role="status" className="sr-only">{copyStatus}</span>
  </Dialog>;
}
