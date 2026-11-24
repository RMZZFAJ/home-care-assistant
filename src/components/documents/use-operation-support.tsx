"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/client/api";

export function useOperationSupport({ cause, operation, result, fallbackCode, attempts, attemptLabel, attemptReference, label = "Detalhes para suporte" }: {
  cause: unknown;
  operation: string;
  result: string;
  fallbackCode: string;
  attempts: number;
  attemptLabel: string;
  attemptReference?: string;
  label?: string;
}) {
  const supportRef = useRef<HTMLDetailsElement>(null);
  const diagnosisRef = useRef<HTMLPreElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [observedAt] = useState(() => new Date().toISOString());
  const error = cause instanceof ApiError ? cause : null;
  const code = error?.code && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code) ? error.code : fallbackCode;
  const reference = error?.correlationId;
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const detail = [
    "Home Care Assistant",
    "Operação: " + operation,
    "Resultado: " + result,
    "Código: " + code,
    "Instante: " + observedAt,
    ...(reference && uuid.test(reference) ? ["Referência: " + reference] : []),
    ...(attemptReference && uuid.test(attemptReference) ? ["Tentativa: " + attemptReference] : []),
    attemptLabel + ": " + attempts,
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

  return { copy, details: <>
    <details className="hca-issuance-support" ref={supportRef}>
      <summary><Icon name="info" width={15} height={15} />{label}<Icon name="down" width={15} height={15} /></summary>
      <p>Copie o diagnóstico e envie ao responsável pelo sistema.</p>
      <pre ref={diagnosisRef} tabIndex={-1}>{detail}</pre>
      <ActionButton onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>
    </details>
    <span role="status" className="sr-only">{copyStatus}</span>
  </> };
}
