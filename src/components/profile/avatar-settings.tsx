"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { z } from "zod";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { ProfileAvatar } from "@/components/ui/avatar";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { usePwa } from "@/components/pwa/pwa-provider";
import { api, ApiError, errorMessage, observeCommand } from "@/lib/client/api";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { avatarAttemptSchema, parseAvatarRead, type AvatarAttempt } from "@/lib/validation/avatar";

const resultSchema = z.object({ attempt: avatarAttemptSchema, cleanupPending: z.boolean() });
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 5_242_880;
const photoSize = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
type Selection = { file: File; preview: string; reference: number };
type Failure = { kind: "invalid" | "uncertain" | "conflict"; description: string; cause?: unknown };
type Feedback = Failure | { kind: "saved" | "recovered" | "abandoned"; cleanupPending?: boolean };
const photoTitles: Record<Feedback["kind"], string> = {
  invalid: "Imagem não aceita", uncertain: "Não foi possível confirmar a foto", conflict: "A foto da conta mudou",
  saved: "Foto atualizada", recovered: "Foto confirmada", abandoned: "Troca abandonada",
};
const imageHelp = "Escolha uma imagem JPEG, PNG ou WebP com até 5 MB. A foto atual da conta continua a mesma.";
const fingerprint = async (file: File) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map(n => n.toString(16).padStart(2, "0")).join("");
const readAttempt = async (key: string) => parseAvatarRead(await api("/api/profile/avatar?key=" + key));

