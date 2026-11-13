"use client";
import { roleLabel } from "@/lib/role-labels";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, buttonClass, inputClass, Notice, primaryClass } from "@/components/workspace";
import { NewPasswordField } from "@/components/auth/new-password-field";
import { newPasswordSchema } from "@/lib/validation/password";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatBrazilDate } from "@/lib/receipt";
import { AccessFrame } from "@/components/auth/access-frame";
import { DefinitionGrid } from "@/components/ui/controls";
import { parseInvitationRead, type InvitationPreview } from "@/lib/validation/invitation";
import { InvitationDecision } from "./invitation-decision";

type Preview = InvitationPreview;
const stateMessages: Partial<Record<Preview["state"], string>> = {
  login_required: "Convite encontrado. Entre com a conta convidada para consultar o paciente, a função e quem emitiu o convite antes de decidir.",
  wrong_account: "Esta conta não pode aceitar este convite. Troque para a conta do e-mail convidado e confirmado.",
  accepted: "Convite já aceito por sua conta. O vínculo está disponível.",
  declined: "Convite recusado. Nenhum vínculo foi concedido.",
  expired: "Este convite expirou. Solicite um novo link ao administrador do paciente.",
  revoked: "Este convite ou vínculo foi revogado. Solicite um novo convite ao administrador do paciente.",
  invalid: "Este link não contém um convite válido. Solicite um novo link ao administrador do paciente.",
};

