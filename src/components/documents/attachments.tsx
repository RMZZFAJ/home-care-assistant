"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { ApiError, observeCommand, requireRuntimeCommandsAvailable } from "@/lib/client/api";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { api, buttonClass, errorMessage, inputClass, Notice, primaryClass } from "@/components/workspace";
import { FileRecord, PdfFormatMark } from "@/components/ui/file-record";
import { ActionButton, ActionLink, DefinitionGrid, Pill } from "@/components/ui/controls";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { formatBrazilDate } from "@/lib/receipt";
import { attachmentForm, attachmentMaxBytes, attachmentMaxLabel, attachmentPrepared, confirmedAttachment, freezeAttachment, type FrozenAttachment } from "@/lib/documents/attachment-attempt";
import { ScopedReadFailureDialog } from "./scoped-read-failure-dialog";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const attachment = z.object({ id: z.uuid(), filename: z.string(), bytes: z.number().int().positive(), mime_type: z.string(), state: z.enum(["quarantine", "ready", "rejected", "abandoned"]), sha256: hash.nullable(), sourceSha256: hash.nullable(), sourceBytes: z.number().nullable(), sourceMime: z.string().nullable(), transformation: z.string().nullable(), uploadKey: z.uuid().nullable(), tracked: z.boolean(), pending: z.boolean(), canAbandon: z.boolean(), url: z.string().nullable(), uploadedName: z.string().nullish(), confirmedAt: z.iso.datetime({ offset: true }).nullish() });
const attachmentList = z.object({ data: z.array(attachment) });
function readList(value: unknown) {
  const result = attachmentList.safeParse(value);
  if (!result.success) throw new Error("A resposta da consulta não pôde ser conferida. Atualize os anexos para consultar novamente.");
  return result.data;
}
type Attachment = z.infer<typeof attachment>;
type Props = { patientId: string; documentId?: string; documentCode?: string; movementId?: string; contingencyId?: string; writable?: boolean; active?: boolean; onChange?: () => void; };

