"use client";

import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import type { ComponentProps } from "react";
import { useOperationSupport } from "./use-operation-support";

export const operationRecoveryLimit = 2;
export type DocumentOperationFailure = { outcome: "rejected" | "uncertain"; description: string; cause?: unknown };

export function DocumentOperationFailureDialog({
  title, description, outcome, cause, operation, fallbackCode, attempts, attemptReference, guidance, exhaustedMessage, onClose, closeLabel, action, finalFocus,
}: DocumentOperationFailure & {
  title: string;
  operation: string;
  fallbackCode: string;
  attempts: number;
  attemptReference?: string;
  guidance?: string;
  exhaustedMessage?: string;
  onClose: () => void;
  closeLabel: string;
  action?: { label: string; onClick: () => void };
  finalFocus?: ComponentProps<typeof Dialog>["finalFocus"];
}) {
  const { copy, details } = useOperationSupport({
    cause, operation, result: title, fallbackCode, attempts, attemptReference, attemptLabel: "Tentativas de recuperação",
    label: guidance ? "Ajuda para resolver" : undefined,
  });

  return <Dialog open failure={outcome} title={title} subtitle={description} onClose={onClose} finalFocus={finalFocus}
    popupClassName={guidance ? "hca-operation-result-dialog" : undefined}
    footer={<>
      <ActionButton onClick={onClose}>{closeLabel}</ActionButton>
      {action ? <ActionButton variant="primary" onClick={action.onClick}><Icon name="refresh" />{action.label}</ActionButton>
        : <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>}
    </>}>
    {guidance ? <p className="hca-operation-guidance"><Icon name={outcome === "uncertain" ? "search" : "refresh"} width={18} height={18} />{guidance}</p> : null}
    {exhaustedMessage ? <p className="hca-issuance-retry-limit">{exhaustedMessage}</p> : null}
    {details}
  </Dialog>;
}
