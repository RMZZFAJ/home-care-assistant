"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit, type DocumentOperationFailure } from "@/components/documents/document-operation-failure-dialog";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { usePwa } from "@/components/pwa/pwa-provider";
import { ActionButton, ActionLink, FormField, PasswordInput, TextInput } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { googleComingSoon, googleSignInEnabled } from "@/lib/auth/google";
import { contactReviewParam } from "@/lib/auth/contact";
import { api, ApiError, observeCommand } from "@/lib/client/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { emailContact, parseProfileRead, phoneContact, type ProfileRead } from "@/lib/validation/profile";
import { GoogleMark } from "./google-mark";
import "./contact-settings.css";

type Editor = "email" | "phone" | "verifyPhone" | "google";
type ContactAttempt = { kind: Exclude<Editor, "google">; value: string };
type Result = { title: string; description: string };
type Failure = DocumentOperationFailure & { title: string; attempt?: ContactAttempt };
const titles: Record<Editor, string> = {
  email: "Alterar e-mail", phone: "Alterar telefone", verifyPhone: "Confirmar telefone", google: "Vincular conta Google",
};
const buttons: Record<Editor, string> = {
  email: "Solicitar alteração", phone: "Enviar código", verifyPhone: "Confirmar número", google: "Continuar com Google",
};

function ContactRow({ icon, title, detail, status, pending = false }: {
  icon: IconName; title: string; detail: string; status?: string; pending?: boolean;
}) {
  return <div className="hca-contact-row">
    <span className={`hca-contact-glyph${pending ? " hca-contact-glyph--pending" : ""}`}><Icon name={icon} width={18} height={18} /></span>
    <div><strong>{title}</strong><small>{detail}</small></div>
    {status ? <span className="hca-status hca-status--success">{status}</span> : null}
  </div>;
}

function ContactHint({ children, icon = "info" }: { children: ReactNode; icon?: IconName }) {
  return <p className="hca-contact-hint"><Icon name={icon} width={17} height={17} /><span>{children}</span></p>;
}

