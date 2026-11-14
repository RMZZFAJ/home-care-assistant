"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, Notice } from "@/components/workspace";
import { ActionButton } from "@/components/ui/controls";
import { invitationIntent, invitationIntentKey, parseInvitationRead, type InvitationIntent, type InvitationPreview } from "@/lib/validation/invitation";

type Read = ReturnType<typeof parseInvitationRead>;
export function InvitationDecision({ token, actorId, preview, onRead }: {
  token: string; actorId: string; preview: InvitationPreview;
  onRead: (read: Read, confirmed?: "accept" | "decline") => void;
}) {
  const state = preview.state;
  const key = invitationIntentKey({ token, expectedActor: actorId });
  const [saved, setSaved] = useState<{ intent: InvitationIntent | null; error: string }>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      const intent = raw ? invitationIntent.parse(JSON.parse(raw)) : null;
      if (intent && (intent.token !== token || intent.expectedActor !== actorId)) throw new Error("Wrong invitation scope");
      return { intent, error: "" };
    } catch { return { intent: null, error: "Não foi possível ler a referência desta decisão neste aparelho. Preserve o link e procure apoio antes de decidir." }; }
  });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [activityStage, setActivityStage] = useState(0);
  useOperationActivity(busy, { title: "Seu acesso está sendo preparado", detail: "Você continuará assim que a decisão e o vínculo forem confirmados.", stage: activityStage, steps: [{ label: "Confirmando seu convite", icon: "file" }, { label: "Registrando sua decisão", icon: "users" }, { label: "Conferindo o acesso ao paciente", icon: "home" }] });
  const aliveRef = useRef(true), sendingRef = useRef(false), settledRef = useRef(false);
  const intentRef = useRef(saved.intent);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
    intentRef.current = null;
    setSaved({ intent: null, error: "" });
  }, [key]);
  const apply = useCallback((read: Read) => {
    if (!aliveRef.current) return true;
    const intent = intentRef.current;
    if (read.actorId !== actorId) {
      setError("A conta mudou. Consulte o convite com a conta correta antes de recuperar a decisão.");
      onRead(read);
      return true;
    }
    const terminal = ["accepted", "declined", "expired", "revoked", "invalid"].includes(read.data.state);
    if (!terminal) { onRead(read); return false; }
    const confirmed = intent && ((intent.decision === "accept" && read.data.state === "accepted") || (intent.decision === "decline" && read.data.state === "declined")) ? intent.decision : undefined;
    if (intent) clear();
    if (confirmed && sessionStorage.getItem("hca:invitation") === token) sessionStorage.removeItem("hca:invitation");
    if (intent && !confirmed) setError("A situação do convite mudou. A decisão preservada não foi confirmada; confira o resultado atual.");
    onRead(read, confirmed);
    return true;
  }, [actorId, clear, onRead, token]);
  useEffect(() => {
    if (state === "ready" || settledRef.current || !intentRef.current) return;
    queueMicrotask(() => {
      if (!aliveRef.current || settledRef.current) return;
      settledRef.current = true;
      try { apply({ data: preview, actorId }); }
      catch { setError("O resultado está registrado, mas não foi possível encerrar a referência neste aparelho. Consulte novamente."); }
    });
  }, [state, preview, actorId, apply]);
  async function consult() {
    return parseInvitationRead(await api<unknown>("/api/invitations/preview", { token }));
  }
  async function send(decision?: "accept" | "decline", readOnly = false) {
    if (sendingRef.current || saved.error) return;
    sendingRef.current = true; setBusy(true); setError("");
    setActivityStage(0);
    let phase: "read" | "post" = "read";
    const recovering = Boolean(intentRef.current);
    try {
      let intent = intentRef.current;
      if (decision) {
        if (intent) throw new Error("Recupere a decisão anterior antes de escolher outra.");
        intent = invitationIntent.parse({ token, expectedActor: actorId, decision });
        try { sessionStorage.setItem(key, JSON.stringify(intent)); }
        catch { throw new Error("Não foi possível guardar a referência desta decisão neste aparelho. Nenhuma decisão foi enviada. Preserve o link e tente novamente."); }
        intentRef.current = intent; setSaved({ intent, error: "" });
      } else {
        const read = await consult();
        if (!aliveRef.current || apply(read)) return;
        if (read.data.state !== "ready") throw new Error("O convite ainda não permite recuperar esta decisão.");
        if (readOnly || !intent) return;
      }
      if (!intent || !aliveRef.current) return;
      phase = "post";
      setActivityStage(1);
      await api<unknown>("/api/invitations/accept", intent);
      if (!aliveRef.current) return;
      phase = "read";
      setActivityStage(2);
      const read = await consult();
      if (!aliveRef.current || apply(read)) return;
      setError("O resultado da decisão ainda não foi confirmado. Recupere a mesma tentativa antes de decidir novamente.");
    } catch (reason) {
      if (!aliveRef.current) return;
      if (phase === "post" && !recovering && reason instanceof ApiError && reason.status > 0 && reason.status < 500) {
        try { clear(); } catch { setError("A decisão foi recusada, mas sua referência não pôde ser encerrada neste aparelho. Consulte o resultado antes de tentar novamente."); return; }
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a decisão. Consulte a mesma tentativa.");
    } finally {
      sendingRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }
  if (state !== "ready" && !saved.intent && !error && !saved.error) return null;
  return <div className="hca-access-form" aria-label="Decisão do convite">
    {saved.error || error ? <Notice error>{saved.error || error}</Notice> : null}
    {saved.intent ? <>
      <Notice>A tentativa de {saved.intent.decision === "accept" ? "aceite" : "recusa"} está preservada para esta conta e este convite. Uma consulta não muda o vínculo.</Notice>
      <div className="hca-toolbar"><ActionButton variant="primary" disabled={busy} onClick={() => void send()}>Recuperar decisão do convite</ActionButton><ActionButton disabled={busy} onClick={() => void send(undefined, true)}>Consultar resultado sem reenviar</ActionButton></div>
    </> : state === "ready" ? <>
      <p>Confira este vínculo. O aceite concede somente a função e o paciente apresentados; não altera sua identidade global.</p>
      <div className="hca-toolbar"><ActionButton variant="primary" disabled={busy || Boolean(saved.error) || Boolean(error)} onClick={() => void send("accept")}>{busy ? "Confirmando…" : "Aceitar convite com minha conta"}</ActionButton><ActionButton disabled={busy || Boolean(saved.error) || Boolean(error)} onClick={() => void send("decline")}>Recusar convite</ActionButton></div>
      {error ? <ActionButton disabled={busy} onClick={() => void send(undefined, true)}>Consultar situação do convite</ActionButton> : null}
    </> : null}
  </div>;
}
