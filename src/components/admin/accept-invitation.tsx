"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PublicHeader } from "@/components/auth/access-frame";
import { NewPasswordField } from "@/components/auth/new-password-field";
import { DocumentOperationFailureDialog } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton, ActionLink, DefinitionGrid, FormField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { EmptyState } from "@/components/ui/primitives";
import { googleComingSoon, googleSignInEnabled } from "@/lib/auth/google";
import { api, ApiError } from "@/lib/client/api";
import { formatBrazilDate } from "@/lib/receipt";
import { roleLabel } from "@/lib/role-labels";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { invitationToken, parseInvitationRead, type InvitationPreview } from "@/lib/validation/invitation";
import { newPasswordSchema } from "@/lib/validation/password";
import { InvitationDecision } from "./invitation-decision";
import "./invitation-recipient.css";

const returnPath = "/convites/aceitar";
const invitationLogin = "/login?next=" + encodeURIComponent(returnPath);
type Read = ReturnType<typeof parseInvitationRead>;
type AccessFailure = { title: string; cause: unknown; operation: string; read?: boolean };
const unavailable = {
  invalid: { title: "Este link não contém um convite válido.", detail: "Solicite um novo link ao administrador da residência.", icon: "link" },
  expired: { title: "Este convite expirou", detail: "Peça um novo link ao administrador da residência. Os detalhes do convite não estão disponíveis.", icon: "clock" },
  revoked: { title: "Este convite ou vínculo foi revogado", detail: "Solicite um novo convite ao administrador da residência.", icon: "lock" },
  declined: { title: "Sua decisão foi registrada", detail: "Nenhum vínculo foi criado com este convite.", icon: "shield" },
} as const;

function InvitationSummary({ invite }: { invite: InvitationPreview }) {
  return <section aria-label="Resumo do vínculo convidado" className="hca-invited-summary">
    <div className="hca-invited-hero">
      <span className="hca-invited-icon"><Icon name="home" width={24} height={24} /></span>
      <div><h2>{invite.patientName}</h2><p>Convite enviado por {invite.inviterName || "uma pessoa responsável pela residência"}</p></div>
    </div>
    <section className="hca-invited-card" aria-labelledby="invited-access">
      <header><h2 id="invited-access">Seu acesso</h2></header>
      <div className="hca-invited-card-body">
        <DefinitionGrid items={[
          { label: "Conta", value: invite.recipientEmail }, { label: "Função", value: roleLabel(invite.role) },
          { label: "Validade", value: formatBrazilDate(invite.expiresAt ?? null) + " (America/Sao_Paulo)" },
        ]} />
        <p className="hca-invited-hint"><Icon name="info" />Aceitar cria seu vínculo com esta residência.</p>
        <details className="hca-invited-extra"><summary>Permissões específicas de estoque</summary><p>
          {invite.canManageStock ? "Gerenciar estoque" : "Sem gestão adicional de estoque"} · {invite.canCountStock ? "Realizar contagem" : "Sem contagem adicional"}.
          As regras da residência continuam aplicáveis.
        </p></details>
      </div>
    </section>
  </section>;
}

