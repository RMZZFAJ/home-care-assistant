"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { ActionButton, DefinitionGrid, LoadingIndicator } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { api, ApiError, TransportError } from "@/lib/client/api";
import { useScopedRead } from "@/lib/use-scoped-read";
import {
  credentialReviewInput, credentialReviewRecovery, credentialReviewReference, credentialReviewResult, parseProfessionalCredential,
  type CredentialCursor, type CredentialReviewInput, type ProfessionalCredential,
} from "@/lib/validation/professional-credential";
import { CredentialComparison, CredentialReviewEntry, CredentialReviewFields, CredentialSections, type CredentialEditor } from "./credential-review-sections";

type Props = { patientId: string; subjectId: string; subjectRole: string; opener: HTMLElement; onClose: () => void };
type Declaration = ProfessionalCredential["declaration"];
const endpoint = "/api/admin/credentials";
const retainedAttempt = z.strictObject({ reference: credentialReviewReference, retries: z.number().int().min(0).max(operationRecoveryLimit) });
type Attempt = z.infer<typeof retainedAttempt>;
type ViewedFailure = { reason: unknown; uncertain: boolean; key: string };
type ReadCredential = (reply: unknown) => ProfessionalCredential;

function scopeDenied(reason: unknown) {
  return reason instanceof ApiError && [401, 403, 404].includes(reason.status);
}

function retainedReference(storageKey: string, patientId: string, subjectId: string): { attempt: Attempt | null; invalid: boolean } {
  let raw: string | null;
  try { raw = sessionStorage.getItem(storageKey); }
  catch { return { attempt: null, invalid: false }; }
  if (raw === null) return { attempt: null, invalid: false };
  try {
    const value: unknown = JSON.parse(raw);
    let saved = retainedAttempt.safeParse(value);
    if (!saved.success) {
      // Migrate references written by the previous screen without restoring its form fields.
      const legacy = credentialReviewInput.safeParse(value);
      if (legacy.success) {
        const { careRecipientId, subjectId, expectedRevision, idempotencyKey } = legacy.data;
        saved = retainedAttempt.safeParse({ reference: { careRecipientId, subjectId, expectedRevision, idempotencyKey }, retries: 0 });
      }
    }
    if (saved.success && saved.data.reference.careRecipientId === patientId && saved.data.reference.subjectId === subjectId)
      return { attempt: saved.data, invalid: false };
  } catch { /* An invalid reference cannot prove the official write was absent. */ }
  return { attempt: null, invalid: true };
}

export function CredentialReview(props: Props) {
  const { data } = useWorkspaceState();
  const context = data?.activeContext;
  if (!data || context?.mode !== "patient" || context.care_recipient_id !== props.patientId) {
    return <Drawer open title="Conferência familiar indisponível" onClose={props.onClose}>
      <p>A conferência da família exige vínculo local autorizado.</p>
    </Drawer>;
  }
  return <CredentialReviewContent key={[data.userId, props.patientId, props.subjectId].join(":")} {...props} userId={data.userId} />;
}

