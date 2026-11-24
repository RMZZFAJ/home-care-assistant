"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { SettingsSection } from "@/components/forms/settings-section";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/client/api";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";

export type PreferenceState = { version: number; attemptId?: string | null; savedVersion?: number | null };
export type PreferenceEditorProps<T, Details = undefined> = { value: T; details: Details; discard: () => void; save: (values: object) => void };
type Attempt = { id: string; version: number; retries: number };
type Outcome = { kind: "success"; newer: boolean } | { kind: "conflict"; previousVersion: number } | { kind: "rejected"; cause: unknown } | { kind: "uncertain"; attempt: Attempt; cause: unknown; open: boolean };

export function PreferenceSettings<T extends PreferenceState, Details>({ active, url, title, summary, editLabel, successTitle, successText, decode, Editor, details, unavailable }: {
  active: boolean;
  url: string;
  title: string;
  summary: (value: T) => ReactNode;
  editLabel: string;
  successTitle: string;
  successText: string;
  decode: (raw: unknown) => T;
  Editor: ComponentType<PreferenceEditorProps<T, Details>>;
  details: Details;
  unavailable?: string;
}) {
  const liveRevision = useLiveRevision();
  const read = useScopedRead(active && !unavailable ? url : null, String(liveRevision), decode);
  const [editing, setEditing] = useState<T | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState<"saving" | "checking" | null>(null);
  const inFlightRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (editing && (!active || unavailable)) setEditing(null);
  if (editing && active && !unavailable && !read.loading && read.data && read.data.version !== editing.version) {
    setEditing(null);
    setOutcome({ kind: "conflict", previousVersion: editing.version });
  }

  const pending = outcome?.kind === "uncertain" ? outcome : null;
  const ready = read.data !== null && !read.loading && !read.error;
  const refreshed = outcome?.kind === "conflict" && ready && read.data && read.data.version > outcome.previousVersion ? read.data : null;
  function confirm(result: T, attempt: Attempt) {
    if (result.attemptId !== attempt.id || result.savedVersion == null || result.savedVersion < attempt.version || result.savedVersion > result.version)
      throw new Error("A consulta ainda não confirmou a gravação desta tentativa.");
    setOutcome({ kind: "success", newer: result.version !== result.savedVersion });
    window.dispatchEvent(new Event("hca:data-changed"));
  }

  async function save(values: object) {
    if (inFlightRef.current || !editing || !active || unavailable) return;
    const attempt = { id: crypto.randomUUID(), version: editing.version, retries: 0 };
    inFlightRef.current = true;
    setEditing(null);
    setBusy("saving");
    try {
      const result = decode(await api(url, { ...values, idempotencyKey: attempt.id, expectedVersion: attempt.version }));
      confirm(result, attempt);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "VERSION_CONFLICT" && cause.status === 409) {
        setOutcome({ kind: "conflict", previousVersion: attempt.version });
        read.refresh();
      } else if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500) {
        setOutcome({ kind: "rejected", cause });
      } else setOutcome({ kind: "uncertain", attempt, cause, open: true });
    } finally {
      inFlightRef.current = false;
      setBusy(null);
    }
  }

  async function recover() {
    if (inFlightRef.current || !pending || pending.attempt.retries >= operationRecoveryLimit) return;
    const attempt = { ...pending.attempt, retries: pending.attempt.retries + 1 };
    inFlightRef.current = true;
    setBusy("checking");
    try {
      confirm(decode(await api(url + "?attempt=" + attempt.id)), attempt);
    } catch (cause) {
      setOutcome({ kind: "uncertain", attempt, cause, open: true });
    } finally {
      inFlightRef.current = false;
      setBusy(null);
    }
  }

  function openEditor() {
    if (pending) setOutcome({ ...pending, open: true });
    else if (ready) {
      setEditing(read.data);
      setOutcome(null);
    } else read.refresh();
  }

  return <SettingsSection title={title} summary={unavailable ?? (read.data ? summary(read.data) : undefined)}>
    {read.loading ? <p role="status">Consultando preferência…</p> : null}
    {read.error ? <p role="alert">{read.error}</p> : null}
    {!unavailable ? <ActionButton ref={triggerRef} disabled={Boolean(busy) || read.loading && !pending} onClick={openEditor}>
      {pending ? "Conferir tentativa" : read.error ? "Consultar novamente" : editLabel}<Icon name="chevron" width={16} height={16} />
    </ActionButton> : null}
    {active && !unavailable && editing ? <Editor value={editing} details={details} discard={() => setEditing(null)} save={values => { void save(values); }} /> : null}
    {active && busy ? <Dialog open closeDisabled title={busy === "saving" ? "Salvando preferência" : "Conferindo resultado"} headingIcon="clock" onClose={() => {}}>
      <p role="status">Aguarde a confirmação do sistema.</p>
    </Dialog> : null}
    {active && !busy && outcome?.kind === "success" ? <Dialog open success title={successTitle}
      subtitle={outcome.newer ? "Esta tentativa foi confirmada. A configuração mais recente continua vigente." : successText}
      finalFocus={triggerRef} onClose={() => setOutcome(null)}
      footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>{null}</Dialog> : null}
    {active && !busy && outcome?.kind === "conflict" ? <Dialog open failure="rejected" title="Preferência alterada em outra sessão"
      subtitle="A edição anterior foi descartada. Confira a versão atual antes de escolher novamente."
      finalFocus={triggerRef} onClose={() => setOutcome(null)}
      footer={refreshed ? <ActionButton variant="primary" onClick={() => { setEditing(refreshed); setOutcome(null); }}>Conferir versão atual</ActionButton>
        : <ActionButton variant="primary" disabled={read.loading} onClick={read.refresh}>
          {read.loading ? "Consultando versão atual…" : "Consultar versão atual novamente"}
        </ActionButton>}>{read.error ? <p role="alert">{read.error}</p> : null}</Dialog> : null}
    {active && !busy && outcome?.kind === "rejected" ? <DocumentOperationFailureDialog title="Não foi possível salvar a preferência"
      description={outcome.cause instanceof ApiError ? outcome.cause.message : "A alteração foi recusada pelo sistema."}
      outcome="rejected" cause={outcome.cause} operation={title} fallbackCode="PREFERENCE_REJECTED" attempts={0}
      closeLabel="Voltar às preferências" onClose={() => setOutcome(null)} finalFocus={triggerRef} /> : null}
    {active && !busy && pending?.open ? <DocumentOperationFailureDialog title="Gravação ainda sem confirmação"
      description="Não foi possível confirmar se a preferência foi gravada." outcome="uncertain" cause={pending.cause}
      operation={title} fallbackCode="PREFERENCE_UNCONFIRMED" attempts={pending.attempt.retries} attemptReference={pending.attempt.id}
      closeLabel="Voltar às preferências" onClose={() => setOutcome({ ...pending, open: false })} finalFocus={triggerRef}
      guidance={pending.attempt.retries < operationRecoveryLimit ? "Consulte o resultado da mesma tentativa." : undefined}
      exhaustedMessage={pending.attempt.retries >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      action={pending.attempt.retries < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void recover() } : undefined}
    /> : null}
  </SettingsSection>;
}
