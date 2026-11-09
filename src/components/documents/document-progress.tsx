"use client";

import { useCallback, useRef, useState, type SetStateAction } from "react";
import { z } from "zod";
import { ApiError, can, Notice, type WorkspaceContext } from "@/components/workspace";
import { useClientReady } from "@/lib/use-client-ready";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { Dialog, Icon } from "@/components/ui/primitives";
import { ActionButton, FormField, Pill, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { RelatedDocument } from "./related-document";
import {
  parseProgressPage, parseProgressOutcome, progressConfirmed, progressContent, publishProgress,
  progressCategories, progressStages, stagesByDocument, type ProgressPacket, type ProgressOutcome, type ProgressPage,
  progressReferencePage, progressReferenceRow,
} from "@/lib/validation/document-progress";
import type { DocumentType } from "@/types/documents";

type Reference = z.infer<typeof progressReferenceRow>;
const blank = { category: "record", stage: null, text: "", references: [] } satisfies ProgressPacket["content"];
const storedDraft = z.object({ content: progressContent.extend({ text: z.string().max(2000) }), pending: publishProgress.nullable() }).strict();
type Draft = { content: ProgressPacket["content"]; pending: ProgressPacket | null };
function loadDraft(key: string): Draft & { error: string } {
  try {
    const raw = sessionStorage.getItem(key);
    const saved = raw ? storedDraft.parse(JSON.parse(raw)) : { content: blank, pending: null };
    return { content: saved.pending?.content ?? saved.content, pending: saved.pending, error: "" };
  } catch { return { content: blank, pending: null, error: "Não foi possível recuperar o rascunho deste andamento. Nenhuma publicação foi enviada." }; }
}

export function DocumentProgress({ id, type, patientId, context }: { id: string; type: DocumentType; patientId: string; context: WorkspaceContext }) {
  const ready = useClientReady();
  return ready ? <ProgressContent key={context.userId + ":" + id} id={id} type={type} patientId={patientId} context={context} />
    : <section className="ui-card" role="status">Preparando Andamentos…</section>;
}
function ProgressContent({ id, type, patientId, context }: { id: string; type: DocumentType; patientId: string; context: WorkspaceContext }) {
  const [filter, setFilter] = useState<ProgressPage["filter"]>("all"), [page, setPage] = useState(1);
  const storageKey = `hca:progress:${context.userId}:${id}`;
  const [draft, setDraft] = useState(() => loadDraft(storageKey));
  const draftRef = useRef<Draft>({ content: draft.content, pending: draft.pending });
  const { content, pending } = draft;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [storageError, setStorageError] = useState(draft.error);
  const [search, setSearch] = useState(""), [referenceQuery, setReferenceQuery] = useState<string | null>(null), [referenceNumber, setReferenceNumber] = useState(1);
  const revision = useLiveRevision();
  const decode = useCallback((value: unknown) => {
    const result = parseProgressPage(z.object({ data: z.unknown() }).parse(value).data, id, filter, page);
    if (result.documentType !== type) throw new Error("Os Andamentos não correspondem ao tipo desta ficha.");
    return result;
  }, [id, filter, page, type]);
  const read = useScopedRead(`/api/documents/${id}/progress?filter=${filter}&page=${page}`, String(revision), decode);
  const feed = !read.loading && !read.error ? read.data : null;
  const openerRef = useRef<HTMLButtonElement>(null);
  const command = useCommandIntent<ProgressPacket, ProgressOutcome>((value, packet) => progressConfirmed(value, packet, id, context.userId));
  const locked = command.busy || pending !== null;
  const writable = Boolean(feed?.canPublish && context.patient?.id === patientId && context.activeContext?.mode === "patient" && can(context, "document.progress.create"));
  function updateDraft(value: Draft, persist = true) {
    const next: Draft = { content: value.content, pending: value.pending };
    draftRef.current = next;
    setDraft({ ...next, error: "" });
    if (!persist) return;
    try {
      if (next.pending || next.content.text || next.content.references.length) sessionStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.removeItem(storageKey);
    } catch { setStorageError("Não foi possível guardar este rascunho no aparelho. Seu texto continua nesta aba."); }
  }
  function setContent(change: SetStateAction<ProgressPacket["content"]>) {
    const previous = draftRef.current;
    updateDraft({ ...previous, content: typeof change === "function" ? change(previous.content) : change });
  }
  const decodeReferences = useCallback((value: unknown) => {
    const parsed = progressReferencePage.safeParse(value);
    if (!parsed.success || parsed.data.documentId !== id || parsed.data.careRecipientId !== patientId
      || parsed.data.search !== referenceQuery || parsed.data.page !== referenceNumber)
      throw new Error("A consulta de referências não pôde ser conferida para esta ficha. Atualize a busca.");
    return parsed.data;
  }, [id, patientId, referenceQuery, referenceNumber]);
  const references = useScopedRead(open && referenceQuery !== null
    ? `/api/documents/${id}/progress/references?search=${encodeURIComponent(referenceQuery)}&page=${referenceNumber}` : null,
    String(revision), decodeReferences);
  const choices = !references.loading && !references.error ? references.data : null;
  async function publish() {
    if (command.busy || (!pending && !writable)) return;
    const recovering = pending !== null;
    let packet: ProgressPacket;
    try {
      packet = pending ?? publishProgress.parse({ key: crypto.randomUUID(), content });
      sessionStorage.setItem(storageKey, JSON.stringify({ content: packet.content, pending: packet }));
    } catch (reason) {
      setError(reason instanceof z.ZodError ? reason.issues[0]?.message ?? "Revise o andamento." : "Não foi possível guardar a referência de recuperação neste aparelho. Seu texto foi preservado; libere o armazenamento e tente novamente.");
      return;
    }
    updateDraft({ content: packet.content, pending: packet }, false); setError("");
    try {
      const result = parseProgressOutcome(await (command.uncertain ? command.recover() : command.send(`/api/documents/${id}/progress`, packet)));
      updateDraft({ content: blank, pending: null }, false); setOpen(false); setStorageError("");
      try { sessionStorage.removeItem(storageKey); }
      catch { setStorageError("A publicação foi confirmada, mas a referência local não pôde ser removida. Se reaparecer após recarregar, a recuperação confirma o mesmo andamento."); }
      setMessage(`${result.recovered ? "Publicação recuperada" : "Andamento publicado"}. Autoria e horário registrados; nenhum conteúdo original, PDF ou saldo foi alterado.`);
      read.refresh();
    } catch (reason) {
      const unknown = recovering || !(reason instanceof ApiError) || reason.status === 0 || reason.status >= 500;
      if (!unknown) updateDraft({ content: packet.content, pending: null });
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a publicação. Recupere a mesma tentativa.");
    }
  }
  function addReference(row: Reference) {
    const current = draftRef.current.content;
    if (locked || current.references.includes(row.id) || current.references.length >= 8) return;
    const text = current.text + (current.text ? " " : "") + "#" + (row.code ?? row.id);
    if (text.length > 2000) { setError("A referência ultrapassaria 2000 caracteres. Seu texto foi preservado; ajuste-o antes de inserir o vínculo."); return; }
    setError(""); setContent({ ...current, references: [...current.references, row.id], text });
  }
  return <section className="ui-card hca-progress-feed" aria-label="Andamentos da ficha" aria-busy={read.loading}>
    <div className="hca-section-heading"><div><h2>Andamentos</h2><p>Fatos documentais e registros complementares, do primeiro ao mais recente. Etapa relacionada não muda a ordem.</p></div>
      <ActionButton ref={openerRef} disabled={!pending && !writable} onClick={() => setOpen(true)}><Icon name="plus" />{pending ? "Recuperar publicação" : "Registrar andamento"}</ActionButton>
    </div>
    {message ? <Notice>{message}</Notice> : null}
    {storageError ? <Notice error>{storageError}</Notice> : null}
    {pending && !open ? <Notice>Há uma publicação sem confirmação. A referência e o conteúdo estão guardados neste aparelho; recupere a mesma tentativa antes de iniciar outra.</Notice> : null}
    <div className="hca-toolbar"><FormField label="Mostrar Andamentos"><SelectField value={filter} onChange={event => { setFilter(event.currentTarget.value as ProgressPage["filter"]); setPage(1); }}>
      <option value="all">Todos</option><option value="automatic">Fatos automáticos</option><option value="manual">Registros manuais</option>
    </SelectField></FormField><ActionButton aria-disabled={read.loading} onClick={() => { if (!read.loading) read.refresh(); }}>Atualizar Andamentos</ActionButton></div>
    {read.loading ? <Notice>Consultando Andamentos autorizados…</Notice> : read.error ? <Notice error>Não foi possível consultar os Andamentos. {read.error} O texto em edição foi preservado.</Notice> : null}
    {feed ? <>
      <p className="hca-field-help">{feed.total} registro(s). Publicar um andamento não registra ciência, recebimento ou conclusão.</p>
      {feed.data.length ? <ol className="hca-event-feed">{feed.data.map(row => <li key={row.id} className="hca-progress-event">
        <span className="hca-event-marker" aria-hidden="true"><Icon name={row.source === "manual" ? "edit" : "history"} /></span>
        <article className={row.source === "manual" ? "hca-manual-note" : "hca-event-body"} aria-label={row.source === "manual" ? progressCategories[row.category] : documentEventLabel(row.action)}>
          <div className="hca-event-heading"><strong>{row.source === "manual" ? progressCategories[row.category] : documentEventLabel(row.action)}</strong><time dateTime={row.recordedAt}>{formatBrazilDate(row.recordedAt)}</time></div>
          <Pill tone={row.source === "manual" ? "accent" : "neutral"}>{row.source === "manual" ? "Registro manual" : "Fato automático"}</Pill>
          <p className="hca-event-meta">{row.authorId ? row.authorName ?? "Nome histórico não preservado" : "Sistema, sem autoria pessoal"}{row.source === "manual" && row.stage ? ` · Etapa relacionada: ${progressStages[row.stage]}` : ""}{row.source === "automatic" ? ` · Versão ${row.version}` : ""}</p>
          {row.source === "manual" ? <><p className="hca-event-text">{row.text}</p><div className="hca-toolbar">{row.references.map(ref => <RelatedDocument key={ref.id} id={ref.id} type={ref.type} label={ref.code ?? "Ficha vinculada"} />)}</div></> : null}
        </article>
      </li>)}</ol> : <p>Nenhum andamento corresponde a este filtro e página.</p>}
      <nav className="hca-toolbar" aria-label="Páginas dos Andamentos"><ActionButton disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anteriores</ActionButton><span>Página {page} de {Math.max(1, Math.ceil(feed.total / 20))}</span><ActionButton disabled={page * 20 >= feed.total} onClick={() => setPage(value => value + 1)}>Próximos</ActionButton><ActionButton disabled={page === Math.max(1, Math.ceil(feed.total / 20))} onClick={() => setPage(Math.max(1, Math.ceil(feed.total / 20)))}>Ir ao fim da cronologia</ActionButton></nav>
    </> : null}
    <Dialog open={open} title={pending ? "Recuperar publicação de andamento" : "Registrar andamento"} closeDisabled={command.busy} finalFocus={openerRef} onClose={() => { if (!command.busy) setOpen(false); }}>
      <p className="hca-field-help">Registro complementar com autoria e momento próprios. Não altera a ficha original, estoque, ciência, recebimento ou arquivos já emitidos.</p>
      {error ? <Notice error>{error}</Notice> : null}
      {pending ? <Notice>A tentativa está congelada. Fechar guarda a referência; recuperar verifica ou publica o mesmo conteúdo, sem criar outro andamento.</Notice> : null}
      <form className="hca-form" onSubmit={event => { event.preventDefault(); void publish(); }}>
        <fieldset disabled={locked} className="hca-compact-grid hca-progress-fields">
          <FormField label="Categoria"><SelectField value={content.category} onChange={event => { const category = event.currentTarget.value as ProgressPacket["content"]["category"]; setContent(value => ({ ...value, category })); }}>{Object.entries(progressCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
          <FormField label="Etapa relacionada (opcional)"><SelectField value={content.stage ?? ""} onChange={event => { const stage = (event.currentTarget.value || null) as ProgressPacket["content"]["stage"]; setContent(value => ({ ...value, stage })); }}><option value="">Sem vínculo de etapa</option>{stagesByDocument[type].map(value => <option key={value} value={value}>{progressStages[value]}</option>)}</SelectField></FormField>
          <FormField label="Texto do andamento" required helpText={`${content.text.length}/2000 caracteres. O texto é exibido como escrito, sem executar HTML.`}><TextAreaField maxLength={2000} value={content.text} onChange={event => { const text = event.currentTarget.value; setContent(value => ({ ...value, text })); }} /></FormField>
        </fieldset>
        <fieldset disabled={locked} className="hca-reference-picker"><legend>Referências autorizadas (opcional)</legend>
          <div className="hca-toolbar"><TextInput aria-label="Código da ficha a vincular" maxLength={100} value={search} onChange={event => setSearch(event.currentTarget.value)} placeholder="Ex.: ENT-0001" /><ActionButton onClick={() => { setReferenceQuery(search.trim()); setReferenceNumber(1); }}>Buscar fichas para referência</ActionButton></div>
          {references.loading ? <p role="status">Consultando fichas autorizadas…</p> : references.error ? <Notice error>{references.error}</Notice> : null}
          {choices ? <><ul className="hca-reference-options">{choices.data.map(row => <li key={row.id}><ActionButton disabled={content.references.length >= 8 || content.references.includes(row.id)} onClick={() => addReference(row)}>Inserir referência {row.code ?? row.type}</ActionButton></li>)}</ul>{!choices.data.length ? <p>Nenhuma ficha autorizada nesta página.</p> : null}<div className="hca-toolbar"><ActionButton disabled={referenceNumber === 1} onClick={() => setReferenceNumber(value => value - 1)}>Referências anteriores</ActionButton><span>{referenceNumber} / {Math.max(1, Math.ceil(choices.total / 20))}</span><ActionButton disabled={referenceNumber * 20 >= choices.total} onClick={() => setReferenceNumber(value => value + 1)}>Próximas referências</ActionButton></div></> : null}
          {content.references.length ? <ul>{content.references.map((ref, index) => <li key={ref}><span>Referência {index + 1}</span> <ActionButton compact onClick={() => setContent(value => ({ ...value, references: value.references.filter(id => id !== ref) }))}>Remover referência {index + 1}</ActionButton></li>)}</ul> : null}
          <p className="hca-field-help">Até oito fichas deste paciente. O link só aparece enquanto a pessoa consultando tiver acesso; texto digitado não concede permissão.</p>
        </fieldset>
        <div className="hca-toolbar"><ActionButton disabled={command.busy} onClick={() => setOpen(false)}>{pending ? "Fechar guardando referência" : "Guardar rascunho e fechar"}</ActionButton><ActionButton type="submit" variant="primary" disabled={command.busy || (!pending && !writable)}>{command.busy ? "Confirmando publicação…" : pending ? "Recuperar a mesma publicação" : "Publicar andamento"}</ActionButton></div>
      </form>
    </Dialog>
  </section>;
}
