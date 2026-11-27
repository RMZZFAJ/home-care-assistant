"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { api, ApiError } from "@/lib/client/api";
import { invitationIntent, invitationIntentKey, parseInvitationRead, type InvitationIntent, type InvitationPreview } from "@/lib/validation/invitation";

type Read = ReturnType<typeof parseInvitationRead>;
const savedAttempt = z.strictObject({ intent: invitationIntent, retries: z.number().int().min(0).max(operationRecoveryLimit) });
type SavedAttempt = z.infer<typeof savedAttempt>;
type Failure = { cause?: unknown; uncertain: boolean; storageUnavailable?: boolean };

function restore(key: string, token: string, actorId: string) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { pending: null };
    const value: unknown = JSON.parse(raw);
    const stored = savedAttempt.safeParse(value);
    const pending = stored.success ? stored.data : { intent: invitationIntent.parse(value), retries: 0 };
    if (pending.intent.token !== token || pending.intent.expectedActor !== actorId) throw new Error("Wrong invitation scope");
    return { pending };
  } catch {
    return { pending: null, error: "Não foi possível ler a referência desta decisão. Preserve o link e procure apoio antes de decidir." };
  }
}

const decisionSteps = [
  { label: "Confirmando seu convite", icon: "file" },
  { label: "Registrando sua decisão", icon: "users" },
  { label: "Conferindo o resultado", icon: "home" },
] as const;

