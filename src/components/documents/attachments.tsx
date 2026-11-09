"use client";
import { ApiError, requireRuntimeCommandsAvailable } from "@/lib/client/api";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { api, buttonClass, errorMessage, inputClass, Notice, primaryClass } from "@/components/workspace";
import { SettingsSection } from "@/components/forms/settings-section";
import { attachmentForm, attachmentMaxBytes, attachmentMaxLabel, attachmentPrepared, confirmedAttachment, freezeAttachment, type FrozenAttachment } from "@/lib/documents/attachment-attempt";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const attachment = z.object({ id: z.uuid(), filename: z.string(), bytes: z.number().int().positive(), mime_type: z.string(), state: z.enum(["quarantine", "ready", "rejected", "abandoned"]), sha256: hash.nullable(), sourceSha256: hash.nullable(), sourceBytes: z.number().nullable(), sourceMime: z.string().nullable(), transformation: z.string().nullable(), uploadKey: z.uuid().nullable(), tracked: z.boolean(), pending: z.boolean(), canAbandon: z.boolean(), url: z.string().nullable() });
const attachmentList = z.object({ data: z.array(attachment) });
function readList(value: unknown) {
  const result = attachmentList.safeParse(value);
  if (!result.success) throw new Error("A resposta da consulta não pôde ser conferida. Atualize os anexos para consultar novamente.");
  return result.data;
}
type Attachment = z.infer<typeof attachment>;
type Props = { patientId: string; documentId?: string; movementId?: string; writable?: boolean; onChange?: () => void };
export function Attachments(props: Props) {
  return <ScopedAttachments key={`${props.patientId}:${props.documentId ?? ""}:${props.movementId ?? ""}`} {...props} />;
}
function ScopedAttachments({ patientId, documentId, movementId, writable = false, onChange }: Props) {
  const [files, setFiles] = useState<Attachment[]>([]), [error, setError] = useState(""), [readError, setReadError] = useState(""), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  const [fileInvalid, setFileInvalid] = useState(false), [fileValidation, setFileValidation] = useState(0);
  const fileErrorId = useId(), focusFileRef = useRef(false);
  const [frozen, setFrozen] = useState<FrozenAttachment | null>(null), [uncertain, setUncertain] = useState(false);
  const [abandonTarget, setAbandonTarget] = useState<Attachment | null>(null), [resumeTarget, setResumeTarget] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null), refreshRef = useRef<HTMLButtonElement>(null), pendingRef = useRef<FrozenAttachment | null>(null), preparedIdRef = useRef<string | undefined>(undefined), mountedRef = useRef(true);
  useEffect(() => {
    if (readError && (!document.activeElement || document.activeElement === document.body)) refreshRef.current?.focus();
  }, [readError]);
  useEffect(() => {
    if (!busy && focusFileRef.current) {
      focusFileRef.current = false;
      if (fileInputRef.current && !fileInputRef.current.disabled) fileInputRef.current.focus();
    }
  }, [busy, fileValidation]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!frozen) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [frozen]);
  const query = new URLSearchParams({ careRecipientId: patientId, ...(documentId ? { documentId } : { movementId: movementId! }) }).toString();
  const unresolved = files.some(file => file.state === "quarantine" && file.tracked && file.uploadKey);
  const newPreparationBlocked = !frozen && !resumeTarget && (loading || Boolean(readError) || unresolved);
  useEffect(() => {
    const controller = new AbortController();
    api<unknown>("/api/attachments?" + query, undefined, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setFiles(readList(result).data); setReadError(""); setLoading(false);
    }).catch(reason => {
      if (!controller.signal.aborted) { setFiles([]); setReadError(reason instanceof Error ? reason.message : "Não foi possível consultar anexos."); setLoading(false); }
    });
    return () => controller.abort();
  }, [query, attempt]);
  function clearPending(keepSelection = false) {
    setFileInvalid(false); focusFileRef.current = false;
    pendingRef.current = null; preparedIdRef.current = undefined; setFrozen(null); setUncertain(false); setResumeTarget(null);
    if (fileInputRef.current && !keepSelection) fileInputRef.current.value = "";
  }
  function acceptConfirmed(body: unknown, pending: FrozenAttachment) {
    const receipt = confirmedAttachment(body, pending.sourceSha256, preparedIdRef.current);
    if (!receipt) throw new Error("A resposta não confirma esta tentativa. Consulte o envio antes de iniciar outro.");
    if (!mountedRef.current) return;
    clearPending(); setMessage("Anexo confirmado. O arquivo está disponível na lista."); setAttempt(value => value + 1); onChange?.();
  }
  async function commandFor(file: Attachment, action: "recover" | "abandon") {
    return api<unknown>("/api/attachments", { careRecipientId: patientId, documentId, movementId, id: file.id, key: file.uploadKey, action }, undefined, "PATCH");
  }
  function deniedRead(reason: unknown) {
    if (!(reason instanceof ApiError) || ![401, 403, 404].includes(reason.status)) return false;
    setFiles([]); setReadError(reason.message); return true;
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || newPreparationBlocked) return;
    setBusy(true); setError(""); setMessage(""); setFileInvalid(false);
    let phase: "local" | "prepare" | "upload" = "local";
    const wasUncertain = uncertain;
    try {
      requireRuntimeCommandsAvailable();
      let pending = pendingRef.current;
      if (!pending) {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;
        if (file.size > attachmentMaxBytes) { focusFileRef.current = true; setFileInvalid(true); setFileValidation(value => value + 1); throw new Error(`Selecione um arquivo de até ${attachmentMaxLabel}.`); }
        pending = await freezeAttachment(file);
        if (resumeTarget) {
          if (pending.sourceSha256 !== resumeTarget.sourceSha256) { focusFileRef.current = true; setFileInvalid(true); setFileValidation(value => value + 1); throw new Error("Este arquivo não corresponde ao original da tentativa. Selecione o mesmo arquivo para retomar."); }
          pending = Object.freeze({ ...pending, file: new File([pending.file], resumeTarget.filename, { type: resumeTarget.sourceMime ?? pending.file.type }), key: resumeTarget.uploadKey! }); preparedIdRef.current = resumeTarget.id;
        }
        pendingRef.current = pending; setFrozen(pending);
      }
      if (wasUncertain || resumeTarget) {
        const result = readList(await api<unknown>(`/api/attachments?${query}&attemptKey=${pending.key}`));
        const current = result.data[0];
        if (current) {
          if (current.sourceSha256 && current.sourceSha256 !== pending.sourceSha256) throw new Error("A tentativa pertence a outro arquivo. Preserve o envio e solicite suporte.");
          preparedIdRef.current = current.id;
          if (current.state === "ready") { acceptConfirmed(await commandFor(current, "recover"), pending); return; }
          if (current.state === "abandoned") { clearPending(); setAttempt(value => value + 1); setMessage("A tentativa já foi abandonada. Você pode preparar outro arquivo."); return; }
        }
      }
      async function send(prepare: boolean) {
        const response = await fetch(`/api/attachments${prepare ? "?prepare=1" : ""}`, { method: "POST", body: attachmentForm(pending!, patientId, documentId, movementId), signal: AbortSignal.timeout(30_000) });
        const body: unknown = await response.json().catch(() => { throw new Error("A resposta do envio não pôde ser confirmada. Consulte a mesma tentativa."); });
        if (!response.ok) {
          // A complete validation refusal before any reservation is distinct
          // from a lost/malformed response or a previously unknown command.
          const refusal = z.object({ code: z.enum(["VALIDATION_ERROR", "PAYLOAD_TOO_LARGE", "PDF_ANNOTATIONS_UNSUPPORTED"]) }).safeParse(body);
          if (prepare && !wasUncertain && !resumeTarget && !preparedIdRef.current && [400, 413, 422].includes(response.status) && refusal.success) clearPending(true);
          throw new Error(errorMessage(body, "Não foi possível confirmar o anexo."));
        }
        return body;
      }
      phase = "prepare";
      const prepared = await send(true);
      if (confirmedAttachment(prepared, pending.sourceSha256, preparedIdRef.current)) { acceptConfirmed(prepared, pending); return; }
      const parsed = attachmentPrepared.safeParse(prepared);
      if (!parsed.success) throw new Error("A preparação não pôde ser confirmada. Consulte a mesma tentativa.");
      const receipt = parsed.data;
      if (receipt.sourceSha256 !== pending.sourceSha256 || preparedIdRef.current && receipt.id !== preparedIdRef.current) throw new Error("A preparação não corresponde ao arquivo desta tentativa.");
      preparedIdRef.current = receipt.id;
      phase = "upload";
      acceptConfirmed(await send(false), pending);
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
        const pending = z.object({ id: z.uuid(), persistence: z.literal("unconfirmed") }).safeParse(body);
        if (!pending.success || pending.data.id !== file.id) throw new Error("Não foi possível confirmar esta tentativa.");
        setMessage("O envio ainda não está confirmado. Consulte novamente ou retome com o mesmo arquivo. Resultado pendente impede o abandono.");
      } else {
        if (pendingRef.current?.key === file.uploadKey) clearPending();
        setMessage("Anexo recuperado e confirmado."); if (mountedRef.current) onChange?.();
      }
      setAttempt(value => value + 1);
    } catch (reason) { if (!deniedRead(reason)) setError(reason instanceof Error ? reason.message : "Não foi possível consultar a tentativa."); }
    finally { setBusy(false); }
  }
  async function abandon(file: Attachment) {
    setBusy(true); setError(""); setFileInvalid(false);
    try {
      const parsed = z.object({ id: z.uuid(), persistence: z.literal("abandoned") }).safeParse(await commandFor(file, "abandon"));
      if (!parsed.success) throw new Error("O abandono não pôde ser confirmado. Consulte ou repita a mesma ação antes de escolher outro arquivo.");
      const result = parsed.data;
      if (result.id !== file.id) throw new Error("A resposta não corresponde a esta tentativa.");
      if (pendingRef.current?.key === file.uploadKey) clearPending();
      if (resumeTarget?.id === file.id) setResumeTarget(null);
      setAbandonTarget(null); setAttempt(value => value + 1); setMessage("Tentativa abandonada. O histórico foi preservado; você pode preparar outro arquivo.");
    } catch (reason) { if (!deniedRead(reason)) setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o abandono."); }
    finally { setBusy(false); }
  }
  return <SettingsSection title="Anexos e ficha física" summary={`${files.length} arquivo(s) · foto e PDF vinculados à operação`}>
    <button ref={refreshRef} className={buttonClass} disabled={busy} onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Atualizar anexos</button>
    <p className="mt-2 text-xs text-(--muted)">Até dez arquivos ou reservas em andamento. Novos envios de até {attachmentMaxLabel}. Fotos e PDFs são convertidos para leitura segura; confira o arquivo disponível. A foto da ficha física continua como alternativa ao formulário.</p>
    {error ? <div id={fileErrorId}><Notice error>{error}</Notice></div> : null}
    {readError ? <Notice error>Não foi possível consultar a lista de anexos. {readError} Atualize esta seção.</Notice> : null}
    {message ? <Notice>{message}</Notice> : null}
    {loading ? <p className="mt-3 text-sm" role="status">Consultando anexos…</p> : null}
    <ul className="mt-4 space-y-3">{files.map(file => <li key={file.id} className="rounded border border-(--line) p-3 text-sm">
      {file.url ? <a href={file.url} target="_blank" rel="noopener" className="break-all font-semibold underline">{file.filename}</a> : <strong className="break-all">{file.filename}</strong>}
      <p className="mt-1 text-xs text-(--muted)">{Math.ceil(file.bytes / 1024)} KB · {file.state === "ready" ? "Validado" : file.state === "rejected" ? "Rejeitado" : file.pending ? "Resultado do envio pendente" : "Preparado; envio não confirmado"}</p>
      <details className="mt-2"><summary className="cursor-pointer text-xs">Origem e conversão do arquivo</summary>
        {file.sourceSha256 ? <><p>Original selecionado: {file.sourceMime} · {Math.ceil((file.sourceBytes ?? 0) / 1024)} KB. O original não é armazenado.</p><p className="break-all">SHA-256 do original: <code>{file.sourceSha256}</code></p><p>{file.transformation === "image-normalized-v1" ? "Imagem orientada, redimensionada e convertida para JPEG sem metadados." : "PDF com páginas passivas, sem anotações ou campos interativos."}</p></> : <p>A origem e a transformação deste envio histórico não foram registradas. O hash disponível corresponde ao arquivo armazenado.</p>}
        {file.sha256 ? <p className="break-all">SHA-256 do arquivo disponível: <code>{file.sha256}</code></p> : null}
      </details>
      {writable && file.state === "quarantine" && file.uploadKey && file.tracked ? <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void recover(file)}>Consultar e recuperar tentativa</button>
        {!frozen && file.sourceSha256 ? <button type="button" className={buttonClass} disabled={busy} onClick={() => { setResumeTarget(file); setMessage("Selecione o mesmo arquivo original. A impressão será conferida antes de retomar."); fileInputRef.current?.focus(); }}>Retomar com arquivo original</button> : null}
        {file.canAbandon ? <button type="button" className={buttonClass} disabled={busy} onClick={() => setAbandonTarget(file)}>Abandonar tentativa incompleta</button> : <p className="text-xs">O resultado ainda pode estar pendente. O abandono permanece indisponível.</p>}
      </div> : null}
      {abandonTarget?.id === file.id ? <div role="group" aria-label="Confirmar abandono da tentativa" className="mt-3 space-y-2"><p>Abandonar esta reserva incompleta libera a vaga. Arquivos confirmados e histórico serão preservados.</p><button type="button" className={buttonClass} disabled={busy} onClick={() => setAbandonTarget(null)}>Voltar sem abandonar</button><button type="button" className={buttonClass} disabled={busy} onClick={() => void abandon(file)}>Confirmar abandono desta tentativa</button></div> : null}
    </li>)}</ul>
    {!loading && !files.length && !readError ? <p className="mt-4 text-sm text-(--muted)">Nenhum anexo registrado.</p> : null}
    {writable ? <form className="mt-4 space-y-3" onSubmit={upload}>
      {unresolved && !frozen && !resumeTarget ? <p role="status">Consulte ou retome a tentativa em andamento antes de preparar outro anexo.</p> : null}
      <label className="block text-sm font-semibold">{resumeTarget ? "Arquivo original para retomar" : "Adicionar foto ou PDF"}<input ref={fileInputRef} className={inputClass} type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-invalid={fileInvalid} aria-describedby={fileInvalid ? fileErrorId : undefined} onChange={() => { setFileInvalid(false); setError(""); }} disabled={busy || Boolean(frozen) || newPreparationBlocked} required={!frozen} /></label>
      {frozen ? <p role="status">Arquivo desta tentativa: {frozen.file.name}. A escolha fica bloqueada até confirmar ou abandonar uma reserva sem envio pendente.</p> : null}
      <button className={primaryClass} aria-disabled={busy || newPreparationBlocked}>{busy ? "Validando e enviando…" : uncertain ? "Recuperar envio do anexo" : "Enviar anexo"}</button>
      {resumeTarget && !frozen ? <button type="button" className={buttonClass} disabled={busy} onClick={() => setResumeTarget(null)}>Voltar à preparação de novo arquivo</button> : null}
    </form> : null}
  </SettingsSection>;
}