export function ContactSettings({ profile, active, onChange, openOnEntry = false }: {
  profile: ProfileRead["data"]; active: boolean; onChange: () => void; openOnEntry?: boolean;
}) {
  const [open, setOpen] = useState(openOnEntry);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [requireEntry, setRequireEntry] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [value, setValue] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [smsUnavailable, setSmsUnavailable] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [activity, setActivity] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formId = useId(), confirmId = useId();
  const { blocked: runtimeBlocked } = usePwa();
  const { value: authority, error: accessError, selecting } = useWorkspaceState();
  const blocked = runtimeBlocked || !authority || Boolean(accessError) || selecting;
  const visible = active && open && !blocked;
  const busy = Boolean(activity);
  useOperationActivity(visible && busy, { title: activity, detail: "Aguarde a confirmação da solicitação." });
  const status = profile.contactStatus;
  const linked = profile.providers.includes("google");
  const smsNumber = pendingPhone || status?.pendingPhone || "";
  const reentry = "/login?next=" + encodeURIComponent("/perfil");
  const needsSignIn = requireEntry || (status?.repeatSignIn ?? !profile.providers.includes("email"));

  function closeEditor() {
    setEditor(null);
    setConfirming(false);
    setValue("");
    setFieldError("");
    setPasswordError("");
  }

  function closePanel() {
    if (busy) return;
    closeEditor();
    setFailure(null);
    setResult(null);
    setPendingPhone("");
    setRefreshed(false);
    setOpen(false);
    if (openOnEntry) {
      const url = new URL(window.location.href);
      url.searchParams.delete(contactReviewParam);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }

  function start(next: Editor) {
    if (blocked || busy) return;
    setEditor(next);
    setFieldError("");
    setValue(next === "phone" ? profile.phone ?? "" : "");
    if (!refreshed && status?.recent === false) setConfirming(true);
  }

  function startGoogle() {
    if (linked) {
      setResult({ title: "Conta Google vinculada", description: "Você já pode usar este método quando o acesso com Google estiver disponível." });
    } else if (!googleSignInEnabled) {
      setFailure({ outcome: "rejected", title: "Acesso Google indisponível", description: googleComingSoon });
    } else {
      start("google");
    }
  }

  function showSmsUnavailable(cause?: unknown) {
    closeEditor();
    setSmsUnavailable(true);
    setFailure({ outcome: "rejected", title: "Não foi possível enviar o SMS", description: "A confirmação por SMS está indisponível neste momento. Seu telefone atual continua válido.", cause });
  }

  async function startPhone() {
    if (blocked || busy) return;
    setFailure(null);
    setActivity("Conferindo disponibilidade do SMS");
    try {
      const availability = await api<{ available: boolean }>("/api/profile?contactAvailability=sms");
      if (availability.available !== true) {
        showSmsUnavailable();
        return;
      }
      setSmsUnavailable(false);
      start("phone");
    } catch (cause) {
      setFailure({ outcome: "rejected", title: "Não foi possível consultar o SMS", description: "Confira a conexão e volte para tentar consultar novamente.", cause });
    } finally {
      setActivity("");
    }
  }

  async function verifySession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || busy || needsSignIn) return;
    const form = event.currentTarget;
    const password = new FormData(form).get("currentPassword");
    form.reset();
    setActivity("Confirmando sessão");
    setPasswordError("");
    try {
      const response = await api<{ saved?: boolean }>("/api/profile", { action: "confirmSession", currentPassword: password });
      if (response?.saved !== true) throw new Error("Não foi possível confirmar a sessão.");
      setRefreshed(true);
      setConfirming(false);
      onChange();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "RECENT_SESSION_REQUIRED") setRequireEntry(true);
      else setPasswordError(cause instanceof Error ? cause.message : "Não foi possível confirmar a sessão.");
    } finally {
      setActivity("");
    }
  }

  function showResult(attempt: ContactAttempt, confirmedEmail = false) {
    setFailure(null);
    if (attempt.kind === "phone") {
      setPendingPhone(attempt.value);
      setSmsUnavailable(false);
      setEditor("verifyPhone");
      setValue("");
    } else {
      closeEditor();
      if (attempt.kind === "verifyPhone") setPendingPhone("");
      setResult(attempt.kind === "email"
        ? confirmedEmail
          ? { title: "E-mail confirmado", description: "O novo endereço já está ativo na sua conta." }
          : { title: "Confirmação solicitada", description: "Confira as instruções nos e-mails envolvidos. O endereço atual continua válido até você confirmar." }
        : { title: "Telefone confirmado", description: "O número confirmado foi associado à sua conta." });
    }
    onChange();
  }

  function commandFailure(cause: unknown, attempt?: ContactAttempt) {
    if (cause instanceof ApiError && cause.code === "RECENT_SESSION_REQUIRED") {
      setRefreshed(false);
      setConfirming(true);
      return;
    }
    if (attempt?.kind === "phone" && cause instanceof ApiError && cause.code === "NOT_CONFIGURED") {
      showSmsUnavailable(cause);
      return;
    }
    if (attempt?.kind === "verifyPhone" && cause instanceof ApiError && cause.code === "VALIDATION_ERROR") {
      setFieldError(cause.message);
      return;
    }
    const uncertain = attempt && (!(cause instanceof ApiError) || cause.status === 0 || cause.status === 408 || cause.code === "PERSISTENCE_UNCONFIRMED");
    setFailure({ outcome: uncertain ? "uncertain" : "rejected", title: "Não foi possível concluir",
      description: cause instanceof Error ? cause.message : "Confira os dados e retome a alteração.",
      cause, attempt });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || blocked || busy || confirming) return;
    setFieldError("");
    setAttempts(0);
    if (editor === "google") {
      if (!googleSignInEnabled) return;
      setActivity("Confirmando o acesso com Google");
      try {
        await api("/api/profile", { action: "prepareLink" });
        const client = createSupabaseBrowserClient();
        if (!client) throw new Error("O serviço de acesso está indisponível.");
        const redirect = new URL("/auth/callback", window.location.origin);
        redirect.searchParams.set("next", "/acesso/continuar?next=%2Fperfil");
        const result = await observeCommand(() => client.auth.linkIdentity({
          provider: "google", options: { redirectTo: redirect.toString(), skipBrowserRedirect: true },
        }));
        if (result.error || !result.data.url) throw new Error("O vínculo com Google está indisponível neste ambiente.");
        window.location.assign(result.data.url);
      } catch (cause) { commandFailure(cause); }
      finally { setActivity(""); }
      return;
    }
    const parsed = editor === "email" ? emailContact.safeParse(value)
      : editor === "phone" ? phoneContact.safeParse(value.replace(/[\s().-]/g, ""))
      : /^\d{6,8}$/.test(value) ? { success: true as const, data: value } : null;
    if (!parsed?.success) {
      setFieldError(editor === "email" ? "Informe um endereço de e-mail válido." : editor === "phone"
        ? "Use +, código do país, DDD e número." : "Informe o código recebido por SMS.");
      return;
    }
    const attempt = { kind: editor, value: editor === "verifyPhone" ? smsNumber : parsed.data };
    setActivity(buttons[editor] + "…");
    try {
      const response = await api<{ saved?: boolean; confirmedEmail?: boolean }>("/api/profile",
        editor === "email" ? { action: editor, email: attempt.value }
          : { action: editor, phone: attempt.value, ...(editor === "verifyPhone" ? { token: parsed.data } : {}) });
      if (response?.saved !== true) throw new Error("A resposta não confirmou o resultado da solicitação.");
      showResult(attempt, response.confirmedEmail === true);
    } catch (cause) { commandFailure(cause, attempt); }
    finally { setActivity(""); }
  }

  async function checkResult(attempt: ContactAttempt) {
    if (blocked || busy || attempts >= operationRecoveryLimit) return;
    setAttempts(current => current + 1);
    setActivity("Conferindo os contatos da conta");
    try {
      let data = parseProfileRead(await api("/api/profile")).data;
      if (attempt.kind === "verifyPhone" && data.phone !== attempt.value) {
        await api("/api/profile", { action: "confirmPhone", phone: attempt.value });
        data = parseProfileRead(await api("/api/profile")).data;
      }
      const confirmedEmail = data.email === attempt.value && data.contactStatus?.emailConfirmed === true;
      if (attempt.kind === "email" ? confirmedEmail || data.contactStatus?.pendingEmail === attempt.value
        : attempt.kind === "phone" ? data.contactStatus?.pendingPhone === attempt.value
        : data.phone === attempt.value) {
        showResult(attempt, confirmedEmail);
      } else {
        setFailure({ outcome: "uncertain", title: "Resultado ainda não confirmado", description: "A consulta ainda não confirmou o contato solicitado. Nenhuma mensagem foi enviada novamente.", attempt });
      }
    } catch (cause) {
      setFailure({ outcome: "uncertain", title: "Resultado ainda não confirmado", description: "Não foi possível confirmar o resultado desta tentativa.", cause, attempt });
    } finally {
      setActivity("");
    }
  }

  return <>
    <ActionButton ref={triggerRef} className="hca-account-setting" onClick={() => setOpen(true)}>
      <Icon name="user" /><span><strong>Contatos de acesso</strong><small>{profile.email}</small></span><Icon name="chevron" />
    </ActionButton>
    {open ? <Drawer open={visible} keepMounted title="Contatos de acesso" kicker="Minha conta" headingIcon="user" finalFocus={triggerRef}
      onClose={closePanel} closeDisabled={busy} keyboardScrollable popupClassName="hca-preference-sheet hca-contact-sheet"
      footer={<ActionButton variant="primary" onClick={closePanel} disabled={busy}>Concluir</ActionButton>}>
      <section className="hca-contact-section">
        <h3>E-mail</h3>
        <ContactRow title={profile.email} detail="Endereço atual" icon="user" status={status?.emailConfirmed ? "Confirmado" : undefined} />
        {status?.pendingEmail ? <div className="hca-contact-pending" role="status">
          <ContactRow title="Confirme seu novo e-mail" detail={status.pendingEmail} icon="clock" pending />
          <p>Conclua as confirmações recebidas. Até lá, o endereço atual continua válido.</p>
        </div> : null}
        <ActionButton compact onClick={() => start("email")}><Icon name="edit" />Alterar e-mail</ActionButton>
      </section>
      <section className="hca-contact-section">
        <h3>Telefone</h3>
        <ContactRow title={profile.phone ?? "Nenhum telefone confirmado"} detail={profile.phone ? "Número atual" : "Adicione um número para confirmar por SMS"} icon="phone" status={profile.phone ? "Confirmado" : undefined} />
        {smsUnavailable ? <p className="hca-contact-caption">SMS indisponível neste momento</p> : null}
        {smsNumber ? <div className="hca-contact-pending"><ContactRow title="Aguardando confirmação" detail={smsNumber} icon="clock" pending />
          <ActionButton compact onClick={() => start("verifyPhone")}>Confirmar telefone</ActionButton>
        </div> : null}
        <ActionButton compact disabled={busy} onClick={() => void startPhone()}><Icon name={smsUnavailable ? "refresh" : "edit"} />{smsUnavailable ? "Conferir disponibilidade" : "Alterar telefone"}</ActionButton>
      </section>
      <section className="hca-contact-section">
        <h3>Outras formas de entrar</h3>
        <ActionButton className="hca-account-setting hca-contact-google" onClick={startGoogle}>
          <GoogleMark /><span><strong>Conta Google</strong><small>{linked ? "Vinculada à sua conta" : googleSignInEnabled ? "Vincule sua conta para facilitar o acesso" : "Indisponível neste ambiente"}</small></span><Icon name="chevron" />
        </ActionButton>
      </section>
      <ContactHint icon="lock">Alterações nos contatos de acesso podem pedir uma confirmação recente da sessão.</ContactHint>
      {visible && editor && !confirming ? <Dialog open title={titles[editor]} kicker="Contatos de acesso" headingIcon={editor === "phone" || editor === "verifyPhone" ? "phone" : "user"}
        popupClassName="hca-account-editor" onClose={closeEditor} closeDisabled={busy} dismissOnOutsideClick={false} footer={<>
          <ActionButton disabled={busy} onClick={closeEditor}>Voltar</ActionButton>
          <ActionButton disabled={busy} form={formId} type="submit" variant="primary">{editor === "google" ? <GoogleMark /> : <Icon name={editor === "verifyPhone" ? "check" : "send"} />}{buttons[editor]}</ActionButton>
        </>}>
        <form id={formId} className="hca-contact-form" onSubmit={event => void submit(event)} noValidate>
          {editor === "email" ? <>
            <ContactHint>Você receberá instruções de confirmação. O endereço atual continua válido até a conclusão.</ContactHint>
            <FormField label="Novo e-mail" required error={fieldError}><TextInput type="email" autoComplete="email" maxLength={254} disabled={busy} value={value} onChange={event => setValue(event.target.value)} /></FormField>
          </> : editor === "phone" ? <>
            <FormField label="Telefone com código do país" required error={fieldError} helpText="Use +, código do país, DDD e número."><TextInput type="tel" autoComplete="tel" placeholder="+55 19 99999-0000" maxLength={30} disabled={busy} value={value} onChange={event => setValue(event.target.value)} /></FormField>
            <ContactHint>A confirmação por SMS é necessária para ativar o novo número.</ContactHint>
          </> : editor === "verifyPhone" ? <>
            <ContactRow icon="phone" title={smsNumber} detail="Número a confirmar por SMS" />
            <FormField label="Código de confirmação" required error={fieldError} helpText="Informe o código mais recente recebido neste número."><TextInput inputMode="numeric" autoComplete="one-time-code" maxLength={8} disabled={busy} value={value} onChange={event => setValue(event.target.value)} /></FormField>
          </> : <><div className="hca-contact-provider"><GoogleMark /><strong>Use sua conta Google</strong><p>Confirme sua identidade para vincular este método de acesso.</p></div><ContactHint icon="shield">Seus vínculos e permissões continuam os mesmos.</ContactHint></>}
        </form>
      </Dialog> : null}
      {visible && confirming ? <Dialog open title="Confirme que é você" kicker="Proteção da conta" headingIcon="lock" onClose={closeEditor}
        closeDisabled={busy} dismissOnOutsideClick={false} popupClassName="hca-account-editor" footer={<>
          <ActionButton disabled={busy} onClick={closeEditor}>Voltar</ActionButton>
          {needsSignIn ? <ActionLink variant="primary" href={reentry}>Entrar novamente</ActionLink>
            : <ActionButton disabled={busy} variant="primary" type="submit" form={confirmId}><Icon name="shield" />Confirmar sessão</ActionButton>}
        </>}>
        <form id={confirmId} className="hca-contact-form" onSubmit={event => void verifySession(event)}>
          <ContactHint icon="lock">{needsSignIn ? "Confirme sua identidade com o método de acesso e a proteção da sua conta." : "Confirme sua sessão com a senha atual para alterar este dado de acesso."}</ContactHint>
          {needsSignIn ? null : <FormField label="Senha atual" required error={passwordError}><PasswordInput name="currentPassword" disabled={busy} autoComplete="current-password" maxLength={256} revealLabel="senha atual" /></FormField>}
        </form>
      </Dialog> : null}
      {visible && result ? <Dialog open success title={result.title} subtitle={result.description} onClose={() => setResult(null)}
        popupClassName="hca-operation-result-dialog" footer={<ActionButton variant="primary" onClick={() => setResult(null)}>Concluir</ActionButton>}>{null}</Dialog> : null}
      {visible && failure ? <DocumentOperationFailureDialog {...failure} operation="Alterar contatos de acesso" fallbackCode="CONTA_CONTATOS"
        guidance="Confira os contatos atuais antes de iniciar outro pedido." attempts={attempts} closeLabel="Voltar"
        onClose={() => { setFailure(null); if (failure.outcome === "uncertain") closeEditor(); }}
        exhaustedMessage={failure.outcome === "uncertain" && attempts >= operationRecoveryLimit ? "Copie os detalhes e envie ao responsável pelo sistema." : undefined}
        action={failure.outcome === "uncertain" && failure.attempt && attempts < operationRecoveryLimit && !busy
          ? { label: "Conferir resultado", onClick: () => { if (failure.attempt) void checkResult(failure.attempt); } }
          : failure.title === "Não foi possível enviar o SMS" ? { label: "Conferir disponibilidade", onClick: () => void startPhone() } : undefined} /> : null}
    </Drawer> : null}
  </>;
}