function CredentialReviewContent({ patientId, subjectId, subjectRole, userId, opener, onClose }: Props & { userId: string }) {
  const url = endpoint + "?" + new URLSearchParams({ careRecipientId: patientId, userId: subjectId });
  const storageKey = ["hca", "credential-review", userId, patientId, subjectId].join(":");
  const decode = useCallback((reply: unknown) => parseProfessionalCredential((reply as { data?: unknown })?.data, patientId, subjectId), [patientId, subjectId]);
  const query = useScopedRead(url, "", decode);
  const [restored] = useState(() => retainedReference(storageKey, patientId, subjectId));
  const [pending, setPending] = useState(restored.attempt);
  const [editor, setEditor] = useState<CredentialEditor | null>(null);
  const [comparison, setComparison] = useState<Declaration | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ViewedFailure | null>(null);
  const [result, setResult] = useState<"recorded" | "closed" | null>(null);
  const [formError, setFormError] = useState("");
  const [historyOpener, setHistoryOpener] = useState<HTMLButtonElement | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const editRef = useRef<HTMLButtonElement>(null);
  const recoveryRef = useRef<HTMLButtonElement>(null);
  const lifetimeRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const formId = useId();

  useEffect(() => {
    const controller = new AbortController();
    lifetimeRef.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!restored.attempt) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(restored.attempt)); }
    catch { /* The exact reference remains available in this workspace. */ }
  }, [restored, storageKey]);

  const read = query.loading || query.error || accessLost ? null : query.data;
  const canEdit = Boolean(read?.canReview && !pending && !busy && !restored.invalid);
  useOperationActivity(busy || comparisonLoading, { title: busy ? "Confirmando a conferência da família" : "Consultando a versão atual" });

  function updatePending(value: Attempt | null) {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch {
      setStorageNotice("A recuperação nesta aba não pôde ser atualizada. Mantenha a página aberta até conferir o resultado.");
    }
  }

  const forgetAccess = useCallback(() => {
    setAccessLost(true);
    setEditor(null);
    setComparison(null);
    setHistoryOpener(null);
  }, []);

  async function compare() {
    const signal = lifetimeRef.current?.signal;
    if (!editor?.conflict || comparisonLoading || !signal) return;
    setComparisonLoading(true);
    setComparisonError("");
    try {
      const current = decode(await api<unknown>(url, undefined, signal));
      if (signal.aborted) return;
      if (!current.canReview) { forgetAccess(); return; }
      setComparison(current.declaration);
    } catch (reason) {
      if (signal.aborted) return;
      if (scopeDenied(reason)) forgetAccess();
      else setComparisonError("Não foi possível consultar a versão atual da declaração. Tente novamente.");
    } finally {
      if (!signal.aborted) setComparisonLoading(false);
    }
  }

  async function run(packet: CredentialReviewInput | null, attempt: Attempt) {
    const signal = lifetimeRef.current?.signal;
    if (inFlightRef.current || !signal || signal.aborted) return;
    inFlightRef.current = true;
    updatePending(attempt);
    setBusy(true);
    setFailure(null);
    const reference = attempt.reference;
    try {
      let state: "recorded" | "closed";
      if (packet) {
        const reply = await api<{ data: unknown }>(endpoint, packet, signal);
        const saved = credentialReviewResult.safeParse(reply.data);
        if (!saved.success || saved.data.credentialRevision !== reference.expectedRevision)
          throw new TransportError("A resposta não confirma a conferência desta versão.", "command", "INVALID_CONFIRMATION", undefined);
        state = "recorded";
      } else {
        const reply = await api<{ data: unknown }>(endpoint + "/result", reference, signal);
        const saved = credentialReviewRecovery.safeParse(reply.data);
        if (!saved.success || saved.data.idempotencyKey !== reference.idempotencyKey ||
            saved.data.subjectId !== subjectId || saved.data.careRecipientId !== patientId ||
            saved.data.expectedRevision !== reference.expectedRevision ||
            (saved.data.state === "recorded" && saved.data.outcome.credentialRevision !== reference.expectedRevision))
          throw new TransportError("A consulta não confirma o resultado desta tentativa.", "command", "INVALID_CONFIRMATION", undefined);
        state = saved.data.state;
      }
      if (signal.aborted) return;
      updatePending(null);
      setEditor(null);
      setResult(state);
      query.refresh();
    } catch (reason) {
      if (signal.aborted) return;
      const rejected = packet && reason instanceof ApiError && reason.status >= 400 && reason.status < 500 &&
        reason.status !== 408 && !["PERSISTENCE_UNCONFIRMED", "RECONCILIATION_REQUIRED"].includes(reason.code ?? "");
      if (rejected) {
        updatePending(null);
        if (reason.code === "VERSION_CONFLICT") {
          setEditor(current => current && { ...current, acknowledged: false, conflict: true });
          return;
        }
      } else {
        setEditor(null);
      }
      if (scopeDenied(reason)) forgetAccess();
      setFailure({ reason, uncertain: !rejected, key: reference.idempotencyKey });
    } finally {
      inFlightRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || !editor || editor.conflict || !editor.acknowledged) return;
    const reference = { careRecipientId: patientId, subjectId, expectedRevision: editor.declaration.revision, idempotencyKey: crypto.randomUUID() };
    const parsed = credentialReviewInput.safeParse({ ...reference, outcome: editor.outcome, note: editor.note });
    if (!parsed.success) { setFormError("Informe o que ainda precisa ser conferido."); return; }
    void run(parsed.data, { reference, retries: 0 });
  }

  function openEditor() {
    if (!canEdit || !read) return;
    setFormError("");
    setComparisonError("");
    setEditor({ declaration: read.declaration, outcome: "", note: "", acknowledged: false, conflict: false });
  }

  function refreshRead() {
    query.refresh();
    setAccessLost(false);
  }

  return <RecordDrawer title="Credencial profissional" subtitle="Dados declarados e a conferência feita pela família."
    headingIcon="checklist" restoreFocusTo={opener} onClose={onClose} busy={busy} trackChanges={false}
    footer={close => <>
      <ActionButton onClick={close}>Voltar</ActionButton>
      {read ? <ActionButton onClick={event => setHistoryOpener(event.currentTarget)}><Icon name="history" />Ver histórico</ActionButton> : null}
      {read?.canReview && !restored.invalid && (!pending || editor) ? <ActionButton variant="primary" ref={editRef} disabled={!canEdit} onClick={openEditor}>
        <Icon name="checklist" />{read.state === "family_checked" ? "Registrar nova conferência" : "Conferir declaração"}
      </ActionButton> : null}
    </>}>
    <div className="hca-form-stack">
      {storageNotice ? <FeedbackBanner tone="warning">{storageNotice}</FeedbackBanner> : null}
      {restored.invalid ? <FeedbackBanner tone="error" heading="Referência de recuperação indisponível">
        A tentativa anterior precisa ser conferida pelo responsável pelo sistema antes de registrar outra.
      </FeedbackBanner> : null}
      {pending && !busy ? <FeedbackBanner tone="warning" heading="Conferência com resultado pendente">
        Consulte o resultado da tentativa anterior antes de registrar outra.
        <ActionButton ref={recoveryRef} onClick={() => setFailure({ reason: null, uncertain: true, key: pending.reference.idempotencyKey })}>Conferir resultado</ActionButton>
      </FeedbackBanner> : null}
      {query.loading ? <LoadingIndicator label="Consultando credencial profissional" /> : null}
      {!query.loading && !read ? <FeedbackBanner tone="error" heading="Credencial indisponível">
        {accessLost ? "A sessão não tem acesso à credencial neste contexto." : query.error || "Não foi possível consultar a credencial."}
        <ActionButton onClick={refreshRead}>Consultar credencial novamente</ActionButton>
      </FeedbackBanner> : null}
      {read ? <>
        <CredentialSections read={read} subjectRole={subjectRole} openHistory={setHistoryOpener} />
        {!read.canReview ? <FeedbackBanner>A conferência é feita por outra pessoa autorizada da administração familiar local.</FeedbackBanner> : null}
        <div><ActionButton onClick={refreshRead}>Consultar versão atual</ActionButton></div>
      </> : null}
    </div>
    {editor && !scopeDenied(query.errorCause) ? <RecordDrawer title="Conferência da família" subtitle={editor.declaration.values.fullName || "Credencial profissional"}
      headingIcon="checklist" restoreFocusFallbackRef={editRef} trackChanges={false} busy={busy || comparisonLoading} exitDialog
      onClose={() => setEditor(null)} hasUnsavedChanges={Boolean(editor.outcome || editor.note || editor.acknowledged)}
      footer={close => <>
        <ActionButton onClick={close} disabled={busy || comparisonLoading}>Voltar</ActionButton>
        <ActionButton type="submit" form={formId} variant="primary" disabled={!canEdit || editor.conflict}>
          <Icon name="check" />Registrar conferência
        </ActionButton>
      </>}>
      <CredentialReviewFields editor={editor} formId={formId} onSubmit={submit} onCompare={() => void compare()} error={formError}
        onChange={fields => { setFormError(""); setEditor(current => current && { ...current, ...fields }); }} />
      {comparisonError ? <FeedbackBanner tone="error">{comparisonError}</FeedbackBanner> : null}
      {comparison ? <Dialog open title="A declaração foi atualizada" kicker="ORGANIZAÇÃO DA RESIDÊNCIA" headingIcon="history"
        popupClassName="hca-credential-comparison" onClose={() => setComparison(null)}
        footer={<><ActionButton onClick={() => setComparison(null)}>Voltar à edição</ActionButton><ActionButton variant="primary"
          onClick={() => {
            setEditor({ ...editor, declaration: comparison, acknowledged: false, conflict: false });
            setComparison(null);
            query.refresh();
          }}><Icon name="check" />Usar declaração atual</ActionButton></>}>
        <CredentialComparison prior={editor.declaration} current={comparison} />
      </Dialog> : null}
    </RecordDrawer> : null}
    {historyOpener ? <CredentialHistory url={url} decode={decode} subject={read?.declaration.values.fullName}
      opener={historyOpener} onClose={() => setHistoryOpener(null)} onAccessLost={forgetAccess} /> : null}
    {failure && !busy ? <DocumentOperationFailureDialog
      title={failure.uncertain ? "Não foi possível confirmar o resultado" : "Não foi possível registrar a conferência"}
      description={failure.uncertain ? "Confira a mesma tentativa antes de registrar outra conferência." : "A conferência não foi registrada. Confira os dados e seu acesso a esta residência."}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.reason}
      operation="Registrar conferência da credencial" fallbackCode="CONFERENCIA_NAO_CONFIRMADA"
      attempts={pending?.retries ?? 0} attemptReference={failure.key}
      guidance="A referência identifica a tentativa registrada nesta aba."
      exhaustedMessage={pending?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      onClose={() => setFailure(null)} closeLabel={editor ? "Voltar ao preenchimento" : "Voltar"} finalFocus={pending ? recoveryRef : undefined}
      action={failure.uncertain && pending && pending.retries < operationRecoveryLimit
        ? { label: "Conferir resultado", onClick: () => void run(null, { ...pending, retries: pending.retries + 1 }) } : undefined} /> : null}
    {result ? <Dialog open success={result === "recorded"} title={result === "recorded" ? "Conferência registrada" : "Tentativa encerrada sem conferência"}
      subtitle={result === "recorded" ? "A decisão da família foi registrada para a versão conferida." : "A consulta confirmou que esta tentativa não registrou uma conferência."}
      onClose={() => setResult(null)} finalFocus={editRef} footer={<ActionButton variant="primary" onClick={() => setResult(null)}>Concluir</ActionButton>}>
      {result === "recorded" && read ? <DefinitionGrid items={[{ label: "Profissional", value: read.declaration.values.fullName || "Nome não informado" }]} /> : null}
    </Dialog> : null}
  </RecordDrawer>;
}

