"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { api, ApiError, Notice } from "@/components/workspace";
import { Icon } from "@/components/ui/icon";
import { formatBrazilDate } from "@/lib/receipt";
import { documentAccessOutcomeSchema, parseDocumentAccessHistory, type DocumentAccessCursor } from "@/lib/documents/document-access";

/** Mount beside issued, successfully displayed content, never on a GET/prefetch. */
export function DocumentAccessObservation({ id, version, onRecorded }: { id: string; version: number; onRecorded?: (id: string) => void }) {
  const packetRef = useRef<{ referenceVersion: number; key: string } | null>(null);
  const savedRef = useRef(false), sendingRef = useRef(false), aliveRef = useRef(true);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  const record = useCallback(async () => {
    if (savedRef.current || sendingRef.current || document.visibilityState !== "visible") return;
    packetRef.current ??= { referenceVersion: version, key: crypto.randomUUID() };
    sendingRef.current = true; setBusy(true);
    try {
      const result = await api<{ data: unknown }>("/api/documents/" + id + "/access", packetRef.current);
      const row = documentAccessOutcomeSchema.parse(result.data);
      if (row.documentId !== id || row.referenceVersion !== version) throw new Error("A resposta não corresponde ao acesso desta ficha.");
      savedRef.current = true;
      if (aliveRef.current) { onRecorded?.(row.id); setError(""); }
    } catch (cause) {
      if (aliveRef.current) setError(cause instanceof Error ? cause.message : "Resposta não confirmada.");
    } finally {
      sendingRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }, [id, version, onRecorded]);
  useEffect(() => {
    let first = 0, second = 0;
    const schedule = () => {
      cancelAnimationFrame(first); cancelAnimationFrame(second);
      if (document.visibilityState === "visible") first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => { void record(); });
      });
    };
    schedule(); document.addEventListener("visibilitychange", schedule);
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); document.removeEventListener("visibilitychange", schedule); };
  }, [record]);
  return error ? <div className="hca-form-stack">
    <Notice error>O conteúdo está disponível, mas o registro de acesso não foi confirmado. {error}</Notice>
    <ActionButton disabled={busy} onClick={() => void record()}>{busy ? "Consultando registro…" : "Recuperar registro deste acesso"}</ActionButton>
  </div> : null;
}