function AttachmentProvenance({ file }: { file: Attachment }) {
  return <details className="doc-help-details"><summary>Origem e conversão do arquivo</summary>
    {file.sourceSha256 ? <>
      <p>Original selecionado: {file.sourceMime} · {Math.ceil((file.sourceBytes ?? 0) / 1024)} KB. O original não é armazenado.</p>
      <p className="break-all">SHA-256 do original: <code>{file.sourceSha256}</code></p>
      <p>{file.transformation === "image-normalized-v1" ? "Imagem orientada, redimensionada e convertida para JPEG sem metadados." : "PDF com páginas passivas, sem anotações ou campos interativos."}</p>
    </> : <p>A origem e a transformação deste envio histórico não foram registradas. O hash disponível corresponde ao arquivo armazenado.</p>}
    {file.sha256 ? <p className="break-all">SHA-256 do arquivo disponível: <code>{file.sha256}</code></p> : null}
  </details>;
}
export function Attachments(props: Props) {
  return <ScopedAttachments key={`${props.patientId}:${props.documentId ?? ""}:${props.movementId ?? ""}:${props.contingencyId ?? ""}`} {...props} />;
}
function ScopedAttachments({ patientId, documentId, documentCode, movementId, contingencyId, writable = false, active = true, onChange }: Props) {
  const modalOnly = Boolean(documentId);
  const [adding, setAdding] = useState(false);
  const [uploadResult, setUploadResult] = useState<"sent" | "recovered" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]), [error, setError] = useState(""), [readError, setReadError] = useState(""), [message, setMessage] = useState("");
  const [archiveFailure, setArchiveFailure] = useState<{ cause: unknown; denied: boolean; dismissed: boolean; attempts: number } | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useOperationActivity(busy, { title: "Processando o anexo", detail: "Estamos conferindo a mesma solicitação. Aguarde a confirmação do arquivo." });
  const [fileInvalid, setFileInvalid] = useState(false), [fileValidation, setFileValidation] = useState(0);
  const fileErrorId = useId(), focusFileRef = useRef(false);
  const [frozen, setFrozen] = useState<FrozenAttachment | null>(null), [uncertain, setUncertain] = useState(false);
  const abandonFocusRef = useRef<HTMLElement | null>(null);
  const [abandonTarget, setAbandonTarget] = useState<Attachment | null>(null), [resumeTarget, setResumeTarget] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null), refreshRef = useRef<HTMLButtonElement>(null), pendingRef = useRef<FrozenAttachment | null>(null), preparedIdRef = useRef<string | undefined>(undefined), mountedRef = useRef(true);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [fileDetail, setFileDetail] = useState<{ id: string; open: boolean; opener: HTMLButtonElement } | null>(null);
  const recoveredRef = useRef(new Set<string>());
  const attachmentFormId = useId();
  const resolveAbandonFocus = useCallback(() => {
    const target = abandonFocusRef.current;
    return target?.isConnected && !target.matches(':disabled,[aria-disabled="true"]') ? target : refreshRef.current;
  }, []);
  const uploadReturnFocus = useCallback(() => {
    const button = addButtonRef.current;
    return button && !button.disabled ? button : refreshRef.current;
  }, []);
  useEffect(() => {
    if (active && readError && (!document.activeElement || document.activeElement === document.body)) refreshRef.current?.focus();
  }, [active, readError]);
  useEffect(() => {
    if (!busy && focusFileRef.current) {
      focusFileRef.current = false;
      if (fileInputRef.current && !fileInputRef.current.disabled) fileInputRef.current.focus();
    }
  }, [busy, fileValidation]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!frozen || modalOnly) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [frozen, modalOnly]);
  const query = new URLSearchParams({ careRecipientId: patientId, ...(contingencyId ? { contingencyId } : documentId ? { documentId } : { movementId: movementId! }) }).toString();
  const reservations = files.filter(file => file.state === "quarantine" && file.tracked && file.uploadKey);
  const unresolved = reservations.length > 0;
  const releasable = reservations.filter(file => file.canAbandon);
  const newPreparationBlocked = !frozen && !resumeTarget && (loading || Boolean(readError) || !modalOnly && unresolved);
  useEffect(() => {
    const controller = new AbortController();
    api<unknown>("/api/attachments?" + query, undefined, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setFiles(readList(result).data); setReadError(""); setArchiveFailure(null); setLoading(false);
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setFiles([]); setFileDetail(null); setAbandonTarget(null);
      setReadError(reason instanceof Error ? reason.message : "Não foi possível consultar anexos.");
      if (modalOnly) setArchiveFailure(current => ({
        cause: reason,
        denied: reason instanceof ApiError && [401, 403, 404].includes(reason.status),
        dismissed: false,
        attempts: current?.dismissed ? 0 : current?.attempts ?? 0,
      }));
      setLoading(false);
    });
    return () => controller.abort();
  }, [query, attempt, modalOnly]);
  function refreshAttachments() {
    recoveredRef.current.clear();
    setLoading(true);
    setAttempt(value => value + 1);
  }
  function clearPending(keepSelection = false) {
    setFileInvalid(false); focusFileRef.current = false;
    pendingRef.current = null; preparedIdRef.current = undefined; setFrozen(null); setUncertain(false); setResumeTarget(null);
    if (!keepSelection) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  function acceptConfirmed(body: unknown, pending: FrozenAttachment, recovered = false) {
    const receipt = confirmedAttachment(body, pending.sourceSha256, preparedIdRef.current);
    if (!receipt) throw new Error("A resposta não confirma esta tentativa. Consulte o envio antes de iniciar outro.");
    if (!mountedRef.current) return;
    clearPending();
    setAdding(false);
    if (modalOnly) setUploadResult(recovered ? "recovered" : "sent");
    else setMessage("Anexo confirmado. O arquivo está disponível na lista.");
    setAttempt(value => value + 1);
    onChange?.();
  }
  const commandFor = useCallback((file: Attachment, action: "recover" | "abandon") => {
    return api<unknown>("/api/attachments", { careRecipientId: patientId, documentId, movementId, contingencyId, id: file.id, key: file.uploadKey, action }, undefined, "PATCH");
  }, [patientId, documentId, movementId, contingencyId]);
  const reconcileQuietly = useCallback(async (attempt: Attachment, closedHere: boolean) => {
    if (!attempt.uploadKey || !attempt.sourceSha256 || attempt.state !== "quarantine") return;
    const received = await commandFor(attempt, "recover");
    if (confirmedAttachment(received, attempt.sourceSha256, attempt.id)) {
      if (mountedRef.current) setAttempt(value => value + 1);
      return;
    }
    const unconfirmed = z.object({ id: z.uuid(), persistence: z.literal("unconfirmed"), canAbandon: z.boolean() }).safeParse(received);
    if (closedHere && unconfirmed.success && unconfirmed.data.id === attempt.id && unconfirmed.data.canAbandon)
      await commandFor(attempt, "abandon");
  }, [commandFor]);
  useEffect(() => {
    if (!modalOnly || !writable || adding || loading || readError) return;
    for (const file of files) {
      if (file.state !== "quarantine" || !file.uploadKey || recoveredRef.current.has(file.id)) continue;
      recoveredRef.current.add(file.id);
      void reconcileQuietly(file, false).catch(() => { /* The next explicit refresh rechecks the official result. */ });
    }
  }, [modalOnly, writable, adding, loading, readError, files, reconcileQuietly]);
  function closeUpload() {
    setAdding(false);
    if (!modalOnly) return;
    const pending = pendingRef.current;
    clearPending();
    setError("");
    if (!pending) return;
    void api<unknown>(`/api/attachments?${query}&attemptKey=${pending.key}`).then(async value => {
      const attempt = readList(value).data[0];
      if (attempt?.sourceSha256 === pending.sourceSha256) {
        await reconcileQuietly(attempt, true);
        if (mountedRef.current && attempt.state === "ready") setAttempt(value => value + 1);
      }
    }).catch(() => { /* The server retains the reservation. A later consultation can confirm it. */ });
  }
  function deniedRead(reason: unknown) {
    if (!(reason instanceof ApiError) || ![401, 403, 404].includes(reason.status)) return false;
    setFiles([]); setFileDetail(null); setAbandonTarget(null); setReadError(reason.message); return true;
  }
  async function upload(event?: FormEvent<HTMLFormElement>, resuming = resumeTarget, selectedFile?: File) {
    event?.preventDefault(); if (busy || newPreparationBlocked && !resuming) return;
    setBusy(true); setError(""); setMessage(""); setFileInvalid(false);
    let phase: "local" | "prepare" | "upload" = "local";
    const wasUncertain = uncertain;
    try {
      requireRuntimeCommandsAvailable();
      let pending = pendingRef.current;
      if (!pending) {
        const file = selectedFile ?? fileInputRef.current?.files?.[0];
        if (!file) return;
        if (file.size > attachmentMaxBytes) { focusFileRef.current = true; setFileInvalid(true); setFileValidation(value => value + 1); throw new Error(`Selecione um arquivo de até ${attachmentMaxLabel}.`); }
        pending = await freezeAttachment(file);
        if (resuming) {
          if (pending.sourceSha256 !== resuming.sourceSha256) { focusFileRef.current = true; setFileInvalid(true); setFileValidation(value => value + 1); throw new Error("Este arquivo não corresponde ao original da tentativa. Selecione o mesmo arquivo para retomar."); }
          pending = Object.freeze({ ...pending, file: new File([pending.file], resuming.filename, { type: resuming.sourceMime ?? pending.file.type }), key: resuming.uploadKey! }); preparedIdRef.current = resuming.id;
        }
        pendingRef.current = pending; setFrozen(pending);
      }
      if (wasUncertain || resuming) {
        const result = readList(await api<unknown>(`/api/attachments?${query}&attemptKey=${pending.key}`));
        const current = result.data[0];
        if (current) {
          if (current.sourceSha256 && current.sourceSha256 !== pending.sourceSha256) throw new Error("A tentativa pertence a outro arquivo. Preserve o envio e solicite suporte.");
          preparedIdRef.current = current.id;
          if (current.state === "ready") { acceptConfirmed(await commandFor(current, "recover"), pending, true); return; }
          if (current.state === "abandoned") { clearPending(); setAttempt(value => value + 1); setMessage("A tentativa já foi abandonada. Você pode preparar outro arquivo."); return; }
        }
      }
      async function send(prepare: boolean) {
        const upload = pending!;
        const form = attachmentForm(upload, patientId, documentId, movementId, contingencyId);
        return observeCommand(async () => {
          const response = await fetch(`/api/attachments${prepare ? "?prepare=1" : ""}`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
          const body: unknown = await response.json().catch(() => { throw new Error("A resposta do envio não pôde ser confirmada. Consulte a mesma tentativa."); });
          if (!response.ok) {
            // Only a complete pre-reservation refusal settles this send.
            const refusal = z.object({ code: z.enum(["VALIDATION_ERROR", "PAYLOAD_TOO_LARGE", "PDF_ANNOTATIONS_UNSUPPORTED"]) }).safeParse(body);
            const message = errorMessage(body, "Não foi possível confirmar o anexo.");
            if (prepare && !wasUncertain && !resumeTarget && !preparedIdRef.current && [400, 413, 422].includes(response.status) && refusal.success) {
              clearPending(true);
              throw new ApiError(message, response.status);
            }
            throw new Error(message);
          }
          if (confirmedAttachment(body, upload.sourceSha256, preparedIdRef.current)) return { kind: "confirmed" as const, body };
          if (!prepare) throw new Error("A resposta do envio não pôde ser confirmada. Consulte a mesma tentativa.");
          const result = attachmentPrepared.safeParse(body);
          if (!result.success) throw new Error("A preparação não pôde ser confirmada. Consulte a mesma tentativa.");
          if (result.data.sourceSha256 !== upload.sourceSha256 || preparedIdRef.current && result.data.id !== preparedIdRef.current)
            throw new Error("A preparação não corresponde ao arquivo desta tentativa.");
          return { kind: "prepared" as const, body: result.data };
        });
      }
      phase = "prepare";
      const prepared = await send(true);
      if (prepared.kind === "confirmed") { acceptConfirmed(prepared.body, pending, true); return; }
      preparedIdRef.current = prepared.body.id;
      phase = "upload";
      acceptConfirmed((await send(false)).body, pending);
    } catch (reason) {
      if (pendingRef.current && phase !== "local") setUncertain(true);
      const interrupted = reason instanceof TypeError || reason && typeof reason === "object" && "name" in reason && ["AbortError", "TimeoutError"].includes(String(reason.name));
      if (!deniedRead(reason)) setError(interrupted ? "Não foi possível confirmar o envio. Recupere a mesma tentativa para consultar o resultado." : reason instanceof Error ? reason.message : "Não foi possível confirmar o envio. Recupere a mesma tentativa.");
      if (phase !== "local") setAttempt(value => value + 1);
    } finally { setBusy(false); }
  }
  async function recover(file: Attachment) {
    setBusy(true); setError(""); setMessage(""); setFileInvalid(false);
    try {
      const body = await commandFor(file, "recover"), receipt = confirmedAttachment(body, file.sourceSha256!, file.id);
      if (!receipt) {
      const pending = z.object({ id: z.uuid(), persistence: z.literal("unconfirmed"), canAbandon: z.boolean() }).safeParse(body);
        if (!pending.success || pending.data.id !== file.id) throw new Error("Não foi possível confirmar esta tentativa.");
      setMessage(pending.data.canAbandon
        ? "O envio ainda não está confirmado. Você pode retomar com o mesmo arquivo ou abandonar a reserva incompleta."
        : "O envio ainda não está confirmado. Consulte novamente ou retome com o mesmo arquivo. Resultado pendente impede o abandono.");
      } else {
        if (pendingRef.current?.key === file.uploadKey) clearPending();
        setResumeTarget(current => current?.id === file.id ? null : current);
        setMessage("Anexo recuperado e confirmado."); if (mountedRef.current) onChange?.();
      }
      setAttempt(value => value + 1);
    } catch (reason) { if (!deniedRead(reason)) setError(reason instanceof Error ? reason.message : "Não foi possível consultar a tentativa."); }
    finally { setBusy(false); }
  }
  async function confirmAbandon(file: Attachment) {
    const parsed = z.object({ id: z.uuid(), persistence: z.literal("abandoned") }).safeParse(await commandFor(file, "abandon"));
    if (!parsed.success || parsed.data.id !== file.id)
      throw new Error("O abandono não pôde ser confirmado. Consulte ou repita a mesma ação antes de escolher outro arquivo.");
  }
  async function abandon(file: Attachment) {
    setBusy(true); setError(""); setFileInvalid(false);
    try {
      await confirmAbandon(file);
      if (pendingRef.current?.key === file.uploadKey) clearPending();
      if (resumeTarget?.id === file.id) setResumeTarget(null);
      abandonFocusRef.current = refreshRef.current;
      setAbandonTarget(null); setAttempt(value => value + 1); setMessage("Tentativa abandonada. O histórico foi preservado; você pode preparar outro arquivo.");
    } catch (reason) { if (!deniedRead(reason)) setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o abandono."); }
    finally { setBusy(false); }
  }
  async function releaseUnusedReservations() {
    if (busy || frozen || !releasable.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      for (const file of releasable) await confirmAbandon(file);
      setMessage("Vagas liberadas. Você pode selecionar um arquivo para enviar.");
      focusFileRef.current = true;
    } catch (reason) {
      if (!deniedRead(reason)) setError("A liberação de todas as vagas ainda não foi confirmada. Confira os anexos e tente novamente.");
    } finally {
      setAttempt(value => value + 1);
      setBusy(false);
    }
  }
  const visibleFiles = modalOnly ? files.filter(file => file.state === "ready") : files;
  const detail = visibleFiles.find(file => file.id === fileDetail?.id);
  const closeDetail = () => setFileDetail(current => current && { ...current, open: false });
  const full = modalOnly && visibleFiles.length >= 10;
  const fileHref = (file: Attachment, action: "view" | "download") => `/api/attachments?${query}&fileId=${file.id}&fileAction=${action}`;
  return <section className="doc-area" aria-label="Anexos e ficha física"><header className="doc-section-heading"><div><h2>Anexos</h2><p>Arquivos vinculados à ficha, separados dos exemplares emitidos.</p></div><div className="doc-heading-actions"><button ref={refreshRef} className={buttonClass} type="button" disabled={busy} onClick={refreshAttachments}><Icon name="refresh" />Atualizar anexos</button>{writable ? <button ref={addButtonRef} className={primaryClass} type="button" disabled={busy || newPreparationBlocked || full} onClick={() => setAdding(true)}><Icon name="plus" />{full ? "Limite de anexos atingido" : !modalOnly && frozen ? "Recuperar envio do anexo" : "Adicionar anexo"}</button> : null}</div></header>
    {!modalOnly && unresolved && !frozen ? <p role="status">Há uma tentativa em andamento. Consulte ou retome no cartão do arquivo antes de adicionar outro anexo.</p> : null}
    <p className="mt-2 text-xs text-(--muted)">Até dez arquivos ou reservas em andamento. Novos envios de até {attachmentMaxLabel}. Fotos e PDFs são convertidos para leitura segura; confira o arquivo disponível. A foto da ficha física continua como alternativa ao formulário.</p>
    {error && !abandonTarget && !adding && !resumeTarget ? <div id={fileErrorId}><Notice error>{error}</Notice></div> : null}
    {readError ? <Notice error>Não foi possível consultar a lista de anexos. {readError} Atualize esta seção.</Notice> : null}
    {modalOnly ? <ScopedReadFailureDialog subject="files" open={active && !adding && !uploadResult && !busy && Boolean(archiveFailure && !archiveFailure.dismissed)}
      title="Não foi possível consultar os anexos" denied={archiveFailure?.denied ?? false} message={readError} loading={loading}
      cause={archiveFailure?.cause} attempts={archiveFailure?.attempts ?? 0}
      returnFocus={refreshRef} onClose={() => setArchiveFailure(current => current && { ...current, dismissed: true })}
      onRetry={() => {
        setArchiveFailure(current => current && { ...current, attempts: current.attempts + 1 });
        refreshAttachments();
      }} /> : null}
    {message ? <Notice>{message}</Notice> : null}
    {loading ? <p className="mt-3 text-sm" role="status">Consultando anexos…</p> : null}
    {modalOnly && !loading && !readError ? <div className="hca-file-collection-heading">
      <strong>Arquivos vinculados</strong><span>{writable ? `${visibleFiles.length} de 10 vagas` : `${visibleFiles.length} arquivo(s)`}</span>
    </div> : null}
    <ul className={modalOnly ? "hca-file-archive-list" : "doc-card doc-file-list doc-file-list-compact"} aria-label="Arquivos anexados">{visibleFiles.map(file => <FileRecord key={file.id} identity={file.id} mime={file.mime_type} filename={file.filename}
      title={modalOnly || file.url ? <a href={modalOnly ? fileHref(file, "view") : file.url!} target="_blank" rel="noopener noreferrer">{file.filename}</a> : file.filename}
      archive={modalOnly ? {
        description: file.uploadedName ? `Adicionado por ${file.uploadedName}` : "Autoria indisponível",
        details: <ActionButton className="hca-file-record-more hca-control-icon" aria-haspopup="dialog" aria-label={`Detalhes do anexo ${file.filename}`}
          onClick={event => setFileDetail({ id: file.id, open: true, opener: event.currentTarget })}><Icon name="more" /></ActionButton>,
        facts: <Pill tone="success">Disponível</Pill>,
      } : undefined}
      actions={modalOnly ? <>
        <ActionLink compact href={fileHref(file, "view")} target="_blank" rel="noopener noreferrer" aria-label={`Visualizar ${file.filename}`}><Icon name="eye" />Visualizar</ActionLink>
        <ActionLink compact className="hca-control-icon" href={fileHref(file, "download")} aria-label={`Baixar ${file.filename}`}><Icon name="download" /></ActionLink>
      </> : undefined}>
      {modalOnly ? <>
        {file.confirmedAt ? <time dateTime={file.confirmedAt}>{formatBrazilDate(file.confirmedAt)}</time> : <span>Data de confirmação indisponível</span>}
        <span>{Math.ceil(file.bytes / 1024)} KB</span>
      </> : <>
        <DefinitionGrid items={[{ label: "Tamanho disponível", value: Math.ceil(file.bytes / 1024) + " KB" }, { label: "Estado", value: file.state === "ready" ? "Validado" : file.state === "rejected" ? "Rejeitado" : file.pending ? "Resultado do envio pendente" : "Preparado; envio não confirmado" }]} />
        <AttachmentProvenance file={file} />
      </>}
      {writable && file.state === "quarantine" && file.uploadKey && file.tracked ? <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void recover(file)}>Consultar e recuperar tentativa</button>
        {(!frozen || frozen.key === file.uploadKey) && file.sourceSha256 ? <button type="button" className={buttonClass} disabled={busy} onClick={() => { setResumeTarget(file); if (pendingRef.current?.key === file.uploadKey) void upload(undefined, file); else void recover(file); }}>Retomar envio</button> : null}
        {file.canAbandon ? <button type="button" className={buttonClass} disabled={busy} onClick={event => { abandonFocusRef.current = event.currentTarget; setAbandonTarget(file); }}>Abandonar tentativa incompleta</button> : <p className="text-xs">O resultado ainda pode estar pendente. O abandono permanece indisponível.</p>}
      </div> : null}
      {resumeTarget?.id === file.id ? <div className="hca-attachment-resume" aria-live="polite">
        {busy ? <p role="status">Verificando e retomando esta tentativa…</p> : frozen ? <><p>Arquivo preservado nesta tentativa: {frozen.file.name}.</p><button className={primaryClass} type="button" onClick={() => void upload(undefined, file)}>Verificar e continuar este envio</button></> : <><p>O navegador não mantém os bytes deste arquivo. Selecione o mesmo original para continuar aqui. A tentativa e o destino serão preservados.</p><label className="block text-sm font-semibold">Arquivo original para retomar<input ref={fileInputRef} className={inputClass} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-invalid={fileInvalid} aria-describedby={fileInvalid ? fileErrorId : undefined} onChange={event => { const selected = event.currentTarget.files?.[0]; if (selected) void upload(undefined, file, selected); }} /></label><button type="button" className={buttonClass} onClick={() => setResumeTarget(null)}>Fechar por enquanto</button></>}
        {error ? <p role="alert">{error}</p> : null}
      </div> : null}
    </FileRecord>)}</ul>
    {modalOnly && detail && fileDetail ? <Drawer open={fileDetail.open} title="Detalhes do anexo" subtitle={`${documentCode ?? "Ficha"} · Arquivo vinculado`}
      headingIcon="file" keyboardScrollable onClose={closeDetail}
      finalFocus={() => fileDetail.opener.isConnected ? fileDetail.opener : refreshRef.current ?? false}
      footer={<><ActionButton onClick={closeDetail}>Voltar aos arquivos</ActionButton>
        <a className={primaryClass} href={fileHref(detail, "view")} target="_blank" rel="noopener noreferrer"><Icon name="eye" />Visualizar</a></>}>
      <div className="hca-form-stack">
        <div className="hca-file-details-lead">{detail.mime_type === "application/pdf" ? <PdfFormatMark /> : <Icon name="image" width={26} height={26} />}
          <strong>{detail.filename}</strong></div>
        <DefinitionGrid items={[
          { label: "Adicionado por", value: detail.uploadedName ?? "Autoria indisponível" },
          { label: "Envio confirmado em", value: detail.confirmedAt ? formatBrazilDate(detail.confirmedAt) : "Data indisponível" },
          { label: "Tamanho disponível", value: Math.ceil(detail.bytes / 1024) + " KB" },
          { label: "Estado", value: "Validado" },
        ]} />
        <AttachmentProvenance file={detail} />
      </div>
    </Drawer> : null}
    <Dialog open={Boolean(abandonTarget && files.some(file => file.id === abandonTarget.id))} title="Abandonar tentativa incompleta" closeDisabled={busy} finalFocus={resolveAbandonFocus} onClose={() => setAbandonTarget(null)}>
      {abandonTarget ? <>
        <div role="group" aria-label="Confirmar abandono da tentativa" className="hca-form-stack">
          {error ? <Notice error>{error}</Notice> : null}
          <p>Abandonar esta reserva incompleta libera a vaga. Arquivos confirmados e histórico serão preservados.</p>
          <DefinitionGrid items={[{ label: "Arquivo", value: abandonTarget.filename, wide: true }, { label: "Tentativa", value: abandonTarget.id, wide: true }]} />
          <button type="button" className={buttonClass} disabled={busy} onClick={() => setAbandonTarget(null)}>Voltar sem abandonar</button>
          <button type="button" className={buttonClass} disabled={busy} onClick={() => void abandon(abandonTarget)}>Confirmar abandono desta tentativa</button>
        </div>
      </> : null}
    </Dialog>
    {active && uploadResult ? <Dialog open success title="Anexo disponível"
      subtitle={uploadResult === "recovered" ? "O resultado desta tentativa foi confirmado. O arquivo já aparece nos anexos da ficha." : "O envio foi concluído. O arquivo já aparece nos anexos da ficha."}
      finalFocus={uploadReturnFocus} onClose={() => setUploadResult(null)}
      footer={<ActionButton variant="primary" onClick={() => setUploadResult(null)}><Icon name="check" />Concluir</ActionButton>}>
      {null}
    </Dialog> : null}
    {!loading && !visibleFiles.length && !readError ? <p className="mt-4 text-sm text-(--muted)">Nenhum anexo registrado.</p> : null}
    {writable && modalOnly ? <Dialog open={adding} title="Adicionar anexo" subtitle="Vincule um documento à ficha."
      headingIcon="upload" closeDisabled={busy} finalFocus={addButtonRef} onClose={closeUpload}
      footer={<>
        <button type="button" className={buttonClass} disabled={busy} onClick={closeUpload}>Fechar</button>
        <button type="submit" className={primaryClass} form={attachmentFormId} aria-disabled={busy || newPreparationBlocked}>
          <Icon name={error ? "refresh" : "upload"} />{busy ? "Enviando…" : uncertain ? "Conferir envio" : error ? "Tentar novamente" : "Enviar anexo"}
        </button>
      </>}>
      <form id={attachmentFormId} className="hca-form-stack" onSubmit={upload}>
        {error && !abandonTarget ? <div id={fileErrorId}><Notice error>{error}</Notice></div> : null}
        {message ? <Notice>{message}</Notice> : null}
        {readError ? <Notice error>{readError}</Notice> : null}
        {!frozen && releasable.length ? <div className="hca-form-stack">
          <p>Há vagas reservadas por envios que não começaram. Você pode liberá-las para escolher um arquivo.</p>
          <button type="button" className={buttonClass} disabled={busy || loading || Boolean(readError)}
            onClick={() => void releaseUnusedReservations()}>Liberar vagas de envios incompletos</button>
        </div> : null}
        <label className="hca-attachment-picker" data-selected={Boolean(selectedFile)}>
          {selectedFile ? <>
            {selectedFile.type === "application/pdf" ? <PdfFormatMark /> : <Icon name="image" width={26} height={26} />}
            <span><strong>{selectedFile.name}</strong><small>{Math.ceil(selectedFile.size / 1024)} KB</small></span>
            {!frozen ? <Icon name="edit" /> : null}
          </> : <>
            <Icon name="upload" width={28} height={28} /><strong>Escolher foto ou PDF</strong>
            <small>JPG, PNG, WebP ou PDF · até {attachmentMaxLabel}</small>
          </>}
          <input ref={fileInputRef} className={inputClass} type="file" name="file"
            aria-label="Adicionar foto ou PDF" accept="image/jpeg,image/png,image/webp,application/pdf"
            aria-invalid={fileInvalid} aria-describedby={fileInvalid ? fileErrorId : undefined}
            disabled={busy || Boolean(frozen) || newPreparationBlocked} required={!frozen}
            onChange={event => { setSelectedFile(event.currentTarget.files?.[0] ?? null); setFileInvalid(false); setError(""); }} />
        </label>
        <p className="hca-attachment-destination"><Icon name="file" width={16} height={16} />Destino <strong>{documentCode ?? "Esta ficha"} · Anexos</strong></p>
        <p className="hca-field-help">Se fechar esta janela antes de concluir, será necessário selecionar o arquivo novamente.</p>
      </form>
    </Dialog> : null}
    {writable && !modalOnly && !resumeTarget ? <Dialog keepMounted open={adding} title="Adicionar anexo" closeDisabled={busy} onClose={closeUpload}><form className="hca-form-stack" onSubmit={upload}>
      {adding && error ? <div id={fileErrorId}><Notice error>{error}</Notice></div> : null}
      {adding && readError ? <Notice error>{readError}</Notice> : null}
      {unresolved && !frozen && !resumeTarget ? <p role="status">Consulte ou retome a tentativa em andamento antes de preparar outro anexo.</p> : null}
      <label className="block text-sm font-semibold">{resumeTarget ? "Arquivo original para retomar" : "Adicionar foto ou PDF"}<input ref={fileInputRef} className={inputClass} type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-invalid={fileInvalid} aria-describedby={fileInvalid ? fileErrorId : undefined} onChange={() => { setFileInvalid(false); setError(""); }} disabled={busy || Boolean(frozen) || newPreparationBlocked} required={!frozen} /></label>
      {frozen ? <p role="status">Arquivo desta tentativa: {frozen.file.name}. A escolha fica bloqueada até confirmar ou abandonar uma reserva sem envio pendente.</p> : null}
      <button type="submit" className={primaryClass} aria-disabled={busy || newPreparationBlocked}>{busy ? "Validando e enviando…" : uncertain ? "Recuperar envio do anexo" : "Enviar anexo"}</button>
      {resumeTarget && !frozen ? <button type="button" className={buttonClass} disabled={busy} onClick={() => setResumeTarget(null)}>Voltar à preparação de novo arquivo</button> : null}
    </form></Dialog> : null}
  </section>;
}
