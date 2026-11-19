"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { purchaseActivitySteps } from "@/lib/documents/purchase";
import { documentDecisionIntention, requireDocumentDecisionReceipt, type DocumentDecisionIntention, type DocumentDecisionReceipt } from "@/lib/validation/document-decisions";

export class DocumentDecisionFailure extends Error {
  constructor(message: string, public readonly outcome: "not_applied" | "uncertain", cause?: unknown) { super(message); this.name = "DocumentDecisionFailure"; this.cause = cause; }
}

/** Only a confirmed command's key survives this form. Fields never become a draft. */
type DecisionVerifier = (result: Record<string, unknown>, intention: DocumentDecisionIntention, key: string) => void;

export function useDocumentDecision({ userId, documentId, domain, action, patientId, purchaseArrival = false }: {
  userId: string; documentId: string; domain: DocumentDecisionIntention["domain"]; action: string; patientId?: string; purchaseArrival?: boolean;
}) {
  const storageKey = `hca:official-decision:${userId}:${documentId}:${domain}:${action}`;
  const endpoint = domain === "balance_workspace" ? `/api/balances/decisions/${documentId}?careRecipientId=${patientId}` : `/api/documents/${documentId}/decisions`;
  const reconcileEndpoint = endpoint.split("?")[0] + "/reconcile" + (endpoint.includes("?") ? "?" + endpoint.split("?")[1] : "");
  const currentRef = useRef<{ scope: string; key: string } | null>(null), sendingRef = useRef(false);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState(""), [stage, setStage] = useState(0);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active || sendingRef.current) return;
      setRecoveryMessage(""); setError(""); setUncertain(false);
      let key: string | null = null;
      try { key = sessionStorage.getItem(storageKey); } catch { /* The in-memory command remains independent. */ }
      if (!key || !/^[a-f0-9-]{36}$/.test(key)) return;
      sendingRef.current = true; setBusy(true); setStage(1);
      try {
        const result = requireDocumentDecisionReceipt(await api(reconcileEndpoint, { key }), { documentId, key, domain, action });
        if (!active) return;
        if (currentRef.current?.scope === storageKey) currentRef.current = null;
        try { sessionStorage.removeItem(storageKey); } catch { /* The next read can recognize the same closed key. */ }
        setUncertain(false);
        setRecoveryMessage(result.state === "applied" ? "O resultado anterior foi confirmado. Nenhuma nova ação foi enviada. Consulte a situação atual da ficha." : "A conferência confirmou que a tentativa anterior não alterou nada. Você pode preencher uma nova ação; se o erro persistir, procure a supervisão.");
        window.dispatchEvent(new Event("hca:data-changed"));
      } catch (cause) {
        if (active) { setUncertain(true); setRecoveryMessage(`O resultado anterior continua sem confirmação. Procure a supervisão antes de repetir a ação. ${cause instanceof Error ? cause.message : "Consulte novamente."}`); }
      } finally { sendingRef.current = false; if (active) setBusy(false); }
    });
    return () => { active = false; };
  }, [storageKey, reconcileEndpoint, documentId, domain, action]);
  const cancellingRequisition = domain === "requisition" && action === "cancel";
  const purchasing = domain === "supply" && action === "purchase";
  useOperationActivity(busy, {
    title: cancellingRequisition ? "Registrando cancelamento" : purchasing ? "Registrando compra" : purchaseArrival ? "Registrando chegada" : "Concluindo a ação",
    detail: "Aguarde a conferência do resultado antes de tentar novamente.",
    stage,
    steps: purchasing ? purchaseActivitySteps : [
      { label: cancellingRequisition ? "Conferindo os efeitos no estoque" : purchaseArrival ? "Registrando as quantidades recebidas" : "Enviando sua confirmação", icon: cancellingRequisition ? "stock" : purchaseArrival ? "truck" : "file" },
      { label: "Conferindo o resultado", icon: "check" },
    ],
  });
  function remember(key: string) { currentRef.current = { scope: storageKey, key }; try { sessionStorage.setItem(storageKey, key); } catch { /* The open form retains its key. */ } }
  function forget() { if (currentRef.current?.scope === storageKey) currentRef.current = null; try { sessionStorage.removeItem(storageKey); } catch { /* No permission or result comes from storage. */ } }
  function previous() { if (currentRef.current?.scope === storageKey) return currentRef.current.key; try { const value = sessionStorage.getItem(storageKey); return value && /^[a-f0-9-]{36}$/.test(value) ? value : null; } catch { return null; } }
  async function settle(key: string, intention?: DocumentDecisionIntention, verify?: DecisionVerifier) {
    setStage(1);
    const result = requireDocumentDecisionReceipt(await api(reconcileEndpoint, { key }), { documentId, key, domain, action }, intention);
    if (result.state === "applied") verify?.(result.result, result.intention, key);
    forget(); setUncertain(false);
    return result;
  }
  async function checkPrevious(verify?: DecisionVerifier): Promise<DocumentDecisionReceipt | null> {
    const key = previous(); if (!key || sendingRef.current) return null;
    sendingRef.current = true; setBusy(true); setError("");
    try { return await settle(key, undefined, verify); }
    catch (cause) { remember(key); setUncertain(true); const message = `Não foi possível conferir o resultado anterior. Procure a supervisão antes de repetir a ação. ${cause instanceof Error ? cause.message : "Tente consultar novamente."}`; setError(message); throw new DocumentDecisionFailure(message, "uncertain", cause); }
    finally { sendingRef.current = false; setBusy(false); }
  }
  async function execute(input: DocumentDecisionIntention, verify?: DecisionVerifier): Promise<DocumentDecisionReceipt | null> {
    if (sendingRef.current) return null;
    if (previous()) { const message = "Confira o resultado anterior antes de confirmar outra tentativa."; setUncertain(true); setError(message); throw new DocumentDecisionFailure(message, "uncertain"); }
    const parsed = documentDecisionIntention.safeParse(input);
    if (!parsed.success) throw new DocumentDecisionFailure("Confira os campos antes de confirmar. Nenhuma solicitação foi enviada.", "not_applied", parsed.error);
    const intention = parsed.data, key = crypto.randomUUID();
    sendingRef.current = true; setBusy(true); setStage(0); setError(""); remember(key);
    try {
      const result = requireDocumentDecisionReceipt(await api(endpoint, { key, intention }), { documentId, key, domain, action }, intention);
      if (result.state !== "applied") throw new Error("A confirmação não contém um ato aplicado.");
      verify?.(result.result, result.intention, key);
      forget(); setUncertain(false); return result;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Falha ao concluir a ação.";
      let outcome: DocumentDecisionReceipt;
      try {
        outcome = await settle(key, intention, verify);
      } catch (reconciliationCause) {
        const message = `${detail} O resultado continua sem confirmação. Procure a supervisão; não repita a ação antes de conferir o resultado.`;
        setUncertain(true); setError(message); throw new DocumentDecisionFailure(message, "uncertain", reconciliationCause);
      }
      if (outcome.state === "applied") return outcome;
      const message = `${detail} A conferência confirmou que nada foi alterado por esta tentativa. Seus campos continuam nesta tela para tentar novamente. Se persistir, procure a supervisão.`;
      setError(message); throw new DocumentDecisionFailure(message, "not_applied", cause);
    } finally { sendingRef.current = false; setBusy(false); }
  }
  return { busy, uncertain, error, recoveryMessage, execute, checkPrevious };
}
