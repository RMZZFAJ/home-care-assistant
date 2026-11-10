"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";
import {
  usesSupplyDraftTransport,
  type DraftPurpose,
} from "@/lib/validation/supply-drafts";
import { isBalancePreparationPurpose } from "@/lib/forms/balance-preparation-purposes";
import { isScheduleResourcePurpose } from "@/lib/schedules/resource-preparations";
import type { DraftNavigation } from "@/lib/forms/draft-navigation";
import type {
  CreationDraft,
  CreationDraftContent,
  CreationDraftResult,
  DraftKind,
} from "@/types/creation-drafts";

type Packet = Record<string, unknown> & {
  action: "save" | "discard" | "acknowledge";
  content?: CreationDraftContent;
  navigation?: DraftNavigation;
};
type Options = {
  userId: string;
  patientId: string;
  kind: DraftKind | null;
  purpose?: DraftPurpose;
  targetDocumentId?: string | null;
  targetResourceId?: string | null;
  enabled?: boolean;
  readScopeRevision?: string;
  navigation?: DraftNavigation;
  onResume: (draft: CreationDraft) => boolean;
  onDiscard: (action?: "discard" | "acknowledge", id?: string) => void;
  onRead?: (draft: CreationDraft | null) => void;
};

/** Only explicit commands write to the server. A lost response keeps its exact key. */
export function useCreationDraft({
  userId,
  patientId,
  kind,
  purpose = "create",
  targetDocumentId = null,
  targetResourceId = null,
  enabled = true,
  readScopeRevision = "",
  navigation,
  onResume,
  onDiscard,
  onRead,
}: Options) {
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
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
  const [protectedReadPending, setProtectedReadPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Packet | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlightRef = useRef(false);
  const restorePendingRef = useRef(false);
  const unresolvedRef = useRef(false);
  const generationRef = useRef(0);
  const active = enabled && kind !== null;
  const extended = usesSupplyDraftTransport(kind, purpose);
  const resourcePreparation =
    (kind === "BAL" && isBalancePreparationPurpose(purpose)) ||
    (kind === "STOCK" && purpose === "family_movement") ||
    kind === "CONSUMPTION" ||
    kind === "FLOW" ||
    kind === "PROGRESS" ||
    kind === "SCHEDULE";
  const commandUrl =
    kind === "SCHEDULE"
      ? isScheduleResourcePurpose(purpose)
        ? "/api/schedules/resource-preparations"
        : "/api/schedules/preparations"
      : kind === "PROGRESS"
        ? "/api/documents/progress-preparations"
        : kind === "FLOW"
          ? "/api/whatsapp/flows/preparations"
          : kind === "CONSUMPTION"
            ? "/api/consumption/preparations"
            : kind === "STOCK"
              ? "/api/stock/preparations"
              : resourcePreparation
                ? "/api/balances/preparations"
                : "/api/drafts";
  const storageKey =
    `hca:private-draft-command:${userId}:${patientId}:${kind}:${targetDocumentId ?? "new"}` +
    (extended || resourcePreparation ? ":" + purpose : "") +
    (resourcePreparation ? ":" + targetResourceId : "");
  const url =
    kind === "SCHEDULE" && !isScheduleResourcePurpose(purpose)
      ? `${commandUrl}?careRecipientId=${patientId}&purpose=${purpose}`
      : resourcePreparation
        ? `${commandUrl}?careRecipientId=${patientId}&purpose=${purpose}&targetResourceId=${targetResourceId}`
        : `/api/drafts?careRecipientId=${patientId}&kind=${kind}` +
          (targetDocumentId ? `&targetDocumentId=${targetDocumentId}` : "") +
          (extended ? "&purpose=" + purpose : "");
  const readScope = storageKey + ":" + readScopeRevision;
  const parseRead = useCallback(
    (value: unknown) =>
      parsePrivateDraft(value, {
        userId,
        patientId,
        kind,
        targetDocumentId,
        targetResourceId,
        purpose,
      }),
    [userId, patientId, kind, targetDocumentId, targetResourceId, purpose],
  );

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
      setProtectedReadPending(false);
      restorePendingRef.current = false;
      unresolvedRef.current = false;
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
          parsed.data.targetDocumentId === targetDocumentId &&
          (!resourcePreparation ||
            ("targetResourceId" in parsed.data &&
              parsed.data.targetResourceId === targetResourceId)) &&
          (!("purpose" in parsed.data) || parsed.data.purpose === purpose)
        ) {
          restorePendingRef.current = true;
          unresolvedRef.current = true;
          setPending(parsed.data as Packet);
          setProtectedReadPending(true);
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
        if (current === generationRef.current && !controller.signal.aborted) {
          const row = parseRead(result.data);
          onReadRef.current?.(row);
          setProtectedReadPending(false);
          if (!restorePendingRef.current) setOffered(row);
        }
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
          setReadyScope(readScope);
          setLoading(false);
        }
      }
    });
    return () => {
      controller.abort();
      generationRef.current = current + 1;
    };
  }, [
    active,
    attempt,
    kind,
    patientId,
    purpose,
    storageKey,
    readScope,
    targetDocumentId,
    targetResourceId,
    resourcePreparation,
    url,
    parseRead,
  ]);

  async function revalidateRead() {
    if (!active || inFlightRef.current) return false;
    const current = generationRef.current;
    setBusy(true);
    setProtectedReadPending(true);
    setLoadError("");
    try {
      const result = await api<{ data: CreationDraft | null }>(url);
      if (current !== generationRef.current) return false;
      const row = parseRead(result.data);
      onReadRef.current?.(row);
      setReadDenied(false);
      setProtectedReadPending(false);
      // Rechecking access cannot silently replace an acknowledged working copy.
      // A changed revision still needs the existing explicit CAS comparison.
      if (!restorePendingRef.current && !unresolvedRef.current) {
        // Save replies confirm the immutable revision without returning its hash.
        const unchanged =
          (!base && !row) ||
          (base?.state === "active" &&
            row?.state === "active" &&
            base.id === row.id &&
            base.revision === row.revision &&
            (!base.contentHash || base.contentHash === row.contentHash));
        if (unchanged) setBase(row);
        else {
          setComparison(row);
          setOffered(null);
          setConflict(true);
          setCompared(true);
        }
      }
      return true;
    } catch (cause) {
      if (current !== generationRef.current) return false;
      setLoadError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível revalidar o preenchimento privado.",
      );
      setReadDenied(
        cause instanceof ApiError && [401, 403, 404].includes(cause.status),
      );
      // Keep the private view protected until a valid scoped read succeeds.
      return false;
    } finally {
      if (current === generationRef.current) setBusy(false);
    }
  }

  async function compare() {
    const current = generationRef.current;
    setBusy(true);
    setError("");
    setCompared(false);
    try {
      const result = await api<{ data: CreationDraft | null }>(url);
      if (current !== generationRef.current) return;
      const row = parseRead(result.data);
      onReadRef.current?.(row);
      setComparison(row);
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
      const result = parsePrivateDraftResult(
        (await api<{ data: CreationDraftResult }>(commandUrl, packet)).data,
        packet,
        userId,
      );
      if (current !== generationRef.current) return;
      forgetPending();
      unresolvedRef.current = false;
      setProtectedReadPending(false);
      setPending(null);
      if (packet.action === "save") {
        const savedDraft: CreationDraft = {
          id: result.id,
          ownerId: userId,
          patientId,
          kind: kind!,
          purpose,
          targetDocumentId,
          ...(resourcePreparation ? { targetResourceId } : {}),
          schemaVersion: 1,
          revision: result.revision,
          state: result.state,
          createdAt: base?.createdAt ?? result.savedAt,
          savedAt: result.savedAt,
          contentHash: "",
          content: packet.content!,
          navigation: packet.navigation ?? null,
          consumedDocumentId: result.consumedDocumentId,
          ...(resourcePreparation
            ? {
                consumedResourceId: result.consumedResourceId,
                consumedResult: result.consumedResult,
              }
            : {}),
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
          resourcePreparation
            ? "Salvo no servidor. Este preenchimento ainda não registrou uma decisão."
            : "Salvo no servidor. Este preenchimento ainda não foi emitido.",
        );
        if (result.replayed) {
          try {
            const live = parseRead(
              (await api<{ data: CreationDraft | null }>(url)).data,
            );
            if (current !== generationRef.current) return;
            onReadRef.current?.(live);
            if (live?.state === "consumed") {
              setBase(null);
              setOffered(live);
              setMessage(
                resourcePreparation
                  ? "O salvamento foi confirmado e o preenchimento já foi utilizado em uma decisão."
                  : "O salvamento foi confirmado e o rascunho já foi usado em uma ficha.",
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
        onDiscard(packet.action, result.id);
        setAttempt((value) => value + 1);
      }
      return result;
    } catch (reason) {
      if (current !== generationRef.current) return;
      const known =
        reason instanceof ApiError &&
        [400, 401, 403, 404, 409, 413, 422].includes(reason.status);
      const recovering = unresolvedRef.current;
      if (known && !recovering) {
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
          setReadDenied(true);
        }
      }
      if (!known || recovering) unresolvedRef.current = true;
      if (
        recovering &&
        reason instanceof ApiError &&
        [401, 403, 404].includes(reason.status)
      ) {
        setBase(null);
        setOffered(null);
        setComparison(null);
        setReadDenied(true);
      }
      setError(
        recovering
          ? "A recuperação ainda não confirmou a tentativa original. Preserve esta referência e consulte novamente quando o acesso estiver disponível."
          : (reason as Error).message,
      );
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
      ...(extended || resourcePreparation ? { purpose } : {}),
      targetDocumentId,
      ...(resourcePreparation ? { targetResourceId } : {}),
      id: draft?.id ?? null,
      expectedRevision: draft?.revision ?? null,
      idempotencyKey: crypto.randomUUID(),
      action,
      ...(content ? { content } : {}),
      ...(action === "save" && navigation ? { navigation } : {}),
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
      targetResourceId
        ? "Rascunho retomado. Revise as referências antes de concluir."
        : "Rascunho retomado. Revise o catálogo e as referências antes de concluir.",
    );
  }
  const consumed =
    [offered, comparison, base].find((value) => value?.state === "consumed") ??
    null;
  const blocked =
    active &&
    (loading ||
      readyScope !== readScope ||
      busy ||
      !!loadError ||
      !!offered ||
      conflict ||
      !!pending ||
      !!consumed);
  return {
    active,
    kind,
    purpose,
    navigation,
    base,
    offered,
    comparison,
    consumed,
    conflict,
    compared,
    loading: active && (loading || readyScope !== readScope),
    busy,
    pending,
    error,
    loadError,
    readDenied,
    protectedReadPending:
      protectedReadPending ||
      (active &&
        readScopeRevision !== "" &&
        readyScope !== "" &&
        readyScope !== readScope),
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
    revalidateRead,
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