export function AcceptInvitation() {
  const [link, setLink] = useState<{ token: string | null; storageIssue: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState<(Read & { epoch: number }) | null>(null);
  const [failure, setFailure] = useState<AccessFailure | null>(null);
  const [busy, setBusy] = useState<"account" | "register" | "google" | null>(null);
  const [selectionStage, setSelectionStage] = useState<number | null>(null);
  const [residenceSelected, setResidenceSelected] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");
  const [registration, setRegistration] = useState("");
  const [switching, setSwitching] = useState(false);
  const [outcome, setOutcome] = useState<"accept" | "decline" | null>(null);
  const token = link?.token;
  const actorId = read?.actorId;
  const preview = read?.data;
  const scopeRef = useRef(0);
  const tokenRef = useRef<string | null>(null);
  const actorRef = useRef<string | null | undefined>(undefined);
  const switchButtonRef = useRef<HTMLButtonElement>(null);
  const waitingForLink = link === null || Boolean(token && !read && !failure);
  useOperationActivity(waitingForLink || Boolean(busy), {
    title: waitingForLink ? "Consultando o convite" : busy === "register" ? "Conferindo o cadastro" : "Preparando seu acesso",
  });
  useOperationActivity(selectionStage !== null, { title: "Abrindo a residência", stage: selectionStage ?? 0,
    steps: [{ label: "Conferindo vínculo", icon: "shield" }, { label: "Preparando seus acessos", icon: "home" }] });

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (actorRef.current !== undefined && actorRef.current !== next) {
        scopeRef.current++;
        setRead(null); setFailure(null); setOutcome(null); setSwitching(false); setRegistration(""); setNotice("");
        setBusy(null); setSelectionStage(null); setResidenceSelected(false);
        setAttempt(value => value + 1);
      }
      actorRef.current = next;
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const invalidate = () => { scopeRef.current += 1; };
    const receive = () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const explicit = fragment.has("token");
      const parsed = invitationToken.safeParse(fragment.get("token"));
      let selected = parsed.success ? parsed.data : null;
      let storageIssue = false;
      try {
        if (explicit) {
          if (selected) sessionStorage.setItem("hca:invitation", selected);
          else sessionStorage.removeItem("hca:invitation");
        } else {
          const saved = invitationToken.safeParse(sessionStorage.getItem("hca:invitation"));
          if (saved.success) selected = saved.data;
        }
      } catch { storageIssue = true; }
      if (explicit) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      invalidate();
      tokenRef.current = selected;
      setLink({ token: selected, storageIssue }); setRead(null); setFailure(null); setOutcome(null); setBusy(null); setSelectionStage(null);
      setRegistration(""); setNotice(""); setPasswordError(""); setSwitching(false); setResidenceSelected(false);
      setAttempt(value => value + 1);
    };
    const timer = window.setTimeout(receive, 0);
    window.addEventListener("hashchange", receive);
    window.addEventListener("popstate", receive);
    return () => {
      invalidate();
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", receive);
      window.removeEventListener("popstate", receive);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const epoch = ++scopeRef.current;
    void api<unknown>("/api/invitations/preview", { token }, controller.signal).then(raw => {
      if (controller.signal.aborted || epoch !== scopeRef.current) return;
      const result = parseInvitationRead(raw);
      if (["ready", "accepted"].includes(result.data.state) && actorRef.current !== undefined && actorRef.current !== result.actorId) {
        throw new Error("A conta mudou durante a consulta. Consulte o convite novamente.");
      }
      setRead({ ...result, epoch }); setFailure(null);
    }).catch(cause => {
      if (!controller.signal.aborted && epoch === scopeRef.current) {
        setRead(null);
        setFailure({ title: "Não foi possível consultar o convite", cause, operation: "Consultar convite", read: true });
      }
    });
    return () => controller.abort();
  }, [token, attempt]);

  async function switchAccount() {
    if (busy) return;
    setBusy("account"); setSwitching(false);
    try {
      const client = createSupabaseBrowserClient();
      if (!client || (await client.auth.signOut({ scope: "local" })).error) throw new Error("Não foi possível sair desta conta. Consulte suas sessões e tente novamente.");
      window.location.assign(invitationLogin);
    } catch (cause) {
      setFailure({ title: "Não foi possível trocar a conta", cause, operation: "Trocar conta do convite" });
      setBusy(null);
    }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    const form = new FormData(event.currentTarget);
    const parsed = newPasswordSchema.safeParse(form.get("password"));
    if (!parsed.success) { setPasswordError(parsed.error.issues[0].message); return; }
    setPasswordError(""); setBusy("register");
    const epoch = scopeRef.current;
    try {
      const result = await api<{ notice: string }>("/api/invitations/register", { token, email: form.get("email"), password: parsed.data, fullName: form.get("fullName") });
      if (epoch === scopeRef.current) setRegistration(result.notice);
    } catch (cause) {
      if (epoch === scopeRef.current) setFailure({ title: "Não foi possível concluir o cadastro", cause, operation: "Cadastrar conta convidada" });
    } finally { if (epoch === scopeRef.current) setBusy(null); }
  }

  async function google() {
    if (busy) return;
    if (!googleSignInEnabled) { setNotice(googleComingSoon); return; }
    setNotice(""); setBusy("google");
    const epoch = scopeRef.current;
    try {
      const client = createSupabaseBrowserClient();
      if (!client) throw new Error("Serviço de acesso indisponível.");
      const result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent("/acesso/continuar?next=" + encodeURIComponent(returnPath)) } });
      if (result.error) throw new Error("Não foi possível iniciar o acesso com Google. Use e-mail e senha ou tente novamente.");
    } catch (cause) {
      if (epoch === scopeRef.current) setFailure({ title: "Não foi possível entrar com Google", cause, operation: "Entrar com Google" });
    } finally { if (epoch === scopeRef.current) setBusy(null); }
  }

  async function selectResidence() {
    if (selectionStage !== null || !token || !actorId || !preview?.patientId) return;
    const epoch = scopeRef.current;
    setSelectionStage(0);
    try {
      const latest = parseInvitationRead(await api<unknown>("/api/invitations/preview", { token }));
      if (epoch !== scopeRef.current) return;
      if (latest.actorId !== actorId || latest.data.state !== "accepted" || latest.data.patientId !== preview.patientId) {
        setRead({ ...latest, epoch });
        throw new Error("O vínculo mudou. Consulte os seus acessos antes de entrar na residência.");
      }
      setSelectionStage(1);
      const selected = await api<{ data?: { mode: string; care_recipient_id: string } }>("/api/context", { careRecipientId: preview.patientId, expectedActor: actorId });
      if (epoch !== scopeRef.current) return;
      if (selected.data?.mode !== "patient" || selected.data.care_recipient_id !== preview.patientId) throw new Error("Não foi possível confirmar o contexto da residência.");
      setResidenceSelected(true);
    } catch (cause) {
      if (epoch === scopeRef.current) {
        const authorityChanged = cause instanceof ApiError && [401, 403, 409].includes(cause.status);
        if (authorityChanged) setRead(null);
        setFailure({ title: "Não foi possível abrir a residência", cause, operation: "Selecionar residência do convite", read: authorityChanged });
      }
    } finally { if (epoch === scopeRef.current) setSelectionStage(null); }
  }

  function enterResidence() {
    if (!preview?.patientId || read?.epoch !== scopeRef.current) return;
    try { if (sessionStorage.getItem("hca:invitation") === token) sessionStorage.removeItem("hca:invitation"); } catch { /* The selection is already confirmed in the server session. */ }
    window.location.assign("/?careRecipientId=" + encodeURIComponent(preview.patientId));
  }

  const state = preview?.state ?? (link && !token ? "invalid" : null);
  const unavailableState = state === "expired" || state === "invalid" || state === "revoked" || state === "declined" ? unavailable[state] : null;
  const pageTitle = state === "accepted" ? "Convite aceito" : state === "declined" ? "Convite recusado" : "Convite para participar";
  return <div className="hca-public-access hca-invitation-recipient">
    <PublicHeader />
    <main id="workspace-content" tabIndex={-1} className="hca-invited-main">
      <header className="hca-invited-heading"><p className="eyebrow">Home Care Assistant</p><h1>{pageTitle}</h1>
        {state === "ready" ? <p>Confira quem convidou e o acesso oferecido.</p> : null}
      </header>
      {link?.storageIssue ? <FeedbackBanner tone="warning">Não foi possível guardar o link nesta aba. Preserve o link original para continuar após entrar.</FeedbackBanner> : null}
      {state === "ready" && preview ? <InvitationSummary invite={preview} /> : null}
      {state === "accepted" && preview ? <>
        <FeedbackBanner tone="success" heading="Vínculo confirmado">Você já pode selecionar a residência para consultar seus acessos.</FeedbackBanner>
        <DefinitionGrid className="hca-invited-accepted" items={[{ label: "Residência", value: preview.patientName }, { label: "Função", value: roleLabel(preview.role) }]} />
        <ActionButton variant="primary" disabled={selectionStage !== null} onClick={() => void selectResidence()}><Icon name="home" />Selecionar residência</ActionButton>
      </> : null}
      {unavailableState ? <EmptyState title={unavailableState.title} icon={unavailableState.icon}>{unavailableState.detail}</EmptyState> : null}
      {state === "wrong_account" ? <section className="hca-invited-unavailable" aria-labelledby="invite-wrong-account">
        <span className="hca-invited-icon"><Icon name="user" width={25} height={25} /></span>
        <p className="eyebrow">Convite protegido</p><h2 id="invite-wrong-account">Este convite é para outra conta</h2>
        <p>Entre com a conta que recebeu o convite para consultar os detalhes e decidir.</p>
        <p className="hca-invited-hint"><Icon name="shield" />As informações permanecem protegidas.</p>
        <ActionButton ref={switchButtonRef} variant="primary" disabled={Boolean(busy)} onClick={() => setSwitching(true)}>Trocar conta</ActionButton>
      </section> : null}
      {state === "login_required" ? <section className="hca-invited-card" aria-labelledby="invited-login">
        <header><h2 id="invited-login">Entre com a conta convidada</h2></header>
        <div className="hca-invited-card-body">
          <p>Após entrar, você poderá conferir o convite e decidir se quer participar.</p>
          <ActionLink variant="primary" href={invitationLogin}><Icon name="user" />Entrar com minha conta</ActionLink>
          <details className="hca-invited-extra"><summary>Ainda não tenho conta</summary>
            <form className="hca-access-form" onSubmit={register}>
              <FormField label="Nome" required><TextInput name="fullName" autoComplete="name" minLength={2} maxLength={160} disabled={Boolean(busy)} /></FormField>
              <FormField label="E-mail do convite" required><TextInput name="email" type="email" autoComplete="email" disabled={Boolean(busy)} /></FormField>
              <NewPasswordField label="Senha pessoal" disabled={Boolean(busy)} />
              {passwordError ? <p role="alert" className="hca-field-error">{passwordError}</p> : null}
              <ActionButton type="submit" variant="primary" disabled={Boolean(busy)}>Criar minha conta</ActionButton>
              <ActionButton disabled={Boolean(busy)} onClick={() => void google()}>Continuar com Google</ActionButton>
              {notice ? <p role="status">{notice}</p> : null}
            </form>
          </details>
        </div>
      </section> : null}
      {token && actorId && read ? <InvitationDecision key={`${token}:${actorId}`} token={token} actorId={actorId} preview={read.data}
        isCurrent={() => scopeRef.current === read.epoch && tokenRef.current === token}
        onRead={(result, confirmed) => {
          if (scopeRef.current !== read.epoch || tokenRef.current !== token) return;
          if (["ready", "accepted"].includes(result.data.state) && actorRef.current !== undefined && actorRef.current !== result.actorId) return;
          setRead({ ...result, epoch: read.epoch });
          if (confirmed) setOutcome(confirmed);
        }} /> : null}
      {state && !["ready", "accepted", "wrong_account"].includes(state) ? <ActionLink className="hca-invited-login-link" variant="quiet" href="/login">Voltar ao login</ActionLink> : null}
      {failure?.read ? <ActionButton onClick={() => { setFailure(null); setAttempt(value => value + 1); }}><Icon name="refresh" />Consultar convite novamente</ActionButton> : null}
    </main>
    {switching ? <Dialog open title="Continuar com a conta convidada" headingIcon="user" finalFocus={switchButtonRef} onClose={() => setSwitching(false)}
      footer={<><ActionButton onClick={() => setSwitching(false)}>Voltar</ActionButton><ActionButton variant="primary" onClick={() => void switchAccount()}>Entrar com a conta convidada</ActionButton></>}>
      <p>A entrada preserva o convite. Após entrar, o sistema consulta novamente se a conta pode ver os detalhes.</p>
    </Dialog> : null}
    {outcome ? <Dialog open success title={outcome === "accept" ? "Convite aceito" : "Convite recusado"}
      subtitle={outcome === "accept" ? "Seu vínculo com a residência foi confirmado." : "Sua decisão foi registrada."}
      onClose={() => setOutcome(null)} footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>
      {outcome === "accept" && preview?.state === "accepted" ? <DefinitionGrid items={[{ label: "Residência", value: preview.patientName }]} /> : null}
    </Dialog> : null}
    {registration ? <Dialog open title="Confira seu e-mail" headingIcon="send" subtitle={registration} onClose={() => setRegistration("")}
      footer={<ActionButton variant="primary" onClick={() => setRegistration("")}>Concluir</ActionButton>}>{null}</Dialog> : null}
    {residenceSelected && preview?.state === "accepted" ? <Dialog open success title="Residência selecionada"
      subtitle="Você pode consultar as áreas permitidas no seu acesso principal." onClose={enterResidence}
      footer={<ActionButton variant="primary" onClick={enterResidence}>Concluir</ActionButton>}>
      <DefinitionGrid items={[{ label: "Residência", value: preview.patientName }, { label: "Seu vínculo", value: roleLabel(preview.role) }]} />
    </Dialog> : null}
    {failure?.title ? <DocumentOperationFailureDialog title={failure.title} outcome="rejected" description={failure.cause instanceof Error ? failure.cause.message : "Confira sua conexão ou procure apoio."}
      operation={failure.operation} cause={failure.cause} fallbackCode="CONVITE_INDISPONIVEL" attempts={0} closeLabel="Voltar"
      onClose={() => {
        if (!failure.read) setFailure(null);
        else setFailure({ ...failure, title: "" });
      }} /> : null}
  </div>;
}
