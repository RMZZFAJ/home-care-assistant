"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/client/api";
import { retryAfterTime } from "@/lib/push/retry-after";
import { pushTestLookup, pushTestReceipt } from "@/lib/push/subscription";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import "./personal-push-test.css";

const url = "/api/push/test";
const waitLimit = 30_000;
const checkInterval = 2_000;
const attemptSchema = pushTestLookup.extend({ checks: z.number().int().min(0).max(operationRecoveryLimit) });
type Attempt = z.infer<typeof attemptSchema>;
type Receipt = z.infer<typeof pushTestReceipt>;
type Result = {
  title: string;
  description: string;
  state: "accepted" | "rejected" | "expired" | "limited" | "uncertain";
  deviceId: string;
  retryAt?: number;
  cause?: unknown;
};

function unconfirmed(deviceId: string, cause?: unknown, timedOut = false): Result {
  return {
    deviceId, state: "uncertain",
    title: timedOut ? "O teste não respondeu a tempo" : "Não foi possível confirmar o teste",
    description: timedOut
      ? "O prazo de 30 segundos terminou. O resultado do envio ainda está em aberto."
      : "A tentativa continua sem resultado confirmado. Consulte o mesmo teste para conferir o envio.",
    cause,
  };
}

function resultOf(receipt: Receipt, deviceId: string): Result | undefined {
  const retryAt = Date.parse(receipt.retryAt ?? receipt.requestedAt);
  const availableAt = receipt.retryAt ? retryAt : retryAt + 60_000;
  if (receipt.state === "accepted") return {
    deviceId, state: "accepted", retryAt: availableAt,
    title: "Teste aceito pelo serviço",
    description: "O serviço aceitou este teste. Confira se o aviso apareceu neste aparelho. A aceitação ainda não confirma a exibição.",
  };
  if (receipt.state === "expired") return {
    deviceId, state: "expired", retryAt: availableAt,
    title: "A inscrição do aparelho ficou indisponível",
    description: "Confira os avisos deste aparelho e confirme a ativação com a sessão atual, se necessário.",
  };
  if (receipt.state !== "failed") return;
  return {
    deviceId, state: receipt.code === "PUSH_PROVIDER_RATE_LIMITED" ? "limited" : "rejected", retryAt: availableAt,
    title: receipt.code === "PUSH_PROVIDER_RATE_LIMITED" ? "Limite de testes atingido" : "O serviço não aceitou o teste",
    description: "Aguarde o intervalo informado antes de solicitar um novo teste.",
  };
}

async function lookup(attempt: Attempt, signal: AbortSignal, timeoutMs: number) {
  const query = new URLSearchParams({ deviceId: attempt.deviceId, idempotencyKey: attempt.idempotencyKey });
  const body = await api<{ data: unknown }>(url + "?" + query, undefined, signal, "GET", { timeoutMs });
  return pushTestReceipt.nullable().parse(body.data);
}