function CredentialHistory({ url, decode, subject, opener, onClose, onAccessLost }: {
  url: string;
  decode: ReadCredential;
  subject: string | null | undefined;
  opener: HTMLButtonElement;
  onClose: () => void;
  onAccessLost: () => void;
}) {
  const query = useScopedRead(url, "", decode);
  const [more, setMore] = useState<{ history: ProfessionalCredential["history"]; nextCursor: CredentialCursor | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  const data = query.loading || query.error ? null : more ?? query.data;

  async function loadMore() {
    if (!data?.nextCursor || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError("");
    try {
      const next = decode(await api<unknown>(url + "&" + new URLSearchParams(data.nextCursor), undefined, controller.signal));
      if (!controller.signal.aborted) setMore({
        history: [...data.history, ...next.history.filter(row => !data.history.some(previous => previous.id === row.id))],
        nextCursor: next.nextCursor,
      });
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (scopeDenied(reason)) onAccessLost();
      else setError("Não foi possível carregar as conferências anteriores. Tente novamente.");
    } finally {
      controllerRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const accessDenied = [401, 403, 404].includes(query.errorStatus ?? 0);
  useEffect(() => { if (accessDenied) onAccessLost(); }, [accessDenied, onAccessLost]);

  return <Drawer open title="Histórico de conferências" headingIcon="history" subtitle={subject || undefined} onClose={onClose}
    finalFocus={() => opener.isConnected ? opener : undefined}
    footer={<ActionButton onClick={onClose}>Voltar</ActionButton>}>
    <div className="hca-form-stack">
      {query.loading ? <LoadingIndicator label="Consultando histórico de conferências" /> : null}
      {query.error ? <FeedbackBanner tone="error">{query.error} <ActionButton onClick={query.refresh}>Consultar histórico novamente</ActionButton></FeedbackBanner> : null}
      {data ? <>
        {data.history.length ? data.history.map(item => <CredentialReviewEntry key={item.id} item={item} />) : <p>Nenhuma conferência registrada.</p>}
        <FeedbackBanner>Uma alteração posterior na declaração preserva o que foi conferido antes.</FeedbackBanner>
        {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}
        {data.nextCursor ? <ActionButton disabled={busy} onClick={() => void loadMore()}>{busy ? "Carregando conferências" : "Carregar conferências anteriores"}</ActionButton> : null}
      </> : null}
    </div>
  </Drawer>;
}
