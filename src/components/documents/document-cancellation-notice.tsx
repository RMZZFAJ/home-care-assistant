"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, buttonClass, Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { cancellationAcknowledgementSchema, parseCancellationAwareness, type CancellationAwareness } from "@/lib/documents/cancellation-awareness";

type Props = { document: { id: string }; userId: string; activeContext: boolean; onRecorded: () => void };
export function DocumentCancellationNotice({ document, userId, activeContext, onRecorded }: Props) {
  const id = document.id;
  const [data, setData] = useState<CancellationAwareness | null>(null);
  const [checking, setChecking] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [checked, setChecked] = useState(false);
  const sequenceRef = useRef(0), sendingRef = useRef(false), autoReadPausedRef = useRef(false);
  const invalidate = useCallback(() => { sequenceRef.current++; }, []);
  const endpoint = `/api/documents/${id}/cancellation`;
  const scope = `hca:cancellation-awareness:${userId}:${id}:`;
  const load = useCallback(async () => {
    const own = ++sequenceRef.current;
    setChecking(true); setChecked(false);
    try {
      const raw = await api<{ data: unknown }>(endpoint);
      const value = parseCancellationAwareness(raw.data, id, userId);
      if (sequenceRef.current !== own) return;
      setData(value); setChecked(true); setError("");
      if (value.personalAcknowledgement && value.cancellation) { try { sessionStorage.removeItem(scope + value.cancellation.id); } catch { /* The confirmed server fact remains authoritative. */ } }
    } catch {
      if (sequenceRef.current === own) { setData(null); setError("Não foi possível consultar a ciência do cancelamento. Consulte novamente antes de confirmar."); }
    } finally { if (sequenceRef.current === own) setChecking(false); }
  }, [endpoint, id, userId, scope]);
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => { if (live && !autoReadPausedRef.current) void load(); });
    return () => { live = false; invalidate(); };
  }, [load, invalidate, document]);
  async function acknowledge() {
    if (sendingRef.current || !data?.cancellation || !checked || !activeContext) return;
    sendingRef.current = true; autoReadPausedRef.current = true; invalidate(); setChecking(false); setBusy(true); setError("");
    const eventId = data.cancellation.id;
    try {
      let candidate: ReturnType<typeof cancellationAcknowledgementSchema.safeParse> | null = null;
      try { candidate = cancellationAcknowledgementSchema.safeParse(JSON.parse(sessionStorage.getItem(scope + eventId) ?? "null")); } catch { /* A corrupt hint is never sent; the successful own lookup remains authoritative. */ }
      const intention = candidate?.success && candidate.data.cancellationEventId === eventId ? candidate.data : { cancellationEventId: eventId, idempotencyKey: crypto.randomUUID() };
      try { sessionStorage.setItem(scope + eventId, JSON.stringify(intention)); } catch { /* Own actor/event lookup and transactional deduplication also recover without this optional hint. */ }
      const raw = await api<{ data: unknown }>(endpoint, intention);
      const value = parseCancellationAwareness(raw.data, id, userId);
      if (!value.personalAcknowledgement || value.cancellation?.id !== eventId)
        throw new Error("A resposta não confirmou sua ciência. Consulte a mesma tentativa.");
      setData(value); setChecked(true); autoReadPausedRef.current = false;
      try { sessionStorage.removeItem(scope + eventId); } catch { /* Confirmation is already authoritative. */ }
      onRecorded();
    } catch (reason) {
      if (reason instanceof ApiError && [401, 403].includes(reason.status)) setData(null);
      setChecked(false);
      setError(reason instanceof Error ? reason.message : "Sua confirmação ainda não foi comprovada. Consulte a mesma tentativa.");
    } finally { sendingRef.current = false; setBusy(false); }
  }
  return <section className="ui-card space-y-3" aria-label="Ciência do cancelamento">
    <h2>Ciência do cancelamento</h2>
    <p>O conteúdo emitido e as ciências anteriores permanecem preservados. Esta confirmação registra somente que você tomou ciência do cancelamento; não desfaz recebimentos nem altera estoque.</p>
    {checking ? <p role="status">Consultando a ciência do cancelamento…</p> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {data?.state === "unavailable" ? <Notice>O ato original de cancelamento não foi preservado neste registro. Nenhuma ciência será presumida.</Notice> : null}
    {data?.state === "not_cancelled" ? <Notice>A situação da ficha mudou. Atualize a ficha para consultar os atos vigentes.</Notice> : null}
    {data?.cancellation ? <>
      <p>Cancelamento registrado por {data.cancellation.actorName} · {formatBrazilDate(data.cancellation.recordedAt)}</p>
      <p className="whitespace-pre-wrap wrap-break-word">Motivo: {data.cancellation.reason}</p>
      {data.firstAcknowledgement ? <p>Ciência familiar registrada por {data.firstAcknowledgement.actorName} · {formatBrazilDate(data.firstAcknowledgement.recordedAt)}</p>
        : <Notice>Este cancelamento ainda aguarda ciência de uma pessoa habilitada pela família.</Notice>}
      {data.personalAcknowledgement ? <p role="status">Sua ciência do cancelamento está registrada em {formatBrazilDate(data.personalAcknowledgement.recordedAt)}.</p>
        : data.eligible ? <>
          {!activeContext ? <Notice>Selecione o paciente desta ficha para registrar sua ciência.</Notice> : null}
          <button className={buttonClass} type="button" disabled={busy || (!checked && !checking) || !activeContext} aria-disabled={checking || !checked || undefined} onClick={() => void acknowledge()}>{busy ? "Confirmando sua ciência…" : "Estou ciente deste cancelamento"}</button>
        </> : <p>A confirmação depende de uma pessoa habilitada para ciência familiar. A leitura desta ficha não registra ciência.</p>}
    </> : null}
    <button className={buttonClass} type="button" disabled={busy || checking} onClick={() => { autoReadPausedRef.current = false; void load(); }}>Consultar minha confirmação</button>
  </section>;
}
