"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ContactSettings } from "@/components/auth/contact-settings";
import { MfaSettings } from "@/components/auth/mfa-settings";
import { NewPasswordField } from "@/components/auth/new-password-field";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { usePwa } from "@/components/pwa/pwa-provider";
import { ActionButton, ActionLink, FormField, PasswordInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { api, ApiError } from "@/lib/client/api";
import { formatBrazilDate } from "@/lib/receipt";
import { newPasswordSchema } from "@/lib/validation/password";
import { parseProfileRead, type ProfileRead } from "@/lib/validation/profile";
import { SecurityHint, SecurityLead, SecurityResult, SecurityRow } from "./security-controls";

type Session = ProfileRead["sessions"][number];
type Confirmation = { current: string; others: string[] };

function uncertain(cause: unknown) {
  return !(cause instanceof ApiError) || cause.status === 0 || cause.status === 408 || cause.code === "PERSISTENCE_UNCONFIRMED";
}

function AccessConfirmation({ cause, onClose }: { cause: ApiError; onClose: () => void }) {
  const mfa = cause.code === "MFA_REQUIRED";
  return <Dialog open title={mfa ? "Verificação adicional" : "Confirme que é você"} kicker="Segurança da conta" headingIcon="shield"
    subtitle={mfa ? "Informe um código atual do autenticador para continuar com segurança." : "Entre novamente para confirmar sua sessão antes de concluir esta ação."}
    onClose={onClose} footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      <ActionLink variant="primary" href={mfa ? "/perfil?mfa=required" : "/login?next=" + encodeURIComponent("/perfil?profileTab=security")}>
        {mfa ? "Verificar sessão" : "Entrar novamente"}
      </ActionLink>
    </>}>{null}</Dialog>;
}

function accessConfirmation(cause: unknown): cause is ApiError {
  return cause instanceof ApiError && ["MFA_REQUIRED", "RECENT_SESSION_REQUIRED"].includes(cause.code ?? "");
}

function PasswordSettings({ enabled, allowed, onChange }: { enabled: boolean; allowed: boolean; onChange: () => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [validation, setValidation] = useState<{ field: "password" | "confirmation"; text: string }>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ cause: unknown }>();
  const [saved, setSaved] = useState(false);
  useOperationActivity(allowed && busy, { title: "Atualizando senha", detail: "Aguarde a confirmação da alteração da sua conta." });

  function close() {
    setOpen(false);
    setValidation(undefined);
    setFailure(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || busy) return;
    const fields = new FormData(event.currentTarget);
    const checked = newPasswordSchema.safeParse(fields.get("password"));
    if (!checked.success) { setValidation({ field: "password", text: checked.error.issues[0].message }); return; }
    if (checked.data !== fields.get("confirmPassword")) {
      setValidation({ field: "confirmation", text: "A confirmação deve ser igual à nova senha." });
      return;
    }
    setValidation(undefined);
    setFormKey(key => key + 1);
    setBusy(true);
    try {
      const result = await api<{ saved?: boolean }>("/api/profile", { action: "password", currentPassword: fields.get("currentPassword"), password: checked.data });
      if (result?.saved !== true) throw new Error("A resposta não confirmou a alteração.");
      close();
      setSaved(true);
      onChange();
    } catch (cause) {
      setFailure({ cause });
      if (uncertain(cause) || accessConfirmation(cause)) setOpen(false);
    } finally { setBusy(false); }
  }

  if (!enabled) return <p className="hca-security-caption py-2">Sua autenticação é gerenciada pelo provedor da conta.</p>;
  return <>
    <SecurityRow ref={triggerRef} title="Senha" subtitle="Atualize sua senha de acesso" icon="lock" onClick={() => setOpen(true)} />
    {allowed && open ? <Dialog open title="Alterar senha" kicker="Segurança" headingIcon="lock" finalFocus={triggerRef}
      popupClassName="hca-account-editor hca-security-dialog" closeDisabled={busy} dismissOnOutsideClick={false} onClose={close} footer={<>
        <ActionButton disabled={busy} onClick={close}>Cancelar</ActionButton>
        <ActionButton disabled={busy} type="submit" form={formId} variant="primary"><Icon name="check" />Atualizar senha</ActionButton>
      </>}>
      <form key={formKey} id={formId} className="hca-security-form" onSubmit={event => void submit(event)}>
        <FormField label="Senha atual" required><PasswordInput name="currentPassword" autoComplete="current-password" maxLength={256} revealLabel="senha atual" disabled={busy} /></FormField>
        <NewPasswordField disabled={busy} />
        {validation?.field === "password" ? <p role="alert">{validation.text}</p> : null}
        <FormField label="Repita a nova senha" required error={validation?.field === "confirmation" ? validation.text : undefined}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" maxLength={72} revealLabel="confirmação da senha" disabled={busy} />
        </FormField>
      </form>
    </Dialog> : null}
    {allowed && saved ? <SecurityResult title="Senha atualizada" subtitle="A nova senha foi confirmada para os próximos acessos por senha." finalFocus={triggerRef} onClose={() => setSaved(false)} /> : null}
    {allowed && failure ? accessConfirmation(failure.cause) ? <AccessConfirmation cause={failure.cause} onClose={close} />
      : <DocumentOperationFailureDialog title="Não foi possível confirmar a alteração da senha" operation="Alterar senha" fallbackCode="CONTA_SENHA" attempts={0}
        outcome={uncertain(failure.cause) ? "uncertain" : "rejected"} description={failure.cause instanceof Error ? failure.cause.message : "Confira a situação da sua conta."} cause={failure.cause}
        guidance={uncertain(failure.cause) ? "Confira a senha no próximo acesso antes de solicitar outra alteração." : "Revise os campos antes de tentar novamente."}
        onClose={() => setFailure(undefined)} closeLabel="Voltar" /> : null}
  </>;
}

