"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { api, ApiError, buttonClass, Notice, primaryClass } from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";
import { FormField, SelectField, TextInput, TextAreaField } from "@/components/ui/controls";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatBrazilDate } from "@/lib/receipt";
import { complementType, linkComplementInput, parseComplementAttempt, parseComplementCandidates, parseDocumentComplements, requireComplementConfirmation, type DocumentComplements, type LinkComplementInput } from "@/lib/documents/document-complements";
import type { DocumentType } from "@/types/documents";
import { RelatedDocument } from "./related-document";
import { DocumentSection } from "@/components/ui/model-section";

const names: Record<DocumentType, string> = { REQ: "Requisição", COM: "Compra ou doação", ENT: "Entrega ou devolução", BAL: "Balanço" };
type Props = { documentId: string; version: number; userId: string; activeContext: boolean; onRecorded: () => void; };
export function DocumentComplementsPanel({ documentId, version, userId, activeContext, onRecorded }: Props) {
  const [page, setPage] = useState(1), [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const decode = useCallback((raw: unknown) => parseDocumentComplements((raw as { data: unknown; }).data, documentId, page), [documentId, page]);
  const read = useScopedRead(`/api/documents/${documentId}/complements?page=${page}`, String(version), decode);
  const data = !read.error ? read.data : null;
  const refreshed = () => { read.refresh(); onRecorded(); };
  return <DocumentSection title="Fichas complementares" icon="layers"><div className="hca-complements-body" aria-label="Fichas complementares" aria-busy={read.loading}>
    <details className="doc-help-details"><summary>Quando usar uma ficha complementar</summary><p>Uma ficha complementar tem identidade e emissão próprias. O vínculo registra motivo, autoria e momento, preservando o conteúdo da origem. Use quando outro ato precisar de uma ficha própria relacionada à anterior. O vínculo não registra ciência ou recebimento e não altera estoque por si só.</p></details>
    {read.loading ? <p role="status">Consultando vínculos autorizados…</p> : null}
    {read.error ? <Notice error>{read.error}</Notice> : null}
    {data && !read.loading ? <>
      {!data.total ? <p>Nenhuma ficha complementar vinculada.</p> : <ul className="space-y-3">{data.links.map(link => <li key={link.id} className="space-y-2 border-t border-(--line) pt-3">
        <p className="font-semibold">{link.role === "source" ? "Esta ficha complementa" : "Complemento desta ficha"}</p>
        {link.accessible ? <>
          <RelatedDocument id={link.document.id} type={link.document.type} label={link.document.code ?? link.document.protocol ?? "Consultar ficha vinculada"} />
          <p>{names[link.document.type]} · versão {link.role === "source" ? link.sourceVersion : link.childVersion} na vinculação</p>
          <p className="whitespace-pre-wrap wrap-break-word">Motivo: {link.reason}</p>
          <p>{link.actorName} · {formatBrazilDate(link.recordedAt)}</p>
        </> : <Notice>Acesso restrito à ficha relacionada. O vínculo não concede permissão para consultar seu conteúdo.</Notice>}
      </li>)}</ul>}
      {data.total > data.size ? <nav aria-label="Páginas de fichas complementares" className="flex flex-wrap items-center gap-3">
        <button className={buttonClass} type="button" disabled={page === 1} onClick={() => setPage(v => v - 1)}>Página anterior</button>
        <span>Página {page} de {Math.ceil(data.total / data.size)}</span>
        <button className={buttonClass} type="button" disabled={page * data.size >= data.total} onClick={() => setPage(v => v + 1)}>Próxima página</button>
      </nav> : null}
      {data.creatableTypes.length ? <>
        <p>Emita a nova ficha pelo fluxo habitual e volte aqui para vinculá-la. Os efeitos próprios da nova ficha continuam dependendo de suas confirmações normais.</p>
        <div className="flex flex-wrap gap-2">{data.creatableTypes.map(type => <Link key={type} className={buttonClass} aria-disabled={!activeContext} tabIndex={activeContext ? undefined : -1}
          onClick={event => { if (!activeContext) event.preventDefault(); }}
          href={`/fichas/${type.toLowerCase()}?complementOf=${documentId}&complementType=${data.document.type}`}>Emitir {type === "ENT" ? "entrega" : names[type].toLowerCase()}</Link>)}</div>
        {!activeContext ? <Notice>Selecione o paciente desta ficha para registrar um vínculo.</Notice> : null}
      </> : null}
      <button ref={triggerRef} className={buttonClass} type="button" onClick={() => setOpen(true)}>{data.creatableTypes.length ? "Vincular ficha emitida" : "Consultar tentativa de vínculo"}</button>
    </> : null}
    <button className={buttonClass} type="button" disabled={read.loading} onClick={read.refresh}>Atualizar vínculos</button>
    {open && data ? <ComplementEditor source={data} userId={userId} activeContext={activeContext} onRecorded={refreshed} onClose={() => setOpen(false)} finalFocus={triggerRef} /> : null}
  </div></DocumentSection>;
}
function ComplementEditor({ source, userId, activeContext, onRecorded, onClose, finalFocus }: {
  source: DocumentComplements; userId: string; activeContext: boolean; onRecorded: () => void; onClose: () => void; finalFocus: RefObject<HTMLButtonElement | null>;
}) {
  const sourceId = source.document.id, endpoint = `/api/documents/${sourceId}/complements`;
  const storageKey = `hca:complement-attempt:${userId}:${source.careRecipientId}:${sourceId}`;
  const [type, setType] = useState<DocumentType>(source.creatableTypes.includes(source.document.type) ? source.document.type : source.creatableTypes[0] ?? source.document.type);
  const [search, setSearch] = useState(""), [query, setQuery] = useState(""), [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(""), [reason, setReason] = useState("");
  const [review, setReview] = useState<LinkComplementInput | null>(null), [attempt, setAttempt] = useState<LinkComplementInput | null>(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false), [confirmed, setConfirmed] = useState(false), [denied, setDenied] = useState(false);
  const sendingRef = useRef(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      try { const saved = linkComplementInput.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null")); if (saved.success) setAttempt(saved.data); }
      catch { /* A corrupt optional hint is never submitted. */ }
      setReady(true);
    });
    return () => { live = false; };
  }, [storageKey]);
  const decode = useCallback((raw: unknown) => parseComplementCandidates((raw as { data: unknown; }).data, sourceId, type, query, page), [sourceId, type, query, page]);
  const read = useScopedRead(ready && !attempt && !confirmed && !denied ? endpoint + `?mode=candidates&type=${type}&search=${encodeURIComponent(query)}&page=${page}` : null, "", decode);
  const data = !read.loading && !read.error ? read.data : null;
  const selected = data?.documents.find(d => d.id === selectedId);
  const clearHint = () => { try { sessionStorage.removeItem(storageKey); } catch { /* The server confirmation remains authoritative. */ } };
  const done = () => { clearHint(); setConfirmed(true); setAttempt(null); setReview(null); setError(""); onRecorded(); };
  function failed(cause: unknown) {
    if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) { setDenied(true); setReason(""); setSelectedId(""); setReview(null); onRecorded(); }
    setError(cause instanceof Error ? cause.message : "Consulte a mesma tentativa antes de continuar.");
  }
  async function send(input: LinkComplementInput) {
    if (sendingRef.current || !activeContext) return;
    sendingRef.current = true; setBusy(true); setError(""); setNotFound(false); setAttempt(input); setReview(null);
    try { sessionStorage.setItem(storageKey, JSON.stringify(input)); } catch { /* Keep this same intention in memory. */ }
    try { const raw = await api<{ data: unknown; }>(endpoint, input); requireComplementConfirmation(raw.data, input); done(); }
    catch (cause) { failed(cause); }
    finally { sendingRef.current = false; setBusy(false); }
  }
  async function recover() {
    if (sendingRef.current || !attempt) return;
    sendingRef.current = true; setBusy(true); setError("");
    try {
      const raw = await api<{ data: unknown; }>(endpoint + "?mode=attempt&key=" + attempt.idempotencyKey);
      const result = parseComplementAttempt(raw.data, sourceId, attempt);
      if (result.state === "confirmed") done(); else { setNotFound(true); setDenied(false); }
    } catch (cause) { failed(cause); setNotFound(false); }
    finally { sendingRef.current = false; setBusy(false); }
  }
  return <Dialog open title="Vincular ficha complementar" onClose={onClose} closeDisabled={busy} finalFocus={finalFocus}>
    <div className="space-y-4" aria-busy={busy || read.loading}>
      <p>Ficha original: {source.document.code ?? source.document.protocol}. O motivo e o vínculo terão autoria e momento próprios, sem reescrever a emissão.</p>
      {error ? <Notice error>{error}</Notice> : null}
      {!ready ? <p role="status">Consultando tentativa guardada neste aparelho…</p> : confirmed ? <Notice>Vínculo confirmado. As duas fichas e seus atos anteriores permanecem preservados.</Notice> : attempt ? <>
        <Notice>Há uma tentativa de vínculo para consultar. Fechar ou recarregar não reenvia essa operação.</Notice>
        <button className={buttonClass} type="button" disabled={busy} onClick={() => void recover()}>Consultar a mesma tentativa</button>
        {notFound && !denied ? <>
          <p>A consulta confirmou que esta tentativa não registrou um vínculo.</p>
          <button className={primaryClass} type="button" disabled={busy || !activeContext} onClick={() => void send(attempt)}>Reenviar a mesma tentativa</button>
          <button className={buttonClass} type="button" disabled={busy} onClick={() => { setReason(attempt.reason); setAttempt(null); setNotFound(false); clearHint(); read.refresh(); }}>Revisar sem reenviar</button>
        </> : null}
      </> : denied ? <Notice>Acesso não confirmado. Feche este diálogo e atualize a ficha para consultar suas permissões.</Notice> : !source.creatableTypes.length ? <Notice>Seu acesso permite consultar uma tentativa própria guardada neste aparelho. Um novo vínculo exige permissão de emissão da nova ficha.</Notice> : review ? <>
        <h3>Conferir vínculo</h3>
        <p>Nova ficha: {selected?.code ?? selected?.protocol}. Versão {review.childVersion}.</p>
        <p>Ficha original: versão {review.sourceVersion}.</p>
        <p className="whitespace-pre-wrap wrap-break-word">Motivo: {review.reason}</p>
        <Notice>Este ato não substitui a ciência da família, não confirma recebimento e não altera estoque.</Notice>
        <button className={primaryClass} type="button" disabled={busy || !activeContext} onClick={() => void send(review)}>Confirmar vínculo complementar</button>
        <button className={buttonClass} type="button" disabled={busy} onClick={() => setReview(null)}>Voltar ao preenchimento</button>
      </> : <>
        <FormField label="Tipo da nova ficha"><SelectField value={type} onChange={event => { const parsed = complementType.parse(event.target.value); setType(parsed); setPage(1); setSelectedId(""); }}>{source.creatableTypes.map(t => <option key={t} value={t}>{names[t]}</option>)}</SelectField></FormField>
        <form className="space-y-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); setSelectedId(""); }}>
          <FormField label="Buscar pelo código ou protocolo"><TextInput maxLength={100} value={search} onChange={event => setSearch(event.target.value)} /></FormField>
          <button className={buttonClass} type="submit" disabled={read.loading}>Buscar fichas emitidas</button>
        </form>
        {read.loading ? <p role="status">Consultando fichas mais recentes autorizadas…</p> : null}
        {read.error ? <Notice error>{read.error}</Notice> : null}
        <button className={buttonClass} type="button" disabled={read.loading} onClick={read.refresh}>Atualizar fichas disponíveis</button>
        {data ? <>
          {!data.total ? <p>Nenhuma ficha elegível nesta busca. Emita uma nova ficha pelo fluxo habitual e volte para vinculá-la. São aceitas fichas emitidas depois da original, por você ou administradas por você, sem cancelamento.</p> : <fieldset className="space-y-2"><legend>Escolha a nova ficha</legend>{data.documents.map(d => <label key={d.id} className="flex min-h-11 items-start gap-3 border-b border-(--line) py-3"><input type="radio" name="complement-child" value={d.id} checked={selectedId === d.id} onChange={() => setSelectedId(d.id)} /><span className="wrap-break-word">{d.code} · {formatBrazilDate(d.issuedAt!)} · versão {d.version}</span></label>)}</fieldset>}
          {data.total > data.size ? <nav aria-label="Páginas de novas fichas" className="flex flex-wrap gap-3"><button className={buttonClass} type="button" disabled={page === 1} onClick={() => { setPage(v => v - 1); setSelectedId(""); }}>Página anterior</button><span>Página {page} de {Math.ceil(data.total / data.size)}</span><button className={buttonClass} type="button" disabled={page * data.size >= data.total} onClick={() => { setPage(v => v + 1); setSelectedId(""); }}>Próxima página</button></nav> : null}
        </> : null}
        <FormField label="Motivo do complemento" helpText="Explique o que a nova ficha complementa, sem substituir o conteúdo original." required><TextAreaField rows={4} minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></FormField>
        <button className={primaryClass} type="button" disabled={!selected || reason.trim().length < 3 || !activeContext} onClick={() => { if (selected && data) setReview(linkComplementInput.parse({ childId: selected.id, sourceVersion: data.sourceVersion, childVersion: selected.version, reason: reason.trim(), idempotencyKey: crypto.randomUUID() })); }}>Conferir vínculo</button>
      </>}
      <button className={buttonClass} type="button" disabled={busy} onClick={onClose}>Fechar</button>
    </div>
  </Dialog>;
}
