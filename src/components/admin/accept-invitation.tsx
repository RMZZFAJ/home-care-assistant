"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api, buttonClass, inputClass, Notice, panelClass, primaryClass } from "@/components/workspace";
import { NewPasswordField } from "@/components/auth/new-password-field";
import { newPasswordSchema } from "@/lib/validation/password";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatBrazilDate } from "@/lib/receipt";
import { roles } from "./admin-fields";

type Preview = { state: "ready" | "login_required" | "wrong_account" | "accepted" | "declined" | "expired" | "revoked" | "invalid"; patientName?: string; recipientEmail?: string; role?: string; inviterName?: string; expiresAt?: string; canManageStock?: boolean; canCountStock?: boolean };
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
  useEffect(() => {
    const receive = () => {
      const received = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (received) {
        sessionStorage.setItem("hca:invitation", received);
        window.history.replaceState(null, "", window.location.pathname);
      }
      setToken(received ?? sessionStorage.getItem("hca:invitation"));
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
    api<{ data: Preview }>("/api/invitations/preview", { token }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setPreview(result.data); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível consultar o convite."); });
    return () => controller.abort();
  }, [token, attempt]);
  async function decide(decision: "accept" | "decline") {
    if (busy || preview?.state !== "ready") return;
    setBusy(true); setError("");
    try {
      await api("/api/invitations/accept", { token, decision });
      sessionStorage.removeItem("hca:invitation");
      if (decision === "accept") setAccepted(true);
      else setPreview({ state: "declined" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar a decisão.");
      setAttempt(value => value + 1);
    } finally { setBusy(false); }
  }
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
    try {
      const result = await api<{ notice: string }>("/api/invitations/register", { token, email: form.get("email"), password: parsed.data, fullName: form.get("fullName") });
      setNotice(result.notice);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir o cadastro."); }
    finally { setBusy(false); }
  }
  const terminal = preview && ["expired", "revoked", "invalid", "declined"].includes(preview.state);
  return <main id="workspace-content" tabIndex={-1} className="mx-auto max-w-xl p-4 sm:py-12"><section className={`${panelClass} space-y-5`}>
    <p className="text-xs font-bold uppercase tracking-wider text-(--brand)">Home Care Assistant</p>
    <h1 className="text-2xl font-semibold">Convite de acesso ao paciente</h1>
    {error ? <Notice error>{error}<button className={buttonClass} disabled={busy} onClick={() => { setError(""); setAttempt(value => value + 1); }}>Consultar convite novamente</button></Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {accepted ? <><Notice>Convite aceito. Seu vínculo com o paciente está disponível.</Notice><Link href="/" className={`${primaryClass} inline-block`}>Abrir Home Care Assistant</Link></> : <>
      {!ready || token && !preview && !error ? <Notice>Validando link…</Notice> : null}
      {ready && !token ? <Notice error>{stateMessages.invalid}</Notice> : null}
      {preview?.state !== "ready" && preview ? <Notice error={Boolean(terminal) || preview.state === "wrong_account"}>{stateMessages[preview.state]}</Notice> : null}
      {preview?.patientName ? <dl className="space-y-3 rounded-lg border border-(--line) p-4" aria-label="Resumo do vínculo convidado">
        <div><dt className="text-sm text-(--muted)">Paciente</dt><dd className="font-semibold">{preview.patientName}</dd></div>
        <div><dt className="text-sm text-(--muted)">Função neste paciente</dt><dd>{roles[preview.role as keyof typeof roles] ?? preview.role}</dd></div>
        <div><dt className="text-sm text-(--muted)">Conta convidada</dt><dd className="break-all">{preview.recipientEmail}</dd></div>
        <div><dt className="text-sm text-(--muted)">Convite emitido por</dt><dd>{preview.inviterName || "Nome não disponível"}</dd></div>
        <div><dt className="text-sm text-(--muted)">Válido até</dt><dd>{preview.expiresAt ? formatBrazilDate(preview.expiresAt) + " (America/Sao_Paulo)" : "Não disponível"}</dd></div>
        <div><dt className="text-sm text-(--muted)">Permissões específicas propostas</dt><dd>{preview.canManageStock ? "Gerenciar estoque" : "Sem gestão adicional de estoque"} · {preview.canCountStock ? "Realizar contagem" : "Sem contagem adicional"}. As regras do paciente continuam aplicáveis.</dd></div>
      </dl> : null}
      {preview?.state === "ready" ? <><p className="text-sm">Confira este vínculo. O aceite concede somente a função e o paciente apresentados; não altera sua identidade global.</p><div className="flex flex-wrap gap-3"><button className={primaryClass} disabled={busy} onClick={() => void decide("accept")}>{busy ? "Confirmando…" : "Aceitar convite com minha conta"}</button><button className={buttonClass} disabled={busy} onClick={() => void decide("decline")}>Recusar convite</button></div></> : null}
      {preview?.state === "accepted" ? <Link href="/" className={`${primaryClass} inline-block`}>Abrir Home Care Assistant</Link> : null}
      {preview?.state === "wrong_account" ? <button className={primaryClass} disabled={busy} onClick={() => void switchAccount()}>Trocar conta</button> : null}
      {preview?.state === "login_required" ? <><Link className={`${buttonClass} inline-block`} href="/login?next=%2Fconvites%2Faceitar">Entrar com minha conta</Link><details><summary className="cursor-pointer font-semibold">Ainda não tenho conta</summary><form className="mt-4 space-y-4" onSubmit={register}>
        <label className="block">Nome<input className={inputClass} name="fullName" autoComplete="name" minLength={2} maxLength={160} required disabled={busy} /></label>
        <label className="block">E-mail do convite<input className={inputClass} name="email" type="email" autoComplete="email" required disabled={busy} /></label>
        <NewPasswordField label="Senha pessoal" className={inputClass} disabled={busy} />
        <button className={primaryClass} disabled={busy}>{busy ? "Registrando…" : "Criar minha conta"}</button>
      </form></details></> : null}
    </>}
  </section></main>;
}
