"use client";

import type { RefObject } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationSupport } from "./use-operation-support";

const title = "Não foi possível atualizar a chegada";
export const arrivalRefreshRetryLimit = 2;

export function PurchaseArrivalRefreshFailure({ cause, retries, open, onClose, onRetry, returnFocus }: {
  cause: unknown;
  retries: number;
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const exhausted = retries >= arrivalRefreshRetryLimit;
  const { copy, details } = useOperationSupport({
    cause, operation: "Atualizar chegada da compra", result: title,
    fallbackCode: "CHEGADA_LEITURA_INDISPONIVEL", attempts: retries, attemptLabel: "Tentativas nesta revisão",
  });
  return <Dialog open={open} title={title} failure="rejected"
    subtitle="A consulta não carregou as quantidades atuais. A ficha continua na última versão consultada."
    onClose={onClose} finalFocus={returnFocus}
    footer={<>
      <ActionButton onClick={onClose}>Voltar à ficha</ActionButton>
      {exhausted
        ? <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>
        : <ActionButton variant="primary" onClick={onRetry}><Icon name="refresh" />Tentar novamente</ActionButton>}
    </>}>
    {exhausted ? <p className="hca-issuance-retry-limit">O problema persiste. Copie os detalhes para o responsável e retome a operação mais tarde.</p> : null}
    {details}
  </Dialog>;
}