type HistoryProps = { id: string; refreshKey: string; authorized: boolean; collapsible?: boolean };
export function DocumentAccessHistory({ id, refreshKey, authorized, collapsible = false }: HistoryProps) {
  return <AccessHistoryPage key={id + ":" + authorized} id={id} refreshKey={refreshKey} authorized={authorized} collapsible={collapsible} />;
}
function AccessHistoryPage({ id, refreshKey, authorized, collapsible }: HistoryProps) {
  type History = ReturnType<typeof parseDocumentAccessHistory>;
  const [trail, setTrail] = useState<History | null>(null), [error, setError] = useState("");
  const [completedScope, setCompletedScope] = useState(""), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const scope = id + ":" + refreshKey + ":" + attempt, loading = authorized && completedScope !== scope;
  const generationRef = useRef(0);
  useEffect(() => {
    if (!authorized) return;
    const controller = new AbortController();
    const currentGeneration = ++generationRef.current;
    void api<{ data: unknown }>("/api/documents/" + id + "/access", undefined, controller.signal)
      .then(result => { const value = parseDocumentAccessHistory(result.data, id); if (!controller.signal.aborted) { setTrail(value); setError(""); } })
      .catch(cause => { if (!controller.signal.aborted) { if (cause instanceof ApiError && [401,403,404].includes(cause.status)) setTrail(null); setError(cause instanceof Error ? cause.message : "Consulta indisponível."); } })
      .finally(() => { if (!controller.signal.aborted) setCompletedScope(scope); });
    return () => { generationRef.current = currentGeneration + 1; controller.abort(); };
  }, [id, authorized, scope]);
  async function more(cursor: DocumentAccessCursor) {
    if (busy || loading || !trail || !authorized) return;
    const currentGeneration = generationRef.current;
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams({ beforeAt: cursor.at, beforeId: cursor.id });
      const result = await api<{ data: unknown }>("/api/documents/" + id + "/access?" + query);
      const next = parseDocumentAccessHistory(result.data, id);
      const seen = new Set(trail.data.map(row => row.id));
      if (next.data.some(row => seen.has(row.id))) throw new Error("A continuação repetiu registros já consultados.");
      if (next.data.some(row => Date.parse(row.recordedAt) > Date.parse(cursor.at) || row.recordedAt === cursor.at && row.id >= cursor.id)) throw new Error("A página não corresponde à continuação do histórico.");
      if (generationRef.current !== currentGeneration) return;
      setTrail(previous => previous ? { ...next, data: [...previous.data, ...next.data] } : null);
    } catch (cause) {
      if (generationRef.current === currentGeneration) {
        if (cause instanceof ApiError && [401,403,404].includes(cause.status)) setTrail(null);
        setError(cause instanceof Error ? cause.message : "Não foi possível consultar os acessos anteriores.");
      }
    } finally { if (generationRef.current === currentGeneration) setBusy(false); }
  }
  const title = collapsible ? "Aberturas informadas pelo aplicativo" : "Histórico de acesso";
  const content = <div className={collapsible ? "mt-4 hca-form-stack" : "hca-form-stack"}>
    <p>O aplicativo informou exibição em primeiro plano. Isso não comprova atenção, leitura integral ou ciência. Novos acessos da mesma pessoa à mesma versão são agrupados em janelas de 20 minutos; os registros anteriores permanecem preservados.</p>
    {!authorized ? <Notice>O histórico de acesso exige uma competência específica neste paciente. Consultar a ficha não concede essa competência.</Notice> : <>
      {error ? <Notice error>{error}</Notice> : null}
      {trail && error ? <p className="hca-field-help">Consulta anterior preservada; a atualização não foi confirmada.</p> : null}
      {loading ? <Notice>{trail ? "Atualizando histórico; a consulta anterior permanece identificada abaixo." : "Consultando histórico de acesso…"}</Notice> : null}
      {trail?.data.length === 0 ? <p>{collapsible ? "Nenhuma abertura informada neste histórico." : "Nenhum acesso informado neste histórico."}</p> : null}
      {trail ? <ol className="hca-event-feed">{trail.data.map(row => <li key={row.id} className="hca-progress-event">
        <span className="hca-event-marker"><Icon name="clock" /></span>
        <div className="hca-event-body"><div className="hca-event-heading">
          <strong className="min-w-0 wrap-break-word">{row.actorName?.trim() ? row.actorName : "Nome não preservado no registro"}</strong><time dateTime={row.recordedAt}>{formatBrazilDate(row.recordedAt)}</time>
        </div><p className="hca-event-meta">Referência documental v{row.referenceVersion} · Exibição informada pelo aplicativo</p></div>
      </li>)}</ol> : null}
      <div className="hca-toolbar">
        <ActionButton disabled={loading || busy} onClick={() => { generationRef.current++; setError(""); setAttempt(value => value + 1); }}>{collapsible ? "Atualizar aberturas" : "Atualizar acessos"}</ActionButton>
        {trail?.next ? <ActionButton disabled={loading || busy} onClick={() => { if (trail.next) void more(trail.next); }}>{busy ? "Consultando…" : collapsible ? "Carregar aberturas anteriores" : "Carregar acessos anteriores"}</ActionButton> : null}
      </div>
    </>}
  </div>;
  return collapsible ? <details className="ui-card" aria-busy={loading || busy}><summary className="cursor-pointer font-semibold">{title}</summary>{content}</details>
    : <section className="ui-card hca-form-stack" aria-label="Histórico de acesso à ficha" aria-busy={loading || busy}><h2>{title}</h2>{content}</section>;
}
