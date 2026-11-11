"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import {
  catalogueAttempt, catalogueReceipt, type CatalogueAttempt, type CatalogueDraft,
  type CatalogueInput, type CatalogueOutcome, type CatalogueScope,
} from "@/lib/validation/catalogue-preparation";

const endpoint = "/api/admin/catalogue-preparations";
const stages = { save: "active", commit: "consumed", discard: "discarded", acknowledge: "acknowledged" } as const;
const revisionRejections = new Set(["DRAFT_VERSION_CONFLICT", "VERSION_CONFLICT"]);
const checkedRejections = new Set([...revisionRejections, "INVALID_OPERATION", "AMBIGUOUS_PRODUCT", "DUPLICATE"]);

export function cataloguePreparationUrl(scope: CatalogueScope, extra: Record<string, string> = {}) {
  const { patientId, mode, purpose, targetId } = scope;
  return endpoint + "?" + new URLSearchParams({
    ...(patientId ? { patientId } : {}), mode, purpose, ...(targetId ? { targetId } : {}), ...extra,
  });
}

export async function sendPreparedCatalogueCommit(url: string, attempt: CatalogueAttempt) {
  return (await api<{ receipt: unknown }>(url, { cataloguePreparation: attempt })).receipt;
}

type PreparationDraft<Fields> =
  | (Omit<Extract<CatalogueDraft, { state: "active" }>, "fields"> & { fields: Fields })
  | Extract<CatalogueDraft, { state: "consumed" }>;
type PreparationSnapshot<Fields, Reference> = { draft: PreparationDraft<Fields> | null; reference: Reference };

function sameFields(left: CatalogueInput, right: CatalogueInput) {
  const entries = Object.entries(left);
  return entries.length === Object.keys(right).length && entries.every(([key, value]) =>
    Object.hasOwn(right, key) && Reflect.get(right, key) === value);
}

