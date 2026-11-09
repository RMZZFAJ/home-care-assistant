"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, buttonClass, Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { useRequisitionOpeningReference } from "./requisition-opening";

type Reference = { version: number; materialIdentity: string };
type Opening = {
  id: string;
  actor_name: string | null;
  reference_version: number;
  recorded_at: string;
};
type Cursor = { at: string; id: string };
type Trail = { data: Opening[]; next: Cursor | null };

/** Mount only alongside successfully rendered REQ content. GET/prefetch is inert. */
export function RequisitionDisplay({
  id,
  reference,
  showHistory = false,
  onRecorded,
}: {
  id: string;
  reference?: Reference;
  showHistory?: boolean;
  onRecorded?: (id: string) => void;
}) {
  const context = useRequisitionOpeningReference();
  const version = reference?.version ?? context?.version,
    material = reference?.materialIdentity ?? context?.materialIdentity;
  const frozenRef = useRef<{
    referenceVersion: number;
    materialIdentity: string;
    openingKey: string;
  } | null>(null);
  const savedRef = useRef(false),
    busyRef = useRef(false),
    aliveRef = useRef(true);
  const [saved, setSaved] = useState<Opening | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  const record = useCallback(async () => {
    if (
      !version ||
      !material ||
      savedRef.current ||
      busyRef.current ||
      document.visibilityState !== "visible"
    )
      return;
    frozenRef.current ??= {
      referenceVersion: version,
      materialIdentity: material,
      openingKey: crypto.randomUUID(),
    };
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await api<{ data: Opening }>(
        `/api/requisitions/${id}/openings`,
        frozenRef.current,
      );
      savedRef.current = true;
      onRecorded?.(result.data.id);
      if (aliveRef.current) {
        setSaved(result.data);
        setError("");
      }
    } catch (cause) {
      if (aliveRef.current)
        setError(
          cause instanceof Error ? cause.message : "Resposta não confirmada.",
        );
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }, [id, material, version, onRecorded]);
  useEffect(() => {
    let first = 0,
      second = 0;
    const schedule = () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      if (document.visibilityState === "visible")
        first = requestAnimationFrame(() => {
          second = requestAnimationFrame(() => {
            void record();
          });
        });
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [record]);
  return (
    <>
      {error ? (
        <div className="space-y-2">
          <Notice error>
            O conteúdo está disponível, mas não foi possível confirmar o
            registro de abertura. {error}
          </Notice>
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() => void record()}
          >
            {busy
              ? "Registrando abertura…"
              : "Recuperar registro desta abertura"}
          </button>
        </div>
      ) : null}
      {showHistory ? (
        <OpeningHistory id={id} refreshKey={saved?.id ?? "initial"} />
      ) : null}
    </>
  );
}

export function OpeningHistory({
  id,
  refreshKey,
}: {
  id: string;
  refreshKey: string;
}) {
  const [trail, setTrail] = useState<Trail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api<Trail>(
      `/api/requisitions/${id}/openings`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setTrail(result);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [id, refreshKey, attempt]);
  async function more() {
    if (!trail?.next || busy) return;
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({
        beforeAt: trail.next.at,
        beforeId: trail.next.id,
      });
      const result = await api<Trail>(
        `/api/requisitions/${id}/openings?${query}`,
      );
      setTrail({ data: [...trail.data, ...result.data], next: result.next });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar outras aberturas.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="ui-card">
      <summary className="cursor-pointer font-semibold">
        Aberturas informadas pelo aplicativo
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-(--muted)">
          O aplicativo informou exibição em primeiro plano. O horário é do
          registro no servidor; não comprova atenção ou leitura integral.
        </p>
        {error ? <Notice error>{error}</Notice> : null}
        {!trail && !error ? <Notice>Consultando aberturas…</Notice> : null}
        {trail?.data.length === 0 ? (
          <p>Nenhuma abertura informada neste histórico.</p>
        ) : null}
        {trail ? (
          <ul className="space-y-2">
            {trail.data.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-(--line) p-3 text-sm break-words"
              >
                <strong>
                  {row.actor_name ?? "Nome não preservado no registro"}
                </strong>
                <p>
                  {formatBrazilDate(row.recorded_at)} · Referência documental v
                  {row.reference_version}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="ui-form-actions">
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Atualizar aberturas
          </button>
          {trail?.next ? (
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void more()}
            >
              {busy ? "Consultando…" : "Carregar aberturas anteriores"}
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}
