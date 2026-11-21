"use client";

import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationSupport } from "./use-operation-support";

export const operationRecoveryLimit = 2;

export function DocumentOperationFailureDialog({
  title, description, outcome, cause, operation, fallbackCode, attempts, exhaustedMessage, onClose, closeLabel, action,
}: {
  title: string;
  description: string;
  outcome: "rejected" | "uncertain";
  cause?: unknown;
  operation: string;
  fallbackCode: string;
  attempts: number;
  exhaustedMessage?: string;
  onClose: () => void;
  closeLabel: string;
  action?: { label: string; onClick: () => void };
}) {
  const { copy, details } = useOperationSupport({
    cause, operation, result: title, fallbackCode, attempts, attemptLabel: "Tentativas de recuperação",
  });

  return <Dialog open failure={outcome} title={title} subtitle={description} onClose={onClose}
    footer={<>
      <ActionButton onClick={onClose}>{closeLabel}</ActionButton>
      {action ? <ActionButton variant="primary" onClick={action.onClick}><Icon name="refresh" />{action.label}</ActionButton>
        : <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>}
    </>}>
    {exhaustedMessage ? <p className="hca-issuance-retry-limit">{exhaustedMessage}</p> : null}
    {details}
  </Dialog>;
}