export function PersonalPushTest({ deviceId, shown, eligible, contextReference, active, offline, readyRegistration, refreshDevice }: {
  deviceId?: string;
  shown: boolean;
  eligible: boolean;
  contextReference?: string;
  active: boolean;
  offline: boolean;
  readyRegistration: () => ServiceWorkerRegistration | null;
  refreshDevice: () => void;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Result>();
  const [waiting, setWaiting] = useState<"sending" | "checking" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clock, setClock] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const storageKey = contextReference && "hca:push-test:v1:" + contextReference;
  useEffect(() => {
    if (!storageKey) return;
    let activeRead = true;
    queueMicrotask(() => {
      if (!activeRead) return;
      try {
        const stored = attemptSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
        if (!stored.success) return;
        setAttempt(stored.data);
        setResult(unconfirmed(stored.data.deviceId));
      } catch {
        // The in-memory reference still supports recovery during this view.
      }
    });
    return () => { activeRead = false; };
  }, [storageKey]);

  const retryAt = result?.deviceId === deviceId ? result?.retryAt : undefined;
  const coolingDown = Boolean(retryAt && retryAt > clock);
  useEffect(() => {
    if (!retryAt || retryAt <= clock) return;
    const delay = Math.max(0, retryAt - Date.now());
    const timer = setTimeout(() => setClock(Date.now()), Math.min(delay + 50, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [retryAt, clock]);

  async function run(recovery: boolean) {
    if (!active || requestRef.current) return;
    if (attempt && (!recovery || attempt.checks >= operationRecoveryLimit)) {
      setDialogOpen(true);
      return;
    }
    if (offline) return;
    let next: Attempt;
    if (attempt) next = { ...attempt, checks: attempt.checks + 1 };
    else {
      if (!deviceId || !eligible || !contextReference || coolingDown || !readyRegistration()) return;
      next = { deviceId, idempotencyKey: crypto.randomUUID(), checks: 0 };
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const { signal } = controller;
    const finish = (resolved: Result | undefined, cause?: unknown, timedOut = false) => {
      if (signal.aborted) return;
      setClock(Date.now());
      setResult(resolved ?? unconfirmed(next.deviceId, cause, timedOut));
      if (resolved) {
        setAttempt(null);
        try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { /* In-memory attempt was cleared. */ }
      }
      setDialogOpen(true);
    };
    setAttempt(next);
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the in-memory reference. */ }
    setDialogOpen(false);
    setWaiting(recovery ? "checking" : "sending");
    const deadline = performance.now() + waitLimit;
    try {
      if (recovery) {
        const receipt = await lookup(next, signal, waitLimit);
        finish(receipt ? resultOf(receipt, next.deviceId) : undefined);
        return;
      }
      const body = await api<{ data: unknown }>(url, { deviceId: next.deviceId, idempotencyKey: next.idempotencyKey, contextReference }, signal);
      let receipt: Receipt | null = pushTestReceipt.parse(body.data);
      while ((receipt?.state === "pending" || receipt?.state === "processing") && !signal.aborted) {
        const remaining = deadline - performance.now();
        if (remaining <= 0) break;
        await new Promise<void>(resolve => setTimeout(resolve, Math.min(remaining, checkInterval)));
        const timeout = deadline - performance.now();
        if (timeout <= 0 || signal.aborted) break;
        receipt = await lookup(next, signal, timeout);
      }
      finish(receipt ? resultOf(receipt, next.deviceId) : undefined, undefined, performance.now() >= deadline);
    } catch (cause) {
      if (!recovery && cause instanceof ApiError && cause.status === 429) {
        const now = Date.now();
        finish({
          deviceId: next.deviceId, state: "limited", title: "Limite de testes atingido",
          description: "O sistema ainda não permite iniciar outro teste neste aparelho.",
          retryAt: retryAfterTime(cause.retryAfter ?? null, now) ?? now + 60_000, cause,
        });
      } else if (!recovery && cause instanceof ApiError && (cause.code === "PUSH_NOT_CONFIGURED" || cause.code === "CLIENT_RUNTIME_BLOCKED")) {
        finish({ deviceId: next.deviceId, state: "rejected", title: "O teste não foi iniciado", description: cause.message, cause });
      } else finish(undefined, cause, cause instanceof ApiError && cause.code === "CONNECTION_TIMEOUT");
    } finally {
      requestRef.current = null;
      if (!signal.aborted) setWaiting(null);
    }
  }

  const close = () => setDialogOpen(false);
  const nextTest = retryAt && coolingDown ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(retryAt) : null;
  const exhausted = Boolean(attempt && attempt.checks >= operationRecoveryLimit);
  const canCheck = Boolean(attempt && !exhausted && !offline);
  const expiredAction = result?.state === "expired"
    ? { label: "Consultar aparelhos", onClick: () => { close(); refreshDevice(); } } : undefined;
  if (!shown && !attempt && !result) return null;
  return <section className="hca-push-block hca-personal-push-test">
    <h3>Teste pessoal</h3>
    <div className="hca-push-block-content">
      {waiting ? <div className="hca-push-test-wait" role="status">
        <Icon name="clock" width={22} height={22} />
        <div>
          <strong>{waiting === "sending" ? "Aguardando o serviço" : "Conferindo o teste"}</strong>
          <p>A resposta será aguardada por até 30 segundos.</p>
          <div className="hca-push-test-track" aria-hidden="true"><span /></div>
          <small>Consulta da mesma tentativa, sem reenvio.</small>
        </div>
      </div> : result ? <p role="status">{result.title}{nextTest ? ` · Próximo teste a partir de ${nextTest}.` : null}</p>
        : <p>Envie um aviso discreto para conferir este aparelho.</p>}
      <ActionButton ref={triggerRef} onClick={() => void run(Boolean(attempt))}
        disabled={Boolean(waiting) || offline && !exhausted || !attempt && (!eligible || coolingDown)}>
        <Icon name={attempt ? "refresh" : "send"} width={16} height={16} />
        {attempt ? exhausted ? "Ver detalhes do teste" : "Conferir este teste" : "Enviar teste"}
      </ActionButton>
      <small>A exibição do aviso é conferida no próprio aparelho.</small>
    </div>
    {active && !waiting && result && dialogOpen && (result.state === "accepted"
      ? <Dialog open success title={result.title} subtitle={result.description} onClose={close} finalFocus={triggerRef}
        footer={<ActionButton variant="primary" onClick={close}>Concluir</ActionButton>}>{null}</Dialog>
      : <DocumentOperationFailureDialog title={result.title}
        description={nextTest ? `${result.description} Novo teste a partir de ${nextTest}.` : result.description}
        outcome={result.state === "uncertain" ? "uncertain" : "rejected"} cause={result.cause}
        operation="Teste pessoal de avisos" fallbackCode={`PUSH_TEST_${result.state.toUpperCase()}`}
        attempts={attempt?.checks ?? 0} attemptReference={attempt?.idempotencyKey}
        guidance={canCheck ? "Consulte a mesma tentativa para verificar o resultado." : undefined}
        exhaustedMessage={exhausted ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
        onClose={close} closeLabel="Voltar" finalFocus={triggerRef}
        action={canCheck ? { label: "Conferir este teste", onClick: () => void run(true) } : expiredAction} />
    )}
  </section>;
}
