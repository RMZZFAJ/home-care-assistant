"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";

export type PreparationScope = {
  patientId: string | null; mode: "patient" | "global"; purpose: string; targetId: string | null;
};
export type PreparationAttempt<Fields> = PreparationScope & {
  action: "save" | "discard" | "acknowledge" | "commit";
  id: string | null; key: string; revision: number; fields: Fields | null; referenceHash: string | null;
};
type PreparationReceipt<Outcome> = {
  id: string; revision: number; state: "active" | "consumed" | "discarded" | "acknowledged"; outcome: Outcome | null;
};
type PreparationDraft<Fields, Outcome> = {
  id: string; revision: number; savedAt: string;
} & (
  | { state: "active"; fields: Fields; referenceHash: string; outcome: null }
  | { state: "consumed"; fields: null; referenceHash: null; outcome: Outcome }
);
type PreparationSnapshot<Fields, Reference, Outcome> = { draft: PreparationDraft<Fields, Outcome> | null; reference: Reference };
export type ScopedPreparationOptions<Fields extends object, Reference, Attempt extends PreparationAttempt<object>, Outcome> = {
  scope: PreparationScope; userId: string; readUrl: string; commandUrl: string; storageKey: string;
  parseAttempt: (value: unknown) => Attempt;
  verifyReceipt: (ownerId: string, attempt: Attempt, value: unknown) => PreparationReceipt<Outcome>;
  defaultFields: (reference: Reference) => Fields;
  hashFor: (reference: Reference, fields: Fields) => string | null;
  sendCommit: (attempt: Attempt) => Promise<unknown>;
  onCommit: (outcome: Outcome, recovered: boolean) => void;
  separateReference?: boolean;
  onRejected?: (reason: ApiError) => void;
};

const revisionRejections = new Set(["DRAFT_VERSION_CONFLICT", "VERSION_CONFLICT"]);
const checkedRejections = new Set([...revisionRejections, "INVALID_OPERATION", "AMBIGUOUS_PRODUCT", "DUPLICATE"]);

function sameFields(left: object, right: object) {
  const entries = Object.entries(left);
  return entries.length === Object.keys(right).length && entries.every(([key, value]) =>
    Object.hasOwn(right, key) && Reflect.get(right, key) === value);
}

export function useScopedPreparation<Fields extends object, Reference, Attempt extends PreparationAttempt<object>, Outcome>({
  scope: { patientId, mode, purpose, targetId }, userId, defaultFields, hashFor, sendCommit, onCommit,
  separateReference = false, onRejected, readUrl, commandUrl, storageKey, parseAttempt, verifyReceipt,
}: ScopedPreparationOptions<Fields, Reference, Attempt, Outcome>) {
  const scope = { patientId, mode, purpose, targetId };
  const url = readUrl;
  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const [snapshot, setSnapshot] = useState<PreparationSnapshot<Fields, Reference, Outcome> | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [reviewedHash, setReviewedHash] = useState<string | null>(null);
  const [pending, setPending] = useState<Attempt | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const [comparison, setComparison] = useState<PreparationSnapshot<Fields, Reference, Outcome> | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const decodeAttempt = useEffectEvent((value: unknown) => parseAttempt(value));
  const defaults = useEffectEvent((reference: Reference) => defaultFields(reference));
  const initialHash = useEffectEvent((reference: Reference, input: Fields) => hashFor(reference, input));
  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      let retained: Attempt | null = null;
      try {
        const parsed = decodeAttempt(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
        if (parsed.patientId === patientId && parsed.mode === mode
          && parsed.purpose === purpose && parsed.targetId === targetId) retained = parsed;
      } catch { /* Server-saved input remains available. */ }
      if (retained) setPending(retained);
      const result = await api<PreparationSnapshot<Fields, Reference, Outcome>>(url, undefined, controller.signal);
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

  function forget(attempt: Attempt) {
    setPending(null);
    try {
      const stored = parseAttempt(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
      if (stored.key === attempt.key) sessionStorage.removeItem(storageKey);
    } catch { /* The server retains the confirmed receipt. */ }
  }

  function acceptReceipt(attempt: Attempt, value: unknown, recovered: boolean) {
    const receipt = verifyReceipt(userId, attempt, value);
    forget(attempt);
    if (attempt.action === "commit" && receipt.outcome) {
      const confirmed = { state: "consumed" as const, id: receipt.id, revision: receipt.revision,
        fields: null, referenceHash: null, savedAt: new Date().toISOString(), outcome: receipt.outcome };
      setSnapshot(current => current && { ...current, draft: confirmed });
      onCommit(receipt.outcome, recovered);
    } else if (attempt.action === "save" && attempt.fields && attempt.referenceHash) {
      const draft = { state: "active" as const, id: receipt.id, revision: receipt.revision, fields: attempt.fields as Fields,
        referenceHash: attempt.referenceHash, savedAt: new Date().toISOString(), outcome: null };
      setSnapshot(current => current && { ...current, draft });
      setReviewedHash(attempt.referenceHash);
      setMessage("Preenchimento privado salvo. Você pode retomá-lo nesta área.");
    } else {
      setConfirmDiscard(false);
      setSnapshot(null);
      setMessage(attempt.action === "discard" ? "Preenchimento privado descartado." : "");
      setReload(value => value + 1);
    }
  }

  async function run(attempt: Attempt, operation: "send" | "retry" | "read") {
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
          : api(commandUrl, attempt));
        if (mountedRef.current) acceptReceipt(attempt, receipt, operation === "retry");
      }
    } catch (reason) {
      if (!mountedRef.current) return;
      const rejected = operation !== "read" && reason instanceof ApiError && reason.status >= 400 && reason.status < 500
        && (operation === "send" || checkedRejections.has(reason.code ?? ""));
      if (rejected) {
        forget(attempt);
        if (reason.code === "VERSION_CONFLICT" && separateReference) {
          setReviewedHash(attempt.referenceHash);
          setReferenceAttempt(value => value + 1);
        } else if (revisionRejections.has(reason.code ?? "")) {
          setConflict(true);
          setComparison(null);
        }
        onRejected?.(reason);
      }
      const message = reason instanceof Error ? reason.message : "Não foi possível confirmar a tentativa.";
      setError(operation === "retry" && !rejected
        ? "O resultado da primeira tentativa continua incerto. Preserve a referência e consulte novamente. " + message
        : message);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }

  function start(action: Attempt["action"], hash = reviewedHash, input = fields) {
    if (!snapshot || !fields || pending || conflict || inFlightRef.current) return;
    const writes = action === "save" || action === "commit";
    if (writes && !hash) return;
    try {
      const attempt = parseAttempt({ ...scope, action, key: crypto.randomUUID(), id: snapshot.draft?.id ?? null,
        revision: snapshot.draft?.revision ?? 0, fields: writes ? input : null, referenceHash: writes ? hash : null });
      void run(attempt, "send");
    } catch {
      setError("Confira os campos e a revisão deste preenchimento.");
    }
  }

  async function compare() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    try {
      const latest = await api<PreparationSnapshot<Fields, Reference, Outcome>>(url);
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
