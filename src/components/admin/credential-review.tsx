"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Field, Select, Textarea } from "@fluentui/react-components";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Notice } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { formatBrazilDate } from "@/lib/receipt";
import { credentialReviewInput, credentialReviewResult, parseProfessionalCredential, type CredentialReviewInput, type CredentialReviewResult, type ProfessionalCredential, type CredentialCursor } from "@/lib/validation/professional-credential";

type Props = { patientId: string; subjectId: string; opener: HTMLElement; onClose: () => void };
const labels = { informed: "Informado pelo titular", needs_review: "Dados alterados: nova conferência necessária", family_checked: "Conferido pela família", not_confirmed: "Conferência familiar não confirmada" };
function DeclaredValues({ values }: { values: ProfessionalCredential["declaration"]["values"] }) {
  return <dl className="hca-summary-grid wrap-anywhere"><dt>Nome informado</dt><dd>{values.fullName || "Não informado"}</dd><dt>Função/categoria informada</dt><dd>{values.category || "Não informada"}</dd><dt>Registro informado</dt><dd>{values.registration || "Sem registro informado"}</dd><dt>UF informada</dt><dd>{values.state || "Não informada"}</dd></dl>;
}
function ReviewEntry({ item }: { item: NonNullable<ProfessionalCredential["latestReview"]> }) {
  return <article className="ui-card hca-form-stack" aria-label="Registro de conferência"><dl className="hca-summary-grid wrap-anywhere"><dt>Quem conferiu</dt><dd>{item.author.name} · {item.author.role === "admin" ? "Administrador local" : "Familiar"}</dd><dt>Data do registro</dt><dd>{formatBrazilDate(item.recordedAt)}</dd><dt>Resultado</dt><dd>{item.outcome === "checked" ? "Conferido pela família" : "Não confirmado pela família"}</dd><dt>Versão conferida</dt><dd>{item.credentialRevision}</dd></dl><DeclaredValues values={item.declaration}/>{item.note ? <p className="wrap-anywhere">{item.note}</p> : null}</article>;
}
export function CredentialReview(props: Props) {
  const { data } = useWorkspaceState();
  return data?.userId ? <CredentialReviewContent key={`${data.userId}:${props.patientId}:${props.subjectId}`} {...props} userId={data.userId}/> : <Notice>Validando acesso à conferência…</Notice>;
}
function CredentialReviewContent({ patientId, subjectId, userId, opener, onClose }: Props & { userId: string }) {
  const endpoint = `/api/admin/credentials?careRecipientId=${patientId}&userId=${subjectId}`;
  const storageKey = `hca:credential-review:${userId}:${patientId}:${subjectId}`;
  const [read, setRead] = useState<ProfessionalCredential | null>(null), [attempt, setAttempt] = useState(0);
  const [reading, setReading] = useState(true), [readError, setReadError] = useState("");
  const [pending, setPending] = useState<CredentialReviewInput | null>(null), [invalidReference, setInvalidReference] = useState(false);
  const [outcome, setOutcome] = useState(""), [note, setNote] = useState(""), [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [storageNotice, setStorageNotice] = useState("");
  const [history, setHistory] = useState<ProfessionalCredential["history"]>([]), [cursor, setCursor] = useState<CredentialCursor | null>(null), [moreBusy, setMoreBusy] = useState(false);
  const historyControllerRef = useRef<AbortController | null>(null);
  const command = useCommandIntent<CredentialReviewInput, { data: CredentialReviewResult }>((value, packet) => {
    const parsed = credentialReviewResult.safeParse((value as { data?: unknown })?.data);
    return parsed.success && parsed.data.credentialRevision === packet.expectedRevision;
  });
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setReading(true); setReadError(""); setAcknowledged(false); setMoreBusy(false); setInvalidReference(false);
      let raw: string | null = null;
      try { raw = sessionStorage.getItem(storageKey); }
      catch { setStorageNotice("A recuperação nesta aba não está disponível. Mantenha esta página aberta até conferir o resultado."); }
      if (raw) try {
          const parsed = credentialReviewInput.safeParse(JSON.parse(raw));
          if (parsed.success && parsed.data.careRecipientId === patientId && parsed.data.subjectId === subjectId) setPending(parsed.data);
          else setInvalidReference(true);
      } catch { setInvalidReference(true); }
      try {
        const result = await api<{ data: unknown }>(endpoint, undefined, controller.signal);
        const parsed = parseProfessionalCredential(result.data, patientId, subjectId);
        if (!controller.signal.aborted) { setRead(parsed); setHistory(parsed.history); setCursor(parsed.nextCursor); }
      } catch (reason) { if (!controller.signal.aborted) setReadError((reason as Error).message); }
      finally { if (!controller.signal.aborted) setReading(false); }
    });
    return () => { controller.abort(); historyControllerRef.current?.abort(); };
  }, [endpoint, patientId, subjectId, storageKey, attempt]);

  function preserve(packet: CredentialReviewInput | null) {
    setPending(packet);
    try { if (packet) sessionStorage.setItem(storageKey, JSON.stringify(packet)); else sessionStorage.removeItem(storageKey); }
    catch { setStorageNotice("Não foi possível guardar ou limpar a recuperação nesta aba. Mantenha esta página aberta até conferir o resultado."); }
  }
  async function send(packet: CredentialReviewInput, recovering: boolean) {
    setError("");
    if (!recovering) preserve(packet);
    try {
      if (recovering && command.uncertain) await command.recover();
      else await command.send("/api/admin/credentials", packet);
      preserve(null); setMessage("A conferência foi registrada. Consulte abaixo a situação atual e o histórico.");
      setOutcome(""); setNote(""); setAttempt(value => value + 1);
    } catch (reason) {
      if (!recovering && reason instanceof ApiError && reason.status >= 400 && reason.status < 500) preserve(null);
      setError((reason as Error).message);
    }
  }
  async function more() {
    if (!cursor || moreBusy) return;
    const controller = new AbortController(); historyControllerRef.current = controller;
    setMoreBusy(true); setError("");
    try {
      const params = new URLSearchParams(cursor);
      const result = await api<{ data: unknown }>(endpoint + "&" + params, undefined, controller.signal);
      const parsed = parseProfessionalCredential(result.data, patientId, subjectId);
      if (!controller.signal.aborted) { setHistory(items => [...items, ...parsed.history.filter(row => !items.some(item => item.id === row.id))]); setCursor(parsed.nextCursor); }
    } catch (reason) { if (!controller.signal.aborted) setError((reason as Error).message); }
    finally { if (!controller.signal.aborted) setMoreBusy(false); }
  }
  const blocked = command.busy || Boolean(pending) || invalidReference;
  return <RecordDrawer title="Conferência familiar da credencial" restoreFocusTo={opener} onClose={onClose} busy={command.busy} preventClose={Boolean(pending) || invalidReference} hasUnsavedChanges={Boolean(outcome || note || acknowledged)}>
    <div className="hca-form-stack">
      <p>O registro e a função são informados pelo titular. A conferência abaixo é da família deste paciente, sem validação externa de habilitação e sem conceder permissões.</p>
      {message ? <Notice>{message}</Notice> : null}{error ? <Notice error>{error}</Notice> : null}{storageNotice ? <Notice error>{storageNotice}</Notice> : null}
      {reading ? <Notice>Consultando declaração e conferências…</Notice> : readError || !read ? <Notice error>{readError || "Não foi possível consultar a credencial."} <Button disabled={command.busy} onClick={() => setAttempt(value => value + 1)}>Consultar credencial novamente</Button></Notice> : <>
        <section aria-label="Declaração consultada" className="hca-form-stack"><h3>Dados informados pelo titular</h3><DeclaredValues values={read.declaration.values}/><p>Situação na consulta: <strong>{labels[read.state]}</strong></p><p>Versão acompanhada {read.declaration.revision} · registrada em {formatBrazilDate(read.declaration.changedAt)}</p><p>Validação externa: nenhuma fonte de comprovação registrada.</p></section>
        {read.latestReview ? <section aria-label="Última conferência familiar"><h3>Última conferência familiar</h3><ReviewEntry item={read.latestReview}/></section> : <Notice>A família ainda não registrou conferência para esta pessoa.</Notice>}
        {invalidReference ? <Notice error>A referência local da tentativa não pôde ser conferida. Preserve esta aba e consulte a administração responsável antes de registrar outra conferência.</Notice> : null}
        {pending ? <section aria-label="Tentativa de conferência preservada"><Notice>O resultado da tentativa precisa ser recuperado antes de editar ou iniciar outra.</Notice><p>Versão {pending.expectedRevision} · {pending.outcome === "checked" ? "Conferido pela família" : "Não confirmado pela família"}</p>{pending.note ? <p className="wrap-anywhere">{pending.note}</p> : null}<Button appearance="primary" disabled={command.busy} onClick={() => void send(pending, true)}>Recuperar mesma conferência</Button></section> : null}
        {read.canReview ? <form className="hca-form-stack" onSubmit={event => { event.preventDefault(); if (blocked || !acknowledged) return; const parsed = credentialReviewInput.safeParse({ careRecipientId: patientId, subjectId, expectedRevision: read.declaration.revision, outcome, note, idempotencyKey: crypto.randomUUID() }); if (!parsed.success) { setError("Escolha o resultado e informe a pendência quando a conferência não foi concluída."); return; } void send(parsed.data, false); }}>
          <h3>Registrar resultado da família</h3><Field label="Resultado da conferência" required><Select required disabled={blocked} value={outcome} onChange={(_, value) => setOutcome(value.value)}><option value="">Escolha o resultado</option><option value="checked">Conferido pela família</option><option value="not_confirmed">Não confirmado pela família</option></Select></Field>
          <Field label="Observação da conferência" hint="Obrigatória quando a conferência não foi concluída."><Textarea disabled={blocked} required={outcome === "not_confirmed"} minLength={outcome === "not_confirmed" ? 6 : undefined} maxLength={600} value={note} onChange={(_, value) => setNote(value.value)}/></Field>
          <Checkbox disabled={blocked} required checked={acknowledged} label="Revisei os dados da versão exibida e estou registrando a conferência que realizei." onChange={(_, value) => setAcknowledged(value.checked === true)}/>
          <Button type="submit" appearance="primary" disabled={blocked}>Registrar conferência familiar</Button>
        </form> : <Notice>É necessária outra pessoa da administração familiar local para conferir estes dados. O próprio titular não se confere.</Notice>}
        <Button disabled={blocked} onClick={() => setAttempt(value => value + 1)}>Consultar versão atual</Button>
        <section aria-label="Histórico de conferências" className="hca-form-stack"><h3>Histórico de conferências</h3>{history.length ? history.map(item => <ReviewEntry key={item.id} item={item}/>) : <p>Nenhuma conferência registrada.</p>}{cursor ? <Button disabled={moreBusy || command.busy} onClick={() => void more()}>Carregar conferências anteriores</Button> : null}</section>
      </>}
    </div>
  </RecordDrawer>;
}
