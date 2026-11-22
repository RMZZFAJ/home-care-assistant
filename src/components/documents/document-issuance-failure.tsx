"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import { issuanceReconciliationReceipt } from "@/lib/validation/issuance-reconciliation";

import { useOperationSupport } from "./use-operation-support";

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

type Failure = { outcome: "rejected" | "uncertain" | "lookup_failed"; cause: unknown; draftSaved?: boolean; retryable?: boolean };

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
  state, operation, onRetry, purchase = false,
}: {
  state: ReturnType<typeof useIssuanceFailure>;
  operation: string;
  onRetry: () => Promise<void>;
  purchase?: boolean;
}) {
  return state.open && state.failure
    ? <FailureDialog {...state.failure} operation={operation} attempts={state.attempts} purchase={purchase}
        onClose={state.close} onRetry={() => state.retry(onRetry)} />
    : null;
}

function FailureDialog({ outcome, draftSaved, retryable = true, cause, operation, attempts, onClose, onRetry, purchase }: Failure & {
  operation: string;
  attempts: number;
  onClose: () => void;
  onRetry: () => void;
  purchase: boolean;
}) {
  const lookupFailed = outcome === "lookup_failed";
  const title = lookupFailed ? "Não foi possível consultar o envio"
    : outcome === "rejected" ? "Não foi possível gravar a ficha"
      : purchase ? "Envio sem confirmação" : "Resultado ainda não confirmado";
  const canRetry = retryable && attempts < 2;
  const { copy, details } = useOperationSupport({ cause, operation, result: title,
    fallbackCode: lookupFailed ? "CONSULTA_ENVIO_INDISPONIVEL" : "EMISSAO_SEM_CONFIRMACAO", attempts, attemptLabel: "Tentativas nesta revisão" });

  return <Dialog open failure={lookupFailed ? "rejected" : outcome} title={title}
    subtitle={lookupFailed ? "A consulta ficou indisponível. Verifique o resultado da mesma tentativa."
      : outcome === "rejected" ? "A ficha não foi registrada nesta tentativa."
        : "Ainda não foi possível confirmar se a ficha foi registrada. Consulte esta tentativa antes de emitir outra ficha."}
    onClose={onClose}
    footer={<>
      <ActionButton onClick={onClose}>Voltar à revisão</ActionButton>
      {canRetry
        ? <ActionButton variant="primary" onClick={onRetry}><Icon name="refresh" />{outcome === "uncertain"
          ? purchase ? "Verificar confirmação" : "Consultar resultado" : "Tentar novamente"}</ActionButton>
        : <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>}
    </>}>
    {draftSaved ? <p className="hca-issuance-draft-saved"><Icon name="note" width={16} height={16} />
      {outcome === "uncertain" ? "O preenchimento foi guardado antes do envio." : "Seu rascunho está salvo. Você poderá retomar o preenchimento."}</p> : null}
    {attempts >= 2 ? <p className="hca-issuance-retry-limit">O problema persiste. Copie os detalhes para o responsável e retome a operação mais tarde.</p> : null}
    {details}
  </Dialog>;
}