export function AvatarSettings({ active, name, imageUrl, onChange }: { active: boolean; name: string; imageUrl: string | null; onChange: () => void }) {
  const { blocked: runtimeBlocked } = usePwa();
  const { value, error: accessError, selecting } = useWorkspaceState();
  const blocked = runtimeBlocked || Boolean(accessError) || !value || selecting;
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<"Atualizando minha foto" | "Conferindo a troca de foto" | "Abandonando a troca" | null>(null);
  const [attemptKey, setAttemptKey] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null), [retries, setRetries] = useState(0);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null), inputRef = useRef<HTMLInputElement>(null);
  const visible = open && active && !blocked;
  const busy = activity !== null;
  useOperationActivity(visible && busy, { title: activity ?? "", detail: "Aguarde a confirmação da troca na sua conta." });
  const read = useScopedRead(visible ? "/api/profile/avatar" : null, String(useLiveRevision()), parseAvatarRead);
  const data = read.data;
  const pending = data?.attempt?.state === "pending" ? data.attempt : null;
  const pendingKey = attemptKey ?? pending?.key;
  const preview = selection?.preview;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function clearSelection() {
    setSelection(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (busy) return;
    clearSelection();
    setOpen(false);
    setFeedback(null);
    setConfirmAbandon(false);
  }

  function settle(receipt: AvatarAttempt, recovered: boolean, cleanupPending?: boolean) {
    clearSelection();
    setAttemptKey(null);
    setFeedback(receipt.state === "abandoned" ? { kind: "abandoned", cleanupPending }
      : receipt.current ? { kind: recovered ? "recovered" : "saved", cleanupPending }
      : { kind: "conflict", description: "Esta troca chegou a ser concluída e uma foto posterior está em uso. Confira a foto vigente." });
    onChange();
    read.refresh();
  }

  function choose(file: File | undefined) {
    if (!file || !data || busy || read.loading || read.error) return;
    if (!allowedTypes.includes(file.type) || file.size > maxBytes || !file.size) {
      clearSelection();
      setFeedback({ kind: "invalid", description: imageHelp });
      return;
    }
    setFeedback(null);
    setSelection({ file, preview: URL.createObjectURL(file), reference: pending?.referenceRevision ?? data.referenceRevision });
  }

  async function send() {
    if (!selection || !data || busy || blocked || read.loading || read.error || (attemptKey && attemptKey !== pending?.key)) return;
    const key = pending?.key ?? crypto.randomUUID();
    setActivity("Atualizando minha foto");
    setFeedback(null);
    if (!pending) setRetries(0);
    try {
      if (pending && (selection.file.size !== pending.sourceSize || await fingerprint(selection.file) !== pending.sourceHash)) {
        clearSelection();
        setFeedback({ kind: "invalid", description: "Escolha o arquivo original desta troca. A foto vigente continua em uso." });
        return;
      }
      setAttemptKey(key);
      const form = new FormData();
      form.set("file", selection.file);
      const result = await observeCommand(async () => {
        const response = await fetch("/api/profile/avatar", {
          method: "POST", headers: { "idempotency-key": key, "x-avatar-reference": String(selection.reference) },
          body: form, signal: AbortSignal.timeout(30_000),
        });
        const body: unknown = await response.json();
        const code = body && typeof body === "object" && "code" in body ? String(body.code) : undefined;
        if (!response.ok) throw new ApiError(errorMessage(body, "Não foi possível concluir a troca da foto."), response.status, code);
        return resultSchema.parse(body);
      });
      if (result.attempt.key !== key || result.attempt.state !== "applied") throw new Error("Resposta de troca incompleta.");
      settle(result.attempt, Boolean(pending), result.cleanupPending);
    } catch (cause) {
      const current = await readAttempt(key).catch(() => null);
      if (current?.attempt?.state === "applied") {
        settle(current.attempt, true);
      } else if (cause instanceof ApiError && [400, 413, 415, 422].includes(cause.status) && !pending && !current?.attempt) {
        setAttemptKey(null);
        clearSelection();
        setFeedback({ kind: "invalid", description: imageHelp, cause });
      } else if (cause instanceof ApiError && cause.status === 409 && current &&
        (current.attempt?.state !== "pending" || current.referenceRevision !== current.attempt.referenceRevision)) {
        setAttemptKey(current.attempt?.state === "pending" ? key : null);
        clearSelection();
        setFeedback({ kind: "conflict", description: "Confira a foto atual e escolha novamente a imagem se quiser substituí-la.", cause });
      } else {
        setAttemptKey(key);
        setFeedback({ kind: "uncertain", description: "Confira o resultado desta mesma troca antes de escolher outra imagem.", cause });
      }
      read.refresh();
    } finally { setActivity(null); }
  }

  async function check(action: "recover" | "abandon") {
    if (!pendingKey || busy || blocked || (action === "recover" && retries >= operationRecoveryLimit)) return;
    setConfirmAbandon(false);
    setActivity(action === "recover" ? "Conferindo a troca de foto" : "Abandonando a troca");
    setFeedback(null);
    if (action === "recover") setRetries(value => value + 1);
    let dispatched = false;
    try {
      const current = await readAttempt(pendingKey);
      const receipt = current.attempt;
      if (receipt?.state === "applied" || receipt?.state === "abandoned") { settle(receipt, true); return; }
      if (!receipt) {
        setFeedback({ kind: "uncertain", description: "O registro desta troca ainda não pôde ser confirmado." });
        return;
      }
      if (action === "recover" && current.referenceRevision !== receipt.referenceRevision) {
        clearSelection();
        setFeedback({ kind: "conflict", description: "Uma foto posterior está em uso. Você pode abandonar esta troca antes de escolher outra imagem." });
        return;
      }
      if (action === "recover" && !receipt.prepared) {
        setAttemptKey(null);
        return;
      }
      dispatched = true;
      const result = resultSchema.parse(await api("/api/profile/avatar", { action, key: pendingKey }));
      if (result.attempt.key !== pendingKey || result.attempt.state === "pending") throw new Error("Resposta de troca incompleta.");
      settle(result.attempt, true, result.cleanupPending);
    } catch (cause) {
      const current = dispatched ? await readAttempt(pendingKey).catch(() => null) : null;
      if (current?.attempt?.state === "applied" || current?.attempt?.state === "abandoned") settle(current.attempt, true);
      else setFeedback({ kind: "uncertain", description: "Não foi possível confirmar o resultado da troca. A consulta usa a mesma tentativa.", cause });
    } finally { read.refresh(); setActivity(null); }
  }

  const canChoose = Boolean(data && !read.loading && !read.error && !busy && (!pendingKey || pending && !pending.verified && pendingKey === pending.key));
  const failure = feedback && "description" in feedback ? feedback : null;
  const result = feedback && !("description" in feedback) ? feedback : null;
  const pickerLabel = pending ? "Selecionar arquivo original" : selection ? "Escolher outra imagem" : "Escolher imagem";
  function openPicker() {
    setFeedback(null);
    inputRef.current?.click();
  }
  return <>
    <button type="button" className="hca-account-avatar-edit" aria-label="Alterar minha foto" ref={triggerRef} onClick={() => setOpen(true)}>
      <ProfileAvatar name={name} imageUrl={imageUrl} /><span><Icon name="edit" width={13} height={13} /></span>
    </button>
    {open ? <Drawer open={visible} title="Minha foto" kicker="Minha conta" headingIcon="user" keyboardScrollable
      popupClassName="hca-preference-sheet hca-photo-sheet" dismissOnOutsideClick={false} closeDisabled={busy} onClose={close} finalFocus={triggerRef}
      footer={<>
        <ActionButton disabled={busy} onClick={close}>Voltar</ActionButton>
        {selection && canChoose ? <ActionButton variant="primary" onClick={() => void send()}><Icon name="check" />{pending ? "Reenviar arquivo original" : "Usar esta foto"}</ActionButton>
          : pendingKey && retries < operationRecoveryLimit ? <ActionButton variant="primary" disabled={busy} onClick={() => void check("recover")}><Icon name="refresh" />Conferir resultado</ActionButton> : null}
      </>}>
      <div className="hca-photo-preview">
        <div>{preview || data?.avatar || imageUrl ? <Image src={preview || data?.avatar || imageUrl!} width={132} height={132} unoptimized
          alt={preview ? "Prévia da nova foto" : "Sua foto de perfil"} onError={preview ? () => { clearSelection(); setFeedback({ kind: "invalid", description: imageHelp }); } : undefined} /> : <Icon name="user" width={48} height={48} />}</div>
        <strong>{selection ? "Nova foto selecionada" : "Foto da sua conta"}</strong>
        <p>{selection ? `${selection.file.name} · ${photoSize.format(selection.file.size / 1024)} KB` : "Sua identificação nas áreas do sistema"}</p>
      </div>
      <input type="file" hidden ref={inputRef} aria-label="Nova foto" accept={allowedTypes.join(",")} disabled={!canChoose} onChange={event => choose(event.currentTarget.files?.[0])} />
      {busy || read.loading ? <p role="status">{busy ? "Conferindo a troca de foto…" : "Consultando a foto da conta…"}</p> : null}
      {read.error || data?.avatarUnavailable ? <div role="alert"><p>{read.error || "A leitura da foto atual está indisponível."}</p><ActionButton onClick={read.refresh}>Consultar foto novamente</ActionButton></div> : null}
      {pendingKey ? <div className="hca-photo-pending"><Icon name="clock" /><div><strong>Confirmação em consulta</strong><p>{pending && !pending.prepared ? "Selecione o mesmo arquivo original para concluir esta troca." : "Uma troca está aguardando a confirmação do registro."}</p></div></div> : null}
      {canChoose ? <div className="hca-photo-actions"><ActionButton onClick={openPicker}><Icon name="upload" />{pickerLabel}</ActionButton><small>JPEG, PNG ou WebP · até 5 MB</small></div> : null}
      {selection && canChoose ? <p className="hca-field-hint">Confira a imagem e confirme para alterar a foto da conta.</p> : null}
      {pending ? <ActionButton variant="quiet" disabled={busy} onClick={() => setConfirmAbandon(true)}>Abandonar esta troca de foto</ActionButton> : null}
      {visible && confirmAbandon ? <Dialog open title="Abandonar esta troca?" headingIcon="alert" onClose={() => setConfirmAbandon(false)} footer={<>
        <ActionButton onClick={() => setConfirmAbandon(false)}>Voltar</ActionButton><ActionButton variant="danger" onClick={() => void check("abandon")}>Abandonar troca</ActionButton>
      </>}><p>A foto atual da conta continua disponível.</p></Dialog> : null}
      {visible && failure ? failure.kind === "invalid" ? <Dialog open failure="rejected" title={photoTitles.invalid} subtitle={failure.description} popupClassName="hca-operation-result-dialog" onClose={() => setFeedback(null)} footer={<>
        <ActionButton onClick={() => setFeedback(null)}>Voltar</ActionButton><ActionButton variant="primary" disabled={!canChoose} onClick={openPicker}>Escolher outra imagem</ActionButton>
      </>}>{null}</Dialog> : <DocumentOperationFailureDialog outcome={failure.kind === "uncertain" ? "uncertain" : "rejected"} title={photoTitles[failure.kind]} description={failure.description} cause={failure.cause}
        operation="Trocar foto da conta" fallbackCode="PERFIL_FOTO" attempts={retries} attemptReference={pendingKey} closeLabel="Voltar à foto" onClose={() => setFeedback(null)}
        action={failure.kind === "uncertain" && pendingKey && retries < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void check("recover") } : undefined}
        exhaustedMessage={failure.kind === "uncertain" && retries >= operationRecoveryLimit ? "Copie os detalhes e envie ao responsável pelo sistema." : undefined} /> : null}
      {visible && result ? <Dialog open success title={photoTitles[result.kind]} popupClassName="hca-operation-result-dialog" onClose={() => setFeedback(null)}
        subtitle={result.kind === "abandoned" ? "A foto atual foi preservada." : result.kind === "recovered" ? "A associação da foto à sua conta foi confirmada." : "Sua nova foto foi associada à conta."}
        footer={<ActionButton variant="primary" onClick={() => setFeedback(null)}>Concluir</ActionButton>}>
        {result.cleanupPending ? <p>A limpeza de arquivos anteriores continua pendente.</p> : null}
      </Dialog> : null}
    </Drawer> : null}
  </>;
}
