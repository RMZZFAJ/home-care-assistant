"use client";
import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { z } from "zod";
import { api, ApiError, errorMessage, requireRuntimeCommandsAvailable } from "@/lib/client/api";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { avatarAttemptSchema, parseAvatarRead } from "@/lib/validation/avatar";
import { buttonClass, inputClass, Notice } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";

const resultSchema = z.object({ attempt: avatarAttemptSchema, cleanupPending: z.boolean() });
type Packet = { key: string; reference: number; hash: string; file: File };
const fingerprint = async (file: File) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map(n => n.toString(16).padStart(2, "0")).join("");

export function AvatarSettings() {
  const { value } = useWorkspaceState();
  return value?.userId ? <AvatarContent key={value.userId} /> : null;
}
function AvatarContent() {
  const [lookup, setLookup] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null), [packet, setPacket] = useState<Packet | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null), resultRef = useRef<HTMLDivElement>(null);
  const read = useScopedRead("/api/profile/avatar" + (lookup ? "?key=" + lookup : ""), String(useLiveRevision()), parseAvatarRead);
  const data = !read.loading && !read.error ? read.data : null;
  const pending = data?.attempt?.state === "pending" ? data.attempt : null;
  const frozen = Boolean(packet);
  function localError(value: string) {
    setInputError(value); requestAnimationFrame(() => inputRef.current?.focus());
  }
  async function reconcile(key: string, definitive = false) {
    try {
      const current = parseAvatarRead(await api("/api/profile/avatar?key=" + key));
      if (current.attempt?.state === "applied") {
        setPacket(null); setFile(null); if (inputRef.current) inputRef.current.value = "";
        setMessage(current.attempt.current ? "Foto atualizada e associação confirmada." : "Esta troca já havia sido concluída. Uma foto posterior está em uso.");
        window.dispatchEvent(new Event("hca:profile-updated"));
      } else if (current.attempt?.state === "abandoned" || (!current.attempt && definitive)) setPacket(null);
    } catch { /* A failed read cannot settle a pending command. */ }
    read.refresh();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !file || !data) return;
    if (file.size > 5_242_880) return localError("A foto deve ter até 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return localError("Escolha uma foto JPEG, PNG ou WebP.");
    setBusy(true); setError(""); setMessage(""); setInputError("");
    let selected: Packet | null = packet;
    try {
      const hash = selected?.hash ?? await fingerprint(file);
      if (pending && (hash !== pending.sourceHash || file.size !== pending.sourceSize)) {
        localError("Escolha o mesmo arquivo original desta troca ou abandone-a antes de escolher outra foto."); return;
      }
      selected ??= { key: pending?.key ?? crypto.randomUUID(), reference: pending?.referenceRevision ?? data.referenceRevision, hash, file };
      setPacket(selected); setLookup(selected.key);
      requireRuntimeCommandsAvailable();
      const form = new FormData(); form.set("file", selected.file);
      const response = await fetch("/api/profile/avatar", { method: "POST", headers: { "idempotency-key": selected.key, "x-avatar-reference": String(selected.reference) }, body: form });
      const body: unknown = await response.json();
      if (!response.ok) throw new ApiError(errorMessage(body, "Não foi possível concluir a troca da foto."), response.status);
      resultSchema.parse(body);
      await reconcile(selected.key);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível confirmar o resultado desta foto. Consulte a mesma troca antes de iniciar outra.");
      if (selected) await reconcile(selected.key, reason instanceof ApiError && [400, 409, 413, 415, 422].includes(reason.status));
    } finally { setBusy(false); }
  }
  async function command(action: "recover" | "abandon") {
    const key = packet?.key ?? pending?.key; if (!key || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = resultSchema.parse(await api("/api/profile/avatar", { action, key }));
      if (result.attempt.state === "abandoned") {
        setPacket(null); setFile(null); if (inputRef.current) inputRef.current.value = "";
        setMessage("Troca abandonada. A foto atual foi preservada."); read.refresh();
      } else await reconcile(key);
      if (result.cleanupPending) setMessage(value => value + " A limpeza de arquivos anteriores permanece pendente e pode ser repetida com segurança.");
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o resultado da foto.");
      await reconcile(key);
    } finally { setBusy(false); }
  }
  return <div className="space-y-4" role="region" aria-label="Troca da foto de perfil" aria-busy={busy || read.loading}>
    <button type="button" className={buttonClass} aria-disabled={busy || read.loading} onClick={() => { if (!busy && !read.loading) read.refresh(); }}>Atualizar consulta da foto</button>
    {read.loading ? <Notice>Consultando foto e trocas autorizadas…</Notice> : read.error ? <Notice error>{read.error}</Notice> : data?.avatarUnavailable ? <Notice error>Não foi possível preparar a leitura da foto atual. Atualize esta seção.</Notice> : data?.avatar ? <Image className="rounded-full object-cover" src={data.avatar} width={88} height={88} unoptimized alt="Sua foto de perfil" /> : <p>Nenhuma foto cadastrada.</p>}
    {error ? <Notice error>{error}</Notice> : null}
    <div ref={resultRef} tabIndex={-1} role="status">{message}</div>
    {pending ? <div className="rounded-xl border border-(--line) p-3">
      <h3 className="font-semibold">Troca de foto em andamento</h3>
      <p className="break-all">{pending.filename} · {pending.sourceSize} bytes</p>
      <p>{pending.verified ? "Arquivo conferido; associação ao perfil ainda precisa ser consultada." : pending.prepared ? "Envio preparado; o arquivo e sua associação precisam ser conferidos." : "Preparação registrada; selecione o arquivo original para continuar."}</p>
      <p>Abandonar retira somente esta troca. A foto atual é mantida.</p>
    </div> : packet ? <Notice>O resultado desta troca ainda é desconhecido. Preserve o arquivo e recupere o mesmo envio.</Notice> : null}
    <form className="space-y-3" onSubmit={event => void submit(event)}>
      <label className="block text-sm">Nova foto
        <input ref={inputRef} className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || frozen} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "avatar-file-error" : undefined} onChange={event => { setFile(event.currentTarget.files?.[0] ?? null); setInputError(""); }} />
      </label>
      {inputError ? <p id="avatar-file-error" role="alert">{inputError}</p> : null}
      <button className={buttonClass} aria-disabled={busy || !file || !data}>{pending || packet ? "Reenviar arquivo original" : "Salvar foto"}</button>
    </form>
    {pending || packet ? <div className="flex flex-wrap gap-3">
      <button type="button" className={buttonClass} aria-disabled={busy} onClick={() => void command("recover")}>Recuperar troca de foto</button>
      {pending ? <button type="button" className={buttonClass} aria-disabled={busy} onClick={() => void command("abandon")}>Abandonar esta troca de foto</button> : null}
    </div> : null}
  </div>;
}
