"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { SecurityHint, SecurityLead, SecurityResult, SecurityRow } from "@/components/profile/security-controls";
import { ActionButton, DefinitionGrid, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { ApiError, observeCommand } from "@/lib/client/api";
import { safeReturnPath } from "@/lib/safe-return-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Factors = { verified: string | null; pending: string | null; ids: string[]; aal2: boolean };
type Operation = "enroll" | "activate" | "verify" | "remove" | "discard";
type Verification = { intent: "verify" | "remove"; factor: string };
type Failure = { operation: Operation; factor?: string; before?: string | null; requiresCode?: boolean; cause: unknown };
type Result = { title: string; subtitle: string };

const titles: Record<Operation, string> = {
  enroll: "Preparando autenticador", activate: "Confirmando autenticador", verify: "Verificando código",
  remove: "Removendo autenticador", discard: "Encerrando configuração",
};

function browserAuth() {
  const client = createSupabaseBrowserClient();
  if (!client) throw new ApiError("O serviço de acesso está indisponível.", 503, "NOT_CONFIGURED");
  return client.auth;
}

async function readFactors(): Promise<Factors> {
  const auth = browserAuth();
  const [factors, assurance] = await Promise.all([auth.mfa.listFactors(), auth.mfa.getAuthenticatorAssuranceLevel()]);
  if (factors.error || assurance.error) throw new ApiError("Não foi possível consultar seu autenticador.", 503, "AUTH_UNAVAILABLE");
  return {
    verified: factors.data.totp[0]?.id ?? null,
    pending: factors.data.all.find(factor => factor.factor_type === "totp" && factor.status === "unverified")?.id ?? null,
    ids: factors.data.all.map(factor => factor.id),
    aal2: assurance.data.currentLevel === "aal2",
  };
}

function factorError(error: AuthError, operation: Operation): never {
  const verify = operation === "activate" || operation === "verify";
  if (verify && ["mfa_challenge_expired", "mfa_verification_failed", "mfa_verification_rejected", "otp_expired"].includes(error.code ?? ""))
    throw new ApiError("Confira o horário do autenticador e informe um código atual.", 400, "MFA_CODE_INVALID");
  if (error.status === 429) throw new ApiError("Aguarde antes de solicitar outro código.", 429, "RATE_LIMITED");
  if (!error.status || error.status >= 500)
    throw new ApiError("O serviço ainda não confirmou o resultado desta solicitação.", 0, "PERSISTENCE_UNCONFIRMED");
  throw new ApiError(verify ? "Não foi possível verificar este código. Consulte o estado do autenticador."
    : "Não foi possível concluir a configuração no serviço de acesso.", error.status, error.code);
}

function uncertain(cause: unknown) {
  return !(cause instanceof ApiError) || cause.status === 0 || cause.status === 408 || cause.code === "PERSISTENCE_UNCONFIRMED";
}

export function MfaSettings({ active, version, onChange }: { active: boolean; version: string; onChange: () => void }) {
  const params = useSearchParams();
  const required = params.get("mfa") === "required";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const [attempt, setAttempt] = useState(0);
  const readKey = JSON.stringify([version, attempt]);
  const [snapshot, setSnapshot] = useState<{ key: string; data: Factors | null }>();
  const [open, setOpen] = useState(false);
  const [enrollment, setEnrollment] = useState<{ factor: string; qr: string }>();
  const [prompt, setPrompt] = useState<Verification>();
  const [dismissed, setDismissed] = useState(false);
  const [removeConfirmed, setRemoveConfirmed] = useState<string>();
  const [activity, setActivity] = useState("");
  const [result, setResult] = useState<Result>();
  const [failure, setFailure] = useState<Failure>();
  const [retries, setRetries] = useState(0);
  const busy = Boolean(activity);
  const factors = snapshot?.data;
  const loading = snapshot?.key !== readKey;
  const visible = active && open;
  const verified = factors?.verified, pending = factors?.pending;
  const verification: Verification | undefined = prompt ??
    (required && !dismissed && verified && !factors?.aal2 ? { intent: "verify", factor: verified } : undefined);
  useOperationActivity(active && busy, { title: activity, detail: "Aguarde a confirmação do serviço de acesso." });

  useEffect(() => {
    if (!active) return;
    let current = true;
    void readFactors().then(
      data => { if (current) setSnapshot({ key: readKey, data }); },
      () => { if (current) setSnapshot({ key: readKey, data: null }); },
    );
    return () => { current = false; };
  }, [active, readKey]);

  function closePrompt() {
    setPrompt(undefined);
    setDismissed(true);
    setRemoveConfirmed(undefined);
  }

  function closePanel() {
    if (busy) return;
    setOpen(false);
    setEnrollment(undefined);
    setFailure(undefined);
    setResult(undefined);
    closePrompt();
  }

  function completeLogin() {
    const url = new URL(window.location.href);
    if (url.pathname !== "/perfil" || url.searchParams.get("mfa") !== "required" || !url.searchParams.has("next")) return false;
    const target = safeReturnPath(url.searchParams.get("next"), url.origin);
    window.location.assign("/acesso/continuar?next=" + encodeURIComponent(target));
    return true;
  }

  function refresh() {
    setAttempt(value => value + 1);
    onChange();
  }

  async function enroll() {
    if (!active || busy || loading || !factors || factors.pending || factors.verified) return;
    setActivity(titles.enroll);
    setRetries(0);
    try {
      const data = await observeCommand(async () => {
        const reply = await browserAuth().mfa.enroll({ factorType: "totp", friendlyName: "Home Care Assistant" });
        if (reply.error) factorError(reply.error, "enroll");
        return reply.data;
      });
      setEnrollment({ factor: data.id, qr: data.totp.qr_code });
      setSnapshot({ key: readKey, data: { ...factors, pending: data.id, ids: [...factors.ids, data.id] } });
    } catch (cause) { setFailure({ operation: "enroll", cause, before: factors.pending }); }
    finally { setActivity(""); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const editor = event.currentTarget;
    const code = new FormData(editor).get("code");
    const factor = verification?.factor ?? enrollment?.factor;
    if (!active || busy || !factors || !factor || !factors.ids.includes(factor) || typeof code !== "string" || !/^\d{6}$/.test(code)) return;
    editor.reset();
    const operation = verification ? "verify" : "activate";
    setActivity(titles[operation]);
    setRetries(0);
    try {
      await observeCommand(async () => {
        const reply = await browserAuth().mfa.challengeAndVerify({ factorId: factor, code });
        if (reply.error) factorError(reply.error, operation);
      });
      setSnapshot({ key: readKey, data: { ...factors, verified: factor, pending: factors.pending === factor ? null : factors.pending, aal2: true } });
      setEnrollment(undefined);
      closePrompt();
      refresh();
      if (verification?.intent === "remove") setRemoveConfirmed(factor);
      else if (!completeLogin()) setResult(operation === "activate"
        ? { title: "Proteção adicional ativada", subtitle: "O autenticador foi confirmado. Ele será solicitado quando o acesso exigir a segunda etapa." }
        : { title: "Sessão verificada", subtitle: "A confirmação adicional foi concluída." });
    } catch (cause) {
      setFailure({ operation, factor, cause, requiresCode: verification?.intent === "remove" || factors.aal2 });
    }
    finally { setActivity(""); }
  }

  async function remove(operation: "remove" | "discard", factor: string) {
    if (!active || busy || !factors?.ids.includes(factor) || (operation === "remove" && removeConfirmed !== factor)) return;
    setRemoveConfirmed(undefined);
    setActivity(titles[operation]);
    setRetries(0);
    try {
      await observeCommand(async () => {
        const auth = browserAuth();
        const reply = await auth.mfa.unenroll({ factorId: factor });
        if (reply.error) factorError(reply.error, operation);
        if (operation === "remove") await auth.refreshSession();
      });
      setEnrollment(undefined);
      setSnapshot({ key: readKey, data: {
        verified: factors.verified === factor ? null : factors.verified,
        pending: factors.pending === factor ? null : factors.pending,
        ids: factors.ids.filter(id => id !== factor),
        aal2: operation === "discard" && factors.aal2,
      } });
      refresh();
      if (operation === "remove") setResult({ title: "Autenticador removido", subtitle: "O método foi removido após a confirmação da sua sessão." });
    } catch (cause) { setFailure({ operation, factor, cause }); }
    finally { setActivity(""); }
  }

  async function checkFailure() {
    if (!active || !failure || busy || retries >= operationRecoveryLimit) return;
    setRetries(value => value + 1);
    setActivity("Conferindo o autenticador");
    try {
      const data = await readFactors();
      setSnapshot({ key: readKey, data });
      const { operation, factor, before } = failure;
      if (operation === "enroll" && data.pending && data.pending !== before) setFailure(undefined);
      else if (operation === "activate" && data.verified === factor) {
        setEnrollment(undefined);
        setFailure(undefined);
        refresh();
        if (data.aal2) setResult({ title: "Proteção adicional ativada", subtitle: "O autenticador foi confirmado." });
      } else if (operation === "verify" && data.aal2 && !failure.requiresCode) {
        setFailure(undefined);
        setPrompt(undefined);
        setDismissed(true);
        refresh();
        if (!completeLogin()) setResult({ title: "Sessão verificada", subtitle: "A confirmação adicional foi concluída." });
      } else if ((operation === "remove" || operation === "discard") && factor && !data.ids.includes(factor)) {
        setEnrollment(undefined);
        setFailure(undefined);
        refresh();
        if (operation === "remove") setResult({ title: "Autenticador removido", subtitle: "A consulta confirmou a remoção deste método." });
      } else throw new Error("A consulta ainda não confirmou esta solicitação.");
    } catch (cause) { setFailure({ ...failure, cause }); }
    finally { setActivity(""); }
  }

  function codeForm() {
    return <form className="hca-security-form" id={formId} onSubmit={event => void verify(event)}>
      <FormField label="Código de 6 dígitos" required><TextInput name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} disabled={busy} /></FormField>
    </form>;
  }

  const invalidCode = failure?.cause instanceof ApiError && failure.cause.code === "MFA_CODE_INVALID";
  return <>
    <SecurityRow ref={triggerRef} title="Aplicativo autenticador" icon="shield"
      subtitle={loading && !snapshot ? "Consultando configuração" : !factors ? "Consulta não concluída"
        : factors.verified ? factors.aal2 ? "Verificação em duas etapas configurada" : "Esta sessão precisa de verificação"
          : factors.pending ? "Configuração aguardando confirmação" : "Adicione uma etapa de confirmação ao acesso"}
      badge={factors ? <span className={`hca-status hca-status--${factors.verified ? "success" : "neutral"}`}>{factors.verified ? "Ativo" : "Configurar"}</span> : null}
      onClick={() => setOpen(true)} />
    {visible ? <Drawer open title="Aplicativo autenticador" kicker="Segurança" headingIcon="shield" popupClassName="hca-preference-sheet hca-security-sheet"
      keyboardScrollable finalFocus={triggerRef} onClose={closePanel} closeDisabled={busy} footer={<>
        <ActionButton disabled={busy} onClick={closePanel}>Voltar</ActionButton>
        {!factors ? <ActionButton disabled={loading} onClick={() => setAttempt(value => value + 1)}><Icon name="refresh" />Consultar novamente</ActionButton>
          : verified ? <>
            {factors.aal2 ? null : <ActionButton disabled={busy} onClick={() => setPrompt({ intent: "verify", factor: verified })}>Verificar esta sessão</ActionButton>}
            <ActionButton variant="danger" disabled={busy || loading} onClick={() => setPrompt({ intent: "remove", factor: verified })}>Remover método</ActionButton>
          </> : enrollment ? <ActionButton disabled={busy} type="submit" form={formId} variant="primary"><Icon name="check" />Ativar proteção</ActionButton>
            : pending ? <ActionButton variant="danger" disabled={busy} onClick={() => void remove("discard", pending)}>Descartar configuração</ActionButton>
              : <ActionButton variant="primary" disabled={busy || loading} onClick={() => void enroll()}><Icon name="shield" />Configurar autenticador</ActionButton>}
      </>}>
      {!factors ? <SecurityLead title={loading ? "Consultando autenticador" : "Consulta não concluída"}
        subtitle={loading ? "Aguarde a consulta da configuração atual." : "Não foi possível carregar a verificação em duas etapas."} />
        : factors.verified ? <>
          <SecurityLead title="Proteção adicional ativa" subtitle="Tenha seu autenticador por perto quando o sistema solicitar um código." active />
          <DefinitionGrid items={[{ label: "Método", value: "Código temporário" }, { label: "Situação", value: "Confirmado" },
            { label: "Esta sessão", value: factors.aal2 ? "Verificada em duas etapas" : "Verificação adicional necessária" }]} />
          <SecurityHint>A remoção do método exige o código atual do seu autenticador.</SecurityHint>
        </> : enrollment ? <>
          <div className="hca-security-factor-step"><span>1</span><div><h3>Adicione sua conta</h3><p>No aplicativo autenticador, escolha adicionar e leia este código.</p></div></div>
          <div className="hca-security-qr">
            <Image unoptimized width={160} height={160} priority
              src={enrollment.qr.startsWith("data:") ? enrollment.qr : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(enrollment.qr)}
              alt="QR privado para cadastrar seu autenticador" />
            <small>Home Care Assistant</small>
          </div>
          <div className="hca-security-factor-step"><span>2</span><div><h3>Confirme o código</h3><p>Digite o código que aparece no autenticador.</p></div></div>
          {codeForm()}
          <SecurityHint>A proteção só fica ativa depois da confirmação.</SecurityHint>
          <ActionButton disabled={busy} onClick={() => void remove("discard", enrollment.factor)}>Cancelar configuração</ActionButton>
        </> : factors.pending ? <SecurityLead title="Configuração não concluída" subtitle="Descarte a configuração pendente para preparar outro código de cadastro." />
          : <>
            <SecurityLead title="Mais proteção para entrar" subtitle="Use os códigos de um aplicativo autenticador como segunda etapa de verificação." />
            <SecurityHint icon="phone">Configure uma vez no aplicativo autenticador que você já usa.</SecurityHint>
            <SecurityHint>Quando o sistema solicitar, informe o código atual para continuar.</SecurityHint>
          </>}
    </Drawer> : null}
    {active && verification && factors?.ids.includes(verification.factor) ? <Dialog open title="Verificação adicional" kicker="Segurança da sessão" headingIcon="shield"
      onClose={closePrompt} closeDisabled={busy} popupClassName="hca-account-editor hca-security-dialog" dismissOnOutsideClick={false}
      footer={<><ActionButton disabled={busy} onClick={closePrompt}>Voltar</ActionButton>
        <ActionButton disabled={busy} type="submit" form={formId} variant="primary"><Icon name="check" />Verificar código</ActionButton></>}>
      <SecurityHint>Informe o código atual do autenticador para continuar esta ação protegida.</SecurityHint>
      {codeForm()}
    </Dialog> : null}
    {active && removeConfirmed && factors?.ids.includes(removeConfirmed) ? <Dialog open title="Remover o autenticador?" kicker="Segurança" headingIcon="shield"
      subtitle="Esta conta deixará de usar este método de verificação adicional. Você poderá configurá-lo novamente."
      onClose={closePrompt} footer={<><ActionButton onClick={closePrompt}>Voltar</ActionButton>
        <ActionButton variant="danger" onClick={() => void remove("remove", removeConfirmed)}>Remover método</ActionButton></>}>{null}</Dialog> : null}
    {active && result ? <SecurityResult {...result} onClose={() => setResult(undefined)} /> : null}
    {active && failure ? <DocumentOperationFailureDialog title={invalidCode ? "Código inválido ou expirado" : "Não foi possível confirmar a solicitação"}
      operation={titles[failure.operation]} fallbackCode="CONTA_AUTENTICADOR" attempts={retries}
      outcome={uncertain(failure.cause) ? "uncertain" : "rejected"} cause={failure.cause}
      description={failure.cause instanceof Error ? failure.cause.message : "Consulte a configuração do autenticador."}
      closeLabel={invalidCode ? "Digitar outro código" : "Voltar"} onClose={() => setFailure(undefined)}
      guidance={invalidCode || failure.requiresCode ? "Use o código que aparece agora no seu autenticador." : "Confira a configuração antes de solicitar outra ação."}
      action={uncertain(failure.cause) && retries < operationRecoveryLimit && !busy ? { label: "Conferir resultado", onClick: () => void checkFailure() } : undefined}
      exhaustedMessage={retries >= operationRecoveryLimit ? "Copie os detalhes e envie ao responsável pelo sistema." : undefined} /> : null}
  </>;
}
