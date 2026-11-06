"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import type {
  CreationDraft,
  CreationDraftContent,
  CreationDraftResult,
} from "@/types/creation-drafts";

type Packet = Record<string, unknown> & {
  action: "save" | "discard" | "acknowledge";
  content?: CreationDraftContent;
};
type Options = {
  userId: string;
  patientId: string;
  kind: "REQ" | "BAL" | null;
  targetDocumentId?: string | null;
  enabled?: boolean;
  onResume: (draft: CreationDraft) => boolean;
  onDiscard: () => void;
};

/** Only explicit commands write to the server. A lost response keeps its exact key. */
export function useCreationDraft({
  userId,
  patientId,
  kind,
  targetDocumentId = null,
  enabled = true,
  onResume,
  onDiscard,
}: Options) {
  const [base, setBase] = useState<CreationDraft | null>(null);
  const [offered, setOffered] = useState<CreationDraft | null>(null);
  const [comparison, setComparison] = useState<CreationDraft | null>(null);
  const [conflict, setConflict] = useState(false);
  const [compared, setCompared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readyScope, setReadyScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [readDenied, setReadDenied] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Packet | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlightRef = useRef(false);
  const restorePendingRef = useRef(false);
  const generationRef = useRef(0);
  const active = enabled && kind !== null;
  const storageKey = `hca:private-draft-command:${userId}:${patientId}:${kind}:${targetDocumentId ?? "new"}`;
  const url =
    `/api/drafts?careRecipientId=${patientId}&kind=${kind}` +
    (targetDocumentId ? `&targetDocumentId=${targetDocumentId}` : "");

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generationRef.current;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setBusy(false);
      setReadyScope("");
      setBase(null);
      setOffered(null);
      setComparison(null);
      setConflict(false);
      setCompared(false);
      setPending(null);
      setError("");
      setLoadError("");
      setReadDenied(false);
      restorePendingRef.current = false;
      setLoading(active);
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(storageKey);
        const parsed = raw
          ? creationDraftCommandSchema.safeParse(JSON.parse(raw))
          : null;
        if (
          parsed?.success &&
          parsed.data.careRecipientId === patientId &&
          parsed.data.kind === kind &&
          parsed.data.targetDocumentId === targetDocumentId
        ) {
          restorePendingRef.current = true;
          setPending(parsed.data as Packet);
          setReadyScope(storageKey);
          setLoading(false);
          return;
        }
      } catch {
        // A damaged optional copy cannot select a patient or authorize a command.
      }
      try {
        const result = await api<{ data: CreationDraft | null }>(
          url,
          undefined,
          controller.signal,
        );
        if (current === generationRef.current && !controller.signal.aborted)
          setOffered(result.data);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setLoadError((reason as Error).message);
          setReadDenied(
            reason instanceof ApiError &&
              [401, 403, 404].includes(reason.status),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setReadyScope(storageKey);
          setLoading(false);
        }
      }
    });
    return () => {
      controller.abort();
      generationRef.current = current + 1;
    };
  }, [active, attempt, kind, patientId, storageKey, targetDocumentId, url]);

  async function compare() {
    const current = generationRef.current;
    setBusy(true);
    setError("");
    setCompared(false);
    try {
      const result = await api<{ data: CreationDraft | null }>(url);
      if (current !== generationRef.current) return;
      setComparison(result.data);
      setCompared(true);
    } catch (reason) {
      if (current === generationRef.current) {
        setError((reason as Error).message);
        setReadDenied(
          reason instanceof ApiError && [401, 403, 404].includes(reason.status),
        );
      }
    } finally {
      if (current === generationRef.current) setBusy(false);
    }
  }

  function forgetPending() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Server result remains authoritative. */
    }
  }

  async function send(packet: Packet) {
    if (inFlightRef.current || !active) return;
    inFlightRef.current = true;
    const current = generationRef.current;
    setBusy(true);
    setError("");
    setMessage("");
    setPending(packet);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(packet));
    } catch {
      /* Retained in memory. */
    }
    try {
      const result = (
        await api<{ data: CreationDraftResult }>("/api/drafts", packet)
      ).data;
      if (current !== generationRef.current) return;
      forgetPending();
      setPending(null);
      if (packet.action === "save") {
        const savedDraft: CreationDraft = {
          id: result.id,
          ownerId: userId,
          patientId,
          kind: kind!,
          targetDocumentId,
          schemaVersion: 1,
          revision: result.revision,
          state: result.state,
          createdAt: base?.createdAt ?? result.savedAt,
          savedAt: result.savedAt,
          contentHash: "",
          content: packet.content!,
          consumedDocumentId: result.consumedDocumentId,
        };
        if (restorePendingRef.current && !onResume(savedDraft)) {
          setBase(null);
          setOffered(savedDraft);
        } else {
          setBase(savedDraft);
          setOffered(null);
        }
        restorePendingRef.current = false;
        setMessage(
          "Salvo no servidor. Este preenchimento ainda não foi emitido.",
        );
        if (result.replayed) {
          try {
            const live = (await api<{ data: CreationDraft | null }>(url)).data;
            if (current !== generationRef.current) return;
            if (live?.state === "consumed") {
              setBase(null);
              setOffered(live);
              setMessage(
                "O salvamento foi confirmado e o rascunho já foi usado em uma ficha.",
              );
            } else if (
              live?.id !== result.id ||
              live?.revision !== result.revision
            ) {
              setComparison(live);
              setConflict(true);
              setCompared(true);
              setMessage(
                "O salvamento foi confirmado. Outra edição posterior exige comparação.",
              );
            }
          } catch (reason) {
            if (current !== generationRef.current) return;
            setLoadError(
              "O salvamento foi confirmado. Consulte o estado atual antes de continuar.",
            );
            setReadDenied(
              reason instanceof ApiError &&
                [401, 403, 404].includes(reason.status),
            );
          }
        }
      } else {
        setBase(null);
        setOffered(null);
        setMessage(
          packet.action === "discard"
            ? "Rascunho privado descartado. Você pode começar um novo preenchimento."
            : "Resultado confirmado. Você pode começar um novo preenchimento.",
        );
        onDiscard();
        setAttempt((value) => value + 1);
      }
      return result;
    } catch (reason) {
      if (current !== generationRef.current) return;
      const known =
        reason instanceof ApiError &&
        [400, 401, 403, 404, 409, 413, 422].includes(reason.status);
      if (known) {
        forgetPending();
        setPending(null);
        if (reason.code === "DRAFT_VERSION_CONFLICT") {
          setConflict(true);
          setOffered(null);
          await compare();
        }
        if ([401, 403, 404].includes(reason.status)) {
          // Re-read under live read permission; do not keep protected summaries on denial.
          setBase(null);
          setOffered(null);
          setComparison(null);
          setLoadError("Confira seu acesso e consulte novamente seu rascunho.");
        }
      }
      setError((reason as Error).message);
    } finally {
      inFlightRef.current = false;
      if (current === generationRef.current) setBusy(false);
    }
  }

  function packet(
    action: Packet["action"],
    draft: CreationDraft | null,
    content?: CreationDraftContent,
  ): Packet {
    return {
      careRecipientId: patientId,
      kind,
      targetDocumentId,
      id: draft?.id ?? null,
      expectedRevision: draft?.revision ?? null,
      idempotencyKey: crypto.randomUUID(),
      action,
      ...(content ? { content } : {}),
    };
  }
  function resume(draft = offered) {
    if (!draft?.content || draft.state !== "active" || !onResume(draft)) return;
    setBase(draft);
    setOffered(null);
    setConflict(false);
    setComparison(null);
    setError("");
    setMessage(
      "Rascunho retomado. Revise o catálogo e as referências antes de concluir.",
    );
  }
  const consumed =
    [offered, comparison, base].find((value) => value?.state === "consumed") ??
    null;
  const blocked =
    active &&
    (loading ||
      readyScope !== storageKey ||
      busy ||
      !!loadError ||
      !!offered ||
      conflict ||
      !!pending ||
      !!consumed);
  return {
    active,
    base,
    offered,
    comparison,
    consumed,
    conflict,
    compared,
    loading: active && (loading || readyScope !== storageKey),
    busy,
    pending,
    error,
    loadError,
    readDenied,
    message,
    blocked,
    draftCommit:
      active && base?.state === "active"
        ? { id: base.id, revision: base.revision }
        : undefined,
    reload: () => {
      setLoading(true);
      setAttempt((value) => value + 1);
    },
    compare,
    reportConflict: () => {
      setConflict(true);
      setOffered(null);
      return compare();
    },
    resume,
    keepLocal: () => {
      if (!compared || consumed) return;
      setBase(comparison?.state === "active" ? comparison : null);
      setOffered(null);
      setConflict(false);
      setComparison(null);
      setError("");
      setMessage(
        "Sua edição foi mantida. Salve-a para registrar uma nova revisão no servidor.",
      );
    },
    save: (content: CreationDraftContent) =>
      !blocked
        ? send(packet("save", base, content))
        : Promise.resolve(undefined),
    discard: () => {
      const draft = offered ?? base;
      return !busy && !pending && !conflict && draft?.state === "active"
        ? send(packet("discard", draft))
        : Promise.resolve(undefined);
    },
    acknowledge: () =>
      consumed && !busy && !pending
        ? send(packet("acknowledge", consumed))
        : Promise.resolve(undefined),
    recover: () => (pending ? send(pending) : Promise.resolve(undefined)),
  };
}

export type CreationDraftController = ReturnType<typeof useCreationDraft>;