export function InvitationDecision({ token, actorId, preview, isCurrent, onRead }: {
  token: string; actorId: string; preview: InvitationPreview;
  isCurrent: () => boolean;
  onRead: (read: Read, confirmed?: InvitationIntent["decision"]) => void;
}) {
  const key = invitationIntentKey({ token, expectedActor: actorId });
  const [initial] = useState(() => restore(key, token, actorId));
  const [pending, setPending] = useState(initial.pending);
  const [failure, setFailure] = useState<Failure | null>(initial.pending && preview.state === "ready" ? { uncertain: true } : null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [stage, setStage] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const aliveRef = useRef(false);
  const activeRequestRef = useRef(false);
  const attemptRef = useRef(pending);
  const declineButtonRef = useRef<HTMLButtonElement>(null);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);
  useOperationActivity(stage !== null, { title: "Confirmando a decisão do convite", stage: stage ?? 0, steps: decisionSteps });
  useOperationActivity(checking, { title: "Consultando o resultado do convite" });

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const finishIfSettled = useCallback((result: Read) => {
    const attempt = attemptRef.current;
    if (result.actorId !== actorId || result.data.state === "ready") {
      onRead(result);
      return result.actorId !== actorId;
    }
    const decision = attempt?.intent.decision;
    const confirmed = decision === "accept" && result.data.state === "accepted" || decision === "decline" && result.data.state === "declined";
    if (attempt) {
      try { sessionStorage.removeItem(key); } catch { /* A later read can confirm the same terminal result. */ }
      attemptRef.current = null;
      setPending(null);
    }
    onRead(result, confirmed ? decision : undefined);
    return true;
  }, [actorId, key, onRead]);

  useEffect(() => {
    if (preview.state === "ready" || !attemptRef.current) return;
    void Promise.resolve().then(() => {
      if (aliveRef.current && isCurrent() && attemptRef.current) finishIfSettled({ actorId, data: preview });
    });
  }, [actorId, finishIfSettled, isCurrent, preview]);

  async function run(decision?: InvitationIntent["decision"], readOnly = false) {
    if (activeRequestRef.current || initial.error || !isCurrent()) return;
    const previous = attemptRef.current;
    if (decision ? previous !== null : !previous || previous.retries >= operationRecoveryLimit) return;
    const attempt: SavedAttempt = previous ? { ...previous, retries: previous.retries + 1 } : {
      intent: { token, expectedActor: actorId, decision: decision! }, retries: 0,
    };
    try { sessionStorage.setItem(key, JSON.stringify(attempt)); }
    catch {
      setConfirmDecline(false);
      setFailure({ uncertain: Boolean(previous), storageUnavailable: true });
      return;
    }
    attemptRef.current = attempt;
    setPending(attempt); setConfirmDecline(false); setFailure(null);
    activeRequestRef.current = true;
    if (readOnly) setChecking(true); else setStage(0);
    let posted = false;
    let reading = Boolean(previous);
    try {
      const consult = async () => parseInvitationRead(await api<unknown>("/api/invitations/preview", { token }));
      if (previous) {
        const current = await consult();
        if (!aliveRef.current || !isCurrent() || finishIfSettled(current)) return;
        if (readOnly || current.data.state !== "ready") throw new Error("A consulta ainda não confirmou a decisão.");
      }
      if (!aliveRef.current || !isCurrent()) return;
      setStage(1); reading = false; posted = true;
      await api("/api/invitations/accept", attempt.intent);
      if (!aliveRef.current || !isCurrent()) return;
      setStage(2); reading = true;
      const result = await consult();
      if (!aliveRef.current || !isCurrent() || finishIfSettled(result)) return;
      throw new Error("A consulta ainda não confirmou a decisão.");
    } catch (cause) {
      if (!aliveRef.current || !isCurrent()) return;
      const rejected = posted && !reading && !previous && cause instanceof ApiError && cause.status >= 400 && cause.status < 500
        && cause.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED"].includes(cause.code ?? "");
      if (rejected) {
        try { sessionStorage.removeItem(key); } catch { /* The terminal state can still be consulted. */ }
        attemptRef.current = null; setPending(null);
      }
      setFailure({ cause, uncertain: !rejected });
    } finally {
      activeRequestRef.current = false;
      if (aliveRef.current) { setStage(null); setChecking(false); }
    }
  }

  if (preview.state !== "ready") return null;
  const attempts = pending?.retries ?? 0;
  const canRecover = failure?.uncertain && !failure.storageUnavailable && pending && attempts < operationRecoveryLimit;
  const inFlight = stage !== null || checking;
  return <>
    {initial.error ? <FeedbackBanner tone="error">{initial.error}</FeedbackBanner> : pending ? <div className="hca-invitation-actions">
      <ActionButton ref={recoveryButtonRef} variant="primary" disabled={inFlight} onClick={() => setFailure({ uncertain: true })}>Conferir decisão do convite</ActionButton>
    </div> : <div className="hca-invitation-actions">
      <ActionButton ref={declineButtonRef} disabled={inFlight} onClick={() => setConfirmDecline(true)}>Recusar convite</ActionButton>
      <ActionButton variant="primary" disabled={inFlight} onClick={() => void run("accept")}><Icon name="check" />Aceitar convite</ActionButton>
    </div>}
    {confirmDecline ? <Dialog open title="Recusar convite?" headingIcon="shield" onClose={() => setConfirmDecline(false)} finalFocus={declineButtonRef}
      footer={<><ActionButton onClick={() => setConfirmDecline(false)}>Voltar</ActionButton><ActionButton variant="primary" onClick={() => void run("decline")}>Recusar convite</ActionButton></>}>
      <p>Nenhum vínculo será criado. Se mudar de ideia, solicite outro convite.</p>
    </Dialog> : null}
    {failure ? <DocumentOperationFailureDialog
      title={failure.uncertain ? "Não foi possível confirmar a decisão" : "Não foi possível registrar a decisão"}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.cause}
      description={failure.storageUnavailable ? "A referência da decisão não pôde ser guardada nesta aba. Nenhuma nova solicitação foi enviada."
        : failure.uncertain ? "Consulte a mesma decisão para verificar o que foi registrado."
          : failure.cause instanceof Error ? failure.cause.message : "Consulte a situação atual do convite."}
      operation="Decidir convite" fallbackCode="CONVITE_DECISAO_NAO_CONFIRMADA" attempts={attempts}
      guidance="Preserve o link para acessar o convite pela conta convidada."
      exhaustedMessage={attempts >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      action={canRecover ? { label: "Recuperar decisão do convite", onClick: () => void run() } : undefined}
      readOnlyAction={canRecover ? { label: "Consultar resultado sem reenviar", onClick: () => void run(undefined, true) } : undefined}
      closeLabel="Voltar" onClose={() => setFailure(null)} finalFocus={pending ? recoveryButtonRef : undefined} /> : null}
  </>;
}
