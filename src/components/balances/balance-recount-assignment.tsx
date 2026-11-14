"use client";
import type { RefObject } from "react";
import type { WorkspaceContext } from "@/components/workspace";
import { BalanceDocumentPreparation } from "./balance-document-preparation";

export function recountHref(patientId: string, documentId: string) {
  return (
    "/balancos?" +
    new URLSearchParams({
      careRecipientId: patientId,
      recountDocumentId: documentId,
    })
  );
}
export function BalanceRecountAssignment({
  context,
  patientId,
  documentId,
  onClose,
  onCommitted,
  restoreFocusFallbackRef,
}: {
  context: WorkspaceContext;
  patientId: string;
  documentId: string;
  onClose: () => void;
  onCommitted: () => void;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
}) {
  return (
    <BalanceDocumentPreparation
      key={context.userId + ":" + patientId + ":" + documentId}
      context={context}
      patientId={patientId}
      documentId={documentId}
      purpose="assign_recount"
      onClose={onClose}
      onCommitted={onCommitted}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
    />
  );
}