function sessionDevice(agent: string | null) {
  const value = agent ?? "";
  const mobile = /Android|iPhone|iPad|Mobile/i.test(value);
  const browser = /Edg\//.test(value) ? "Edge" : /Firefox\//.test(value) ? "Firefox"
    : /(?:Chrome|CriOS)\//.test(value) ? "Chrome" : /Safari\//.test(value) ? "Safari" : null;
  const platform = /iPhone/.test(value) ? "iPhone" : /iPad/.test(value) ? "iPad" : /Android/.test(value) ? "Android" : "computador";
  return { mobile, title: browser ? browser + " · " + (mobile && platform === "computador" ? "celular" : platform) : "Dispositivo não identificado" };
}

function SessionRow({ session }: { session: Session }) {
  const device = sessionDevice(session.userAgent);
  return <div className="hca-security-session">
    <span className="hca-security-glyph"><Icon name={device.mobile ? "phone" : "monitor"} /></span>
    <div><strong>{device.title}</strong><small>Iniciada em {formatBrazilDate(session.createdAt)}</small>
      {session.current ? <span className="hca-status hca-status--success">Esta sessão</span> : null}
      {session.userAgent ? <details><summary>Identificação do navegador</summary><small>{session.userAgent}</small></details> : null}
    </div>
  </div>;
}