export function useCataloguePreparation<Fields extends CatalogueInput, Reference>({
  scope: { patientId, mode, purpose, targetId }, userId, defaultFields, hashFor, validOutcome, sendCommit, onCommit,
  separateReference = false, onRejected,
}: {
  scope: CatalogueScope;
  userId: string;
  defaultFields: (reference: Reference) => Fields;
  hashFor: (reference: Reference, fields: Fields) => string | null;
  validOutcome: (outcome: CatalogueOutcome, attempt: CatalogueAttempt) => boolean;
  sendCommit: (attempt: CatalogueAttempt) => Promise<unknown>;
  onCommit: (outcome: CatalogueOutcome, recovered: boolean) => void;
  separateReference?: boolean;
  onRejected?: (reason: ApiError) => void;
}) {
  const scope = { patientId, mode, purpose, targetId };
  const url = cataloguePreparationUrl(scope);
  const storageKey = "hca:catalogue-preparation:" + JSON.stringify([userId, patientId, mode, purpose, targetId]);
  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const [snapshot, setSnapshot] = useState<PreparationSnapshot<Fields, Reference> | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [reviewedHash, setReviewedHash] = useState<string | null>(null);
  const [pending, setPending] = useState<CatalogueAttempt | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const [comparison, setComparison] = useState<PreparationSnapshot<Fields, Reference> | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const defaults = useEffectEvent((reference: Reference) => defaultFields(reference));
  const initialHash = useEffectEvent((reference: Reference, input: Fields) => hashFor(reference, input));
  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      let retained: CatalogueAttempt | null = null;
      try {
        const parsed = catalogueAttempt.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
        if (parsed.success && parsed.data.patientId === patientId && parsed.data.mode === mode
          && parsed.data.purpose === purpose && parsed.data.targetId === targetId) retained = parsed.data;
      } catch { /* Server-saved input remains available. */ }
      if (retained) setPending(retained);
      const result = await api<PreparationSnapshot<Fields, Reference>>(url, undefined, controller.signal);
      if (controller.signal.aborted) return;
      const recovered = (retained?.fields as Fields | null | undefined) ?? result.draft?.fields ?? defaults(result.reference);
      setSnapshot(result);
      setFields(recovered);
      setReviewedHash(retained?.referenceHash ?? result.draft?.referenceHash ?? initialHash(result.reference, recovered));
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível consultar o preenchimento.");
    });
    return () => { mountedRef.current = false; controller.abort(); };
  }, [mode, patientId, purpose, url, reload, storageKey, targetId]);

  function forget() {
    setPending(null);
    try { sessionStorage.removeItem(storageKey); } catch { /* The receipt remains on the server. */ }
  }

  function acceptReceipt(attempt: CatalogueAttempt, value: unknown, recovered: boolean) {
    const parsed = catalogueReceipt.safeParse(value);
    if (!parsed.success) throw new Error("Não foi possível conferir o comprovante desta tentativa.");
    const receipt = parsed.data;
    if (receipt.ownerId !== userId || receipt.patientId !== patientId || receipt.mode !== mode
      || receipt.purpose !== purpose || receipt.targetId !== targetId || receipt.key !== attempt.key
      || receipt.action !== attempt.action || receipt.state !== stages[attempt.action]
      || (attempt.id !== null && attempt.id !== receipt.id) || receipt.revision !== attempt.revision + 1
      || ((attempt.action === "commit" || attempt.action === "acknowledge") !== (receipt.outcome !== null))
      || (receipt.outcome && !validOutcome(receipt.outcome, attempt))) {
      throw new Error("O comprovante recebido não corresponde a esta tentativa.");
    }

    forget();
    if (attempt.action === "commit" && receipt.outcome) {
      onCommit(receipt.outcome, recovered);
    } else if (attempt.action === "save" && attempt.fields && attempt.referenceHash) {
      const draft = { state: "active" as const, id: receipt.id, revision: receipt.revision, fields: attempt.fields as Fields,
        referenceHash: attempt.referenceHash, savedAt: new Date().toISOString(), outcome: null };
      setSnapshot(current => current && { ...current, draft });
      setReviewedHash(attempt.referenceHash);
      setMessage("Preenchimento privado salvo. Você pode retomá-lo neste catálogo.");
    } else {
      setConfirmDiscard(false);
      setSnapshot(null);
      setMessage(attempt.action === "discard" ? "Preenchimento privado descartado." : "");
      setReload(value => value + 1);
    }
  }

  async function run(attempt: CatalogueAttempt, operation: "send" | "retry" | "read") {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (operation === "send") {
        try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
        catch { setError("O navegador não conseguiu guardar a tentativa. Libere o armazenamento desta aba e tente novamente."); return; }
        setPending(attempt);
      }
      if (operation === "read") {
        const result = await api<{ receipt: unknown }>(url + "&key=" + attempt.key);
        if (!mountedRef.current) return;
        if (result.receipt === null) {
          setMessage("Ainda não há comprovante para esta tentativa. Consulte novamente ou envie a mesma tentativa.");
          return;
        }
        acceptReceipt(attempt, result.receipt, true);
      } else {
        const receipt = await (attempt.action === "commit"
          ? sendCommit(attempt)
          : api(endpoint, attempt));
        if (mountedRef.current) acceptReceipt(attempt, receipt, operation === "retry");
      }
    } catch (reason) {
      if (!mountedRef.current) return;
      if (operation !== "read" && reason instanceof ApiError && reason.status >= 400 && reason.status < 500
        && (operation === "send" || checkedRejections.has(reason.code ?? ""))) {
        forget();
        if (reason.code === "VERSION_CONFLICT" && separateReference) {
          setReferenceAttempt(value => value + 1);
        } else if (revisionRejections.has(reason.code ?? "")) {
          setConflict(true);
          setComparison(null);
        }
        onRejected?.(reason);
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a tentativa.");
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }

  function start(action: CatalogueAttempt["action"], hash = reviewedHash, input = fields) {
    if (!snapshot || !fields || pending || conflict || inFlightRef.current) return;
    const writes = action === "save" || action === "commit";
    if (writes && !hash) return;
    void run({ ...scope, action, key: crypto.randomUUID(), id: snapshot.draft?.id ?? null,
      revision: snapshot.draft?.revision ?? 0, fields: writes ? input : null,
      referenceHash: writes ? hash : null }, "send");
  }

  async function compare() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    try {
      const latest = await api<PreparationSnapshot<Fields, Reference>>(url);
      if (mountedRef.current) setComparison(latest);
    } catch (reason) {
      if (mountedRef.current) setError(reason instanceof Error ? reason.message : "Não foi possível consultar a revisão atual.");
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }

  function applyComparison(keepFields: boolean) {
    if (!comparison) return;
    if (!keepFields) {
      const latest = comparison.draft?.fields ?? defaultFields(comparison.reference);
      setFields(latest);
      setReviewedHash(comparison.draft?.referenceHash ?? hashFor(comparison.reference, latest));
    }
    setSnapshot(comparison);
    setConflict(false);
    setComparison(null);
  }

  const draft = snapshot?.draft;
  const dirty = !!(snapshot && fields && draft?.state !== "consumed" &&
    (!sameFields(fields, draft?.fields ?? defaultFields(snapshot.reference))
      || (draft?.state === "active" && draft.referenceHash !== reviewedHash)));
  return {
    snapshot, fields, setFields, reviewedHash, setReviewedHash, draft, dirty, pending,
    busy, error, setError, message, conflict, comparison, confirmDiscard, setConfirmDiscard, referenceAttempt,
    locked: Boolean(pending) || conflict || confirmDiscard || draft?.state === "consumed",
    retryLoad: () => { setError(""); setReload(value => value + 1); },
    run, start, compare, applyComparison,
  };
}
