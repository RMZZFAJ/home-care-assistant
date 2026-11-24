"use client";

import { useEffect, useRef, useState } from "react";
import { operationRecoveryLimit, type DocumentOperationFailure } from "@/components/documents/document-operation-failure-dialog";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { api, ApiError } from "@/lib/client/api";
import { operationAttempt, parseOperationsOutcome, type OperationAttempt, type OperationsCommand } from "@/lib/operations/contracts";

const storageKey = (actorId: string) => "hca:operations-intent:" + actorId;
export function readTechnicalAttempt(actorId: string) {
  try {
    const parsed = operationAttempt.safeParse(JSON.parse(sessionStorage.getItem(storageKey(actorId)) ?? "null"));
    return parsed.success && parsed.data.expectedActorId === actorId ? parsed.data : null;
  } catch {
    return null;
  }
}
type Result = { attempt: OperationAttempt; confirmed: boolean; noop: boolean; recovered: boolean };
const steps = [
  { label: "Conferindo o ambiente e a versão", icon: "shield" },
  { label: "Registrando a decisão no histórico", icon: "history" },
  { label: "Consultando o comprovante da tentativa", icon: "search" },
] as const;

export function useTechnicalCommand(actorId: string, onRefresh: () => void, onConflict: (packet: OperationsCommand) => void) {
  const [pending, setPending] = useState(() => readTechnicalAttempt(actorId));
  const pendingRef = useRef(pending);
  const sendingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<DocumentOperationFailure | null>(null);
  useOperationActivity(busy, {
    title: recovering ? "Conferindo a decisão técnica" : "Registrando a decisão técnica",
    steps, stage: recovering ? 2 : 1,
  });
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function retain(attempt: OperationAttempt) {
    sessionStorage.setItem(storageKey(actorId), JSON.stringify(attempt));
    pendingRef.current = attempt;
    setPending(attempt);
  }
  function forget(attempt: OperationAttempt) {
    if (readTechnicalAttempt(actorId)?.idempotencyKey === attempt.idempotencyKey) {
      try { sessionStorage.removeItem(storageKey(actorId)); } catch { /* A terminal reference can only be recovered again. */ }
    }
    pendingRef.current = null;
    setPending(null);
  }
  function accept(data: unknown, attempt: OperationAttempt, recovered: boolean) {
    const outcome = parseOperationsOutcome(data, attempt);
    forget(attempt);
    setFailure(null);
    setResult({ attempt, confirmed: outcome.recorded, noop: outcome.recorded && outcome.noop, recovered });
    onRefresh();
    return outcome.recorded;
  }
  async function send(packet: OperationsCommand) {
    if (pendingRef.current || sendingRef.current) return false;
    setFailure(null);
    setResult(null);
    const attempt: OperationAttempt = {
      expectedActorId: actorId, action: packet.action, environment: packet.environment, incidentId: packet.incidentId,
      idempotencyKey: packet.idempotencyKey, expectedVersion: packet.expectedVersion, attempts: 0,
    };
    try { retain(attempt); }
    catch (cause) {
      setFailure({ outcome: "rejected", description: "A chave de recuperação não pôde ser guardada neste aparelho. A decisão não foi enviada.", cause });
      return false;
    }
    sendingRef.current = true;
    setBusy(true);
    try {
      const response = await api<{ data: unknown }>("/api/operations", { ...packet, expectedActorId: actorId });
      return accept(response.data, attempt, false);
    } catch (cause) {
      const rejected = cause instanceof ApiError && Boolean(cause.code) && [400, 401, 403, 404, 409, 413, 422, 429].includes(cause.status);
      if (rejected) forget(attempt);
      if (rejected && cause.code === "VERSION_CONFLICT") onConflict(packet);
      else setFailure({
        outcome: rejected ? "rejected" : "uncertain", cause,
        description: cause instanceof Error ? cause.message : "O resultado técnico continua sem confirmação.",
      });
      return false;
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }
  async function recover() {
    const attempt = pendingRef.current;
    if (!attempt || sendingRef.current) return;
    if (attempt.attempts >= operationRecoveryLimit) {
      setFailure(previous => previous ?? { outcome: "uncertain", description: "O resultado técnico continua sem confirmação." });
      return;
    }
    const next = { ...attempt, attempts: attempt.attempts + 1 };
    try { retain(next); }
    catch (cause) {
      setFailure({ outcome: "uncertain", description: "A atualização da referência nesta aba não pôde ser guardada.", cause });
      return;
    }
    sendingRef.current = true;
    setRecovering(true);
    setBusy(true);
    try {
      const response = await api<{ data: unknown }>("/api/operations", {
        action: "recover", environment: attempt.environment, idempotencyKey: attempt.idempotencyKey, expectedActorId: actorId,
      });
      accept(response.data, next, true);
    } catch (cause) {
      setFailure({
        outcome: "uncertain", cause,
        description: cause instanceof Error ? cause.message : "O comprovante continua indisponível.",
      });
    } finally {
      sendingRef.current = false;
      setBusy(false);
      setRecovering(false);
    }
  }

  return { pending, busy, result, failure, send, recover, closeResult: () => setResult(null), closeFailure: () => setFailure(null) };
}