function SessionSettings({ sessions, allowed, onChange }: { sessions: Session[]; allowed: boolean; onChange: () => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [activity, setActivity] = useState("");
  const [failure, setFailure] = useState<{ cause: unknown; request: Confirmation }>();
  const [attempts, setAttempts] = useState(0);
  const [saved, setSaved] = useState(false);
  const current = sessions.find(session => session.current);
  const others = sessions.filter(session => !session.current).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const busy = Boolean(activity), visible = allowed && open;
  useOperationActivity(visible && busy, { title: activity, detail: "Aguarde a confirmação do serviço de acesso." });

  function succeed() {
    setConfirmation(undefined);
    setFailure(undefined);
    setSaved(true);
    onChange();
  }

  function close() {
    setOpen(false);
    setConfirmation(undefined);
    setFailure(undefined);
    setSaved(false);
  }

  async function requestSignOut(request: Confirmation) {
    if (!visible || busy) return;
    setConfirmation(undefined);
    setAttempts(0);
    setActivity("Encerrando outras sessões");
    try {
      const result = await api<{ saved?: boolean }>("/api/profile", { action: "signoutOthers" });
      if (result?.saved !== true) throw new Error("A resposta não confirmou o encerramento.");
      succeed();
    } catch (cause) { setFailure({ cause, request }); }
    finally { setActivity(""); }
  }

  async function checkSessions() {
    if (!failure || busy || attempts >= operationRecoveryLimit || !visible) return;
    const request = failure.request;
    setActivity("Conferindo sessões");
    setAttempts(count => count + 1);
    try {
      const latest = parseProfileRead(await api("/api/profile")).sessions;
      if (!latest.some(session => session.current && session.id === request.current) ||
        latest.some(session => request.others.includes(session.id)))
        throw new Error("A lista ainda não confirmou o encerramento das sessões consultadas.");
      succeed();
    } catch (cause) { setFailure({ cause, request }); }
    finally { setActivity(""); }
  }

  return <>
    <SecurityRow title="Onde minha conta está aberta" subtitle={!current ? "Confira as sessões identificadas" : others.length ? `${sessions.length} sessões identificadas` : "Somente esta sessão"}
      icon="monitor" ref={triggerRef} onClick={() => setOpen(true)} />
    {visible ? <Drawer open title="Minhas sessões" kicker="Segurança" headingIcon="monitor" popupClassName="hca-preference-sheet hca-security-sheet"
      keyboardScrollable finalFocus={triggerRef} closeDisabled={busy} onClose={close}
      footer={<><ActionButton disabled={busy} onClick={close}>Voltar</ActionButton>
        {current && others.length ? <ActionButton disabled={busy} variant="danger" onClick={() => setConfirmation({ current: current.id, others: others.map(session => session.id) })}><Icon name="lock" />Encerrar outras sessões</ActionButton> : null}
      </>}>
      <section className="hca-contact-section"><h3>Sessão atual</h3>
        {current ? <SessionRow session={current} /> : <p className="hca-security-caption pt-3">Não foi possível identificar esta sessão na lista.</p>}
      </section>
      {others.length ? <section className="hca-contact-section"><h3>Outras sessões</h3>
        {others.map(session => <SessionRow key={session.id} session={session} />)}
      </section> : <SecurityLead title={current ? "Somente esta sessão" : "Nenhuma outra sessão identificada"} subtitle="A lista mostra as sessões identificadas na última consulta." />}
      <SecurityHint icon="info">Sessões encerradas deixam de renovar o acesso. Credenciais já emitidas seguem o prazo de expiração do serviço.</SecurityHint>
      {confirmation ? <Dialog open title="Encerrar as outras sessões?" kicker="Segurança" headingIcon="lock"
        subtitle="Você continua conectado neste aparelho. Os outros acessos deixam de renovar a sessão."
        onClose={() => setConfirmation(undefined)} footer={<>
          <ActionButton onClick={() => setConfirmation(undefined)}>Voltar</ActionButton>
          <ActionButton variant="danger" onClick={() => void requestSignOut(confirmation)}>Encerrar outras sessões</ActionButton>
        </>}><SecurityHint icon="info">Credenciais já emitidas seguem seu prazo de expiração.</SecurityHint></Dialog> : null}
      {saved ? <SecurityResult title="Encerramento solicitado" subtitle="Esta sessão foi mantida. Os outros aparelhos precisarão entrar novamente quando o acesso vigente expirar." onClose={() => setSaved(false)} /> : null}
      {failure ? accessConfirmation(failure.cause) ? <AccessConfirmation cause={failure.cause} onClose={() => setFailure(undefined)} />
        : <DocumentOperationFailureDialog title="Não foi possível confirmar o encerramento" operation="Encerrar outras sessões" fallbackCode="CONTA_SESSOES" attempts={attempts}
          outcome={uncertain(failure.cause) ? "uncertain" : "rejected"} cause={failure.cause} closeLabel="Voltar"
          description={failure.cause instanceof Error ? failure.cause.message : "Consulte novamente as sessões da conta."}
          guidance="Confira a lista antes de solicitar outro encerramento."
          onClose={() => setFailure(undefined)}
          action={uncertain(failure.cause) && attempts < operationRecoveryLimit && !busy ? { label: "Conferir sessões", onClick: () => void checkSessions() } : undefined}
          exhaustedMessage={attempts >= operationRecoveryLimit ? "Copie os detalhes e envie ao responsável pelo sistema." : undefined} /> : null}
    </Drawer> : null}
  </>;
}

export function ProfileSecurity({ active, profile, sessions, failed, retry, version, onChange }: {
  active: boolean; profile: ProfileRead["data"] | null; sessions: Session[]; failed?: string;
  retry: () => void; version: string; onChange: () => void;
}) {
  const { blocked: runtimeBlocked } = usePwa();
  const { value, error, selecting } = useWorkspaceState();
  const allowed = active && Boolean(value) && !runtimeBlocked && !error && !selecting && !failed;
  return <div className="hca-security">
    <SecurityLead title="A proteção da sua conta" subtitle="Gerencie como você entra e confira os aparelhos conectados." />
    {failed ? <section className="hca-account-section" aria-label="Informações de segurança">
      <header><h2>Informações de segurança</h2></header>
      <div className="hca-account-links space-y-2"><p role="alert">Consulta não concluída. {failed}</p>
        <ActionButton onClick={retry}><Icon name="refresh" />Consultar novamente</ActionButton>
      </div>
    </section> : profile ? <>
      <section className="hca-account-section" aria-label="Acesso">
        <header><h2>Acesso</h2></header>
        <div className="hca-account-links" id="contatos-de-acesso">
          <PasswordSettings enabled={profile.providers.includes("email")} allowed={allowed} onChange={onChange} />
          <ContactSettings profile={profile} active={allowed} onChange={onChange} />
        </div>
      </section>
      <section className="hca-account-section" aria-label="Proteção adicional">
        <header><h2>Proteção adicional</h2></header>
        <div className="hca-account-links"><MfaSettings active={allowed} version={version} onChange={onChange} /></div>
      </section>
      <section className="hca-account-section" aria-label="Sessões">
        <header><h2>Sessões</h2></header>
        <div className="hca-account-links"><SessionSettings sessions={sessions} allowed={allowed} onChange={onChange} /></div>
      </section>
      <SecurityHint>Você pode encerrar os outros acessos e continuar conectado neste aparelho.</SecurityHint>
    </> : null}
  </div>;
}