export function AcceptInvitation() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actorId, setActorId] = useState<string | null>(null);
  const [previewScope, setPreviewScope] = useState(0);
  const [reading, setReading] = useState(false), [linkIssue, setLinkIssue] = useState("");
  const scopeRef = useRef(0), tokenRef = useRef<string | null>(null);
  const actorRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      // Session events invalidate presentation; the API/RPC authorize every act.
      if (actorRef.current !== undefined && actorRef.current !== next) {
        scopeRef.current++;
        setPreview(null); setActorId(null); setAccepted(false); setBusy(false);
        setAttempt(value => value + 1);
      }
      actorRef.current = next;
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const receive = () => {
      scopeRef.current++;
      const received = new URLSearchParams(window.location.hash.slice(1)).get("token");
      let selected = received;
      try {
        if (received) {
          sessionStorage.setItem("hca:invitation", received);
          window.history.replaceState(null, "", window.location.pathname);
        }
        selected ??= sessionStorage.getItem("hca:invitation");
        setLinkIssue("");
      } catch {
        setLinkIssue("Não foi possível guardar o link para retomada neste aparelho. Preserve o link original antes de continuar.");
      }
      tokenRef.current = selected;
      setToken(selected); setActorId(null); setBusy(false);
      setPreview(null); setAccepted(false); setError(""); setNotice("");
      setAttempt(value => value + 1); setReady(true);
    };
    const timer = window.setTimeout(receive, 0);
    window.addEventListener("hashchange", receive);
    window.addEventListener("popstate", receive);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", receive); window.removeEventListener("popstate", receive); };
  }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const epoch = ++scopeRef.current;
    queueMicrotask(() => { if (!controller.signal.aborted) setReading(true); });
    api<unknown>("/api/invitations/preview", { token }, controller.signal)
      .then(raw => {
        if (controller.signal.aborted || epoch !== scopeRef.current) return;
        const result = parseInvitationRead(raw);
        if (["ready", "accepted"].includes(result.data.state) && actorRef.current !== undefined && actorRef.current !== result.actorId) throw new Error("A conta mudou durante a consulta. Consulte o convite novamente.");
        setPreview(result.data); setActorId(result.actorId); setPreviewScope(epoch); setError("");
      })
      .catch(reason => { if (!controller.signal.aborted && epoch === scopeRef.current) { setPreview(null); setActorId(null); setError(reason instanceof Error ? reason.message : "Não foi possível consultar o convite."); } })
      .finally(() => { if (!controller.signal.aborted && epoch === scopeRef.current) setReading(false); });
    return () => controller.abort();
  }, [token, attempt]);
  async function switchAccount() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const client = createSupabaseBrowserClient();
      if (!client) throw new Error("Serviço de acesso indisponível.");
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) throw new Error("Não foi possível sair desta conta.");
      window.location.assign("/login?next=%2Fconvites%2Faceitar");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível trocar a conta."); setBusy(false); }
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget), parsed = newPasswordSchema.safeParse(form.get("password"));
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true); setError("");
    const epoch = scopeRef.current;
    try {
      const result = await api<{ notice: string; }>("/api/invitations/register", { token, email: form.get("email"), password: parsed.data, fullName: form.get("fullName") });
      if (epoch === scopeRef.current) setNotice(result.notice);
    } catch (reason) { if (epoch === scopeRef.current) setError(reason instanceof Error ? reason.message : "Não foi possível concluir o cadastro."); }
    finally { if (epoch === scopeRef.current) setBusy(false); }
  }
  async function google() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const client = createSupabaseBrowserClient();
      if (!client) throw new Error("Serviço de acesso indisponível.");
      const result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent("/acesso/continuar?next=" + encodeURIComponent("/convites/aceitar")) } });
      if (result.error) throw new Error("Não foi possível iniciar o acesso com Google. Use e-mail e senha ou tente novamente.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível iniciar o acesso."); }
    finally { setBusy(false); }
  }
  const terminal = preview && ["expired", "revoked", "invalid", "declined"].includes(preview.state);
  return <AccessFrame active="invitation" title="Convite de acesso ao paciente"><div className="hca-access-form">
    {error ? <Notice error>{error}<button className={buttonClass} disabled={busy} onClick={() => { setError(""); setAttempt(value => value + 1); }}>Consultar convite novamente</button></Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {linkIssue ? <Notice error>{linkIssue}</Notice> : null}
    {accepted ? <><Notice>Convite aceito. Seu vínculo com o paciente está disponível.</Notice><Link tabIndex={0} href="/" className={`${primaryClass} inline-block`}>Abrir Home Care Assistant</Link></> : <>
      {!ready || reading || token && !preview && !error ? <Notice>Validando link…</Notice> : null}
      {ready && !token && !linkIssue ? <Notice error>{stateMessages.invalid}</Notice> : null}
      {preview?.state !== "ready" && preview ? <Notice error={Boolean(terminal) || preview.state === "wrong_account"}>{stateMessages[preview.state]}</Notice> : null}
      {preview?.patientName && actorId && ["ready", "accepted"].includes(preview.state) ? <section aria-label="Resumo do vínculo convidado"><DefinitionGrid items={[
        { label: "Paciente", value: preview.patientName },
        { label: "Função neste paciente", value: roleLabel(preview.role) },
        { label: "Conta convidada", value: preview.recipientEmail },
        { label: "Convite emitido por", value: preview.inviterName || "Nome não disponível" },
        { label: "Válido até", value: preview.expiresAt ? formatBrazilDate(preview.expiresAt) + " (America/Sao_Paulo)" : "Não disponível" },
        { label: "Permissões específicas propostas", value: <>{preview.canManageStock ? "Gerenciar estoque" : "Sem gestão adicional de estoque"} · {preview.canCountStock ? "Realizar contagem" : "Sem contagem adicional"}. As regras do paciente continuam aplicáveis.</> },
      ]} /></section> : null}
      {token && actorId && preview && ["ready", "accepted", "declined", "expired", "revoked", "invalid"].includes(preview.state) && !reading && !error ? <InvitationDecision key={`${token}:${actorId}`} token={token} actorId={actorId} preview={preview} onRead={(result, confirmed) => {
        if (scopeRef.current !== previewScope || tokenRef.current !== token) return;
        if (["ready", "accepted"].includes(result.data.state) && actorRef.current !== undefined && actorRef.current !== result.actorId) return;
        setPreview(result.data); setActorId(result.actorId);
        if (confirmed === "accept") setAccepted(true);
      }} /> : null}
      {preview?.state === "accepted" ? <Link tabIndex={0} href="/" className={`${primaryClass} inline-block`}>Abrir Home Care Assistant</Link> : null}
      {preview?.state === "wrong_account" ? <button className={primaryClass} disabled={busy} onClick={() => void switchAccount()}>Trocar conta</button> : null}
      {preview?.state === "login_required" ? <><Link tabIndex={0} className={`${buttonClass} inline-block`} href="/login?next=%2Fconvites%2Faceitar">Entrar com minha conta</Link><details><summary className="cursor-pointer font-semibold">Ainda não tenho conta</summary><form className="mt-4 space-y-4" onSubmit={register}>
        <label className="block">Nome<input className={inputClass} name="fullName" autoComplete="name" minLength={2} maxLength={160} required disabled={busy} /></label>
        <label className="block">E-mail do convite<input className={inputClass} name="email" type="email" autoComplete="email" required disabled={busy} /></label>
        <NewPasswordField label="Senha pessoal" className={inputClass} disabled={busy} />
        <button type="submit" className={primaryClass} disabled={busy}>{busy ? "Registrando…" : "Criar minha conta"}</button>
        <div className="hca-access-divider"><span />ou<span /></div><button type="button" className={buttonClass} disabled={busy} onClick={() => void google()}>Continuar com Google</button>
      </form></details></> : null}
    </>}
  </div></AccessFrame>;
}
