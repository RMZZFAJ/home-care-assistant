"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, buttonClass, Notice } from "@/components/workspace";
import { DocumentAccessHistory } from "@/components/documents/document-access";
import { useRequisitionOpeningReference } from "./requisition-opening";

type Reference = { version: number; materialIdentity: string };
type Opening = {
  id: string;
  actor_name: string | null;
  reference_version: number;
  recorded_at: string;
};

/** Mount only alongside successfully rendered REQ content. GET/prefetch is inert. */
export function RequisitionDisplay({
  id,
  reference,
  showHistory = false,
  historyAuthorized = true,
  onRecorded,
}: {
  id: string;
  reference?: Reference;
  showHistory?: boolean;
  historyAuthorized?: boolean;
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
        <OpeningHistory id={id} refreshKey={saved?.id ?? "initial"} authorized={historyAuthorized} />
      ) : null}
    </>
  );
}

export function OpeningHistory(props: { id: string; refreshKey: string; authorized: boolean }) {
  return <DocumentAccessHistory {...props} collapsible />;
}
