"use client";
import { GoogleMark } from "./google-mark";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { FeedbackBanner } from '@/components/ui/feedback';
import { ActionButton, FormField, LoadingIndicator, PasswordInput, TextInput } from "@/components/ui/controls";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useClientReady } from "@/lib/use-client-ready";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/safe-return-path";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { AccessFrame } from "./access-frame";
import { completeEntry, entrySteps } from "@/lib/auth/complete-entry";
import { googleComingSoon, googleSignInEnabled } from "@/lib/auth/google";

export function LoginForm() {
  const router = useRouter();
  const ready = useClientReady();
  const searchParams = useSearchParams();
  const recovery = searchParams.get("access") === "recover";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [navigating, navigateToWorkspace] = useTransition();
  const [stage, setStage] = useState<number | null>(null);
  const loading = submitting || navigating;
  const [notice, setNotice] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || notice) { feedbackRef.current?.focus({ preventScroll: true }); feedbackRef.current?.scrollIntoView({ block: "nearest" }); } }, [error, notice]);
  useOperationActivity(loading || !ready, stage !== null && !recovery
    ? { title: "Confirmando seu acesso", stage, steps: entrySteps, detail: "Aguarde a confirmação da operação." }
    : { title: !ready ? "Preparando seu acesso" : recovery ? "Solicitando a recuperação" : "Confirmando seu acesso", detail: "Aguarde enquanto conferimos a solicitação." });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStage(0);
    setSubmitting(true);
    setError("");
    setNotice("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("O serviço de acesso está indisponível. Tente novamente em instantes.");
      setSubmitting(false);
      return;
    }

    try {
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(
          isAuthRetryableFetchError(signInError) ||
            (signInError.status ?? 0) >= 500
            ? "Não foi possível conectar. Tente novamente."
            : signInError.status === 429
              ? "Muitas tentativas de acesso. Aguarde e tente novamente."
              : "E-mail ou senha inválidos.",
        );
        setSubmitting(false);
        return;
      }
      setStage(1);
      const { data: assurance } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        assurance?.nextLevel === "aal2" &&
        assurance.currentLevel !== "aal2"
      ) {
        navigateToWorkspace(() => {
          router.replace("/perfil?mfa=required&next=" + encodeURIComponent(
            safeReturnPath(searchParams.get("next"), window.location.origin),
          ));
          router.refresh();
        });
        return;
      }
      setStage(2);
      const destination = await completeEntry(searchParams.get("next"), signedIn.user!.id);
      navigateToWorkspace(() => {
        router.replace(destination);
        router.refresh();
      });
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function recoverPassword() {
    setError("");
    setNotice("");
    if (!email) {
      setError("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("O serviço de acesso está indisponível. Tente novamente em instantes.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: recoveryError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-senha`,
        });
      if (recoveryError) {
        setError(
          "Não foi possível iniciar a recuperação. Verifique o e-mail ou procure um administrador.",
        );
        return;
      }
      setNotice(
        "Se o e-mail estiver autorizado, você receberá instruções de recuperação.",
      );
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    if (!googleSignInEnabled) {
      setNotice(googleComingSoon);
      return;
    }
    setNotice("");
    setStage(null);
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("O serviço de acesso está indisponível. Tente novamente em instantes.");
      setSubmitting(false);
      return;
    }
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/acesso/continuar?next=" + encodeURIComponent(safeReturnPath(searchParams.get("next"), window.location.origin)))}`,
        },
      });
      if (oauthError) {
        setError(
          "Não foi possível iniciar o login com Google. Verifique se o provedor está habilitado.",
        );
        setSubmitting(false);
      }
    } catch {
      setError("Não foi possível conectar ao provedor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccessFrame active={recovery ? "recovery" : "login"} title={recovery ? "Recuperar seu acesso" : "Entrar"} returnTo={searchParams.get("next")}>
      <div className="auth-feedback" ref={feedbackRef} tabIndex={-1}>
        {searchParams.get("error") ? <FeedbackBanner tone="warning" role="alert">Não foi possível concluir a autenticação. O link pode ter expirado. Entre novamente ou solicite outro link.</FeedbackBanner> : null}
        {error ? <FeedbackBanner tone="error" role="alert">{error}</FeedbackBanner> : null}
        {notice ? <FeedbackBanner tone={recovery ? "success" : "info"} role="status">{notice}</FeedbackBanner> : null}
      </div><form onSubmit={recovery ? event => { event.preventDefault(); void recoverPassword(); } : submit} className="auth-form hca-access-form">
        <FormField label={"E-mail"} htmlFor={"login-email"}><TextInput id="login-email" name="email" required disabled={!ready || loading} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.currentTarget.value)} /></FormField>
        {!recovery ? <FormField label={"Senha"} htmlFor={"login-password"}><PasswordInput id="login-password" name="password" required disabled={!ready || loading} autoComplete="current-password" value={password} onChange={event => setPassword(event.currentTarget.value)} /></FormField> : null}
        {recovery ? <ActionButton type="submit" variant="primary" disabled={loading || !ready}>{loading ? "Solicitando…" : "Solicitar link de recuperação"}</ActionButton> : <>
          <div className="auth-form-links"><ActionButton variant="quiet" type="button" onClick={() => {
            setPassword(""); setError(""); setNotice("");
            const query = new URLSearchParams({ access: "recover" });
            const next = searchParams.get("next");
            if (next) query.set("next", next);
            router.push("/login?" + query);
          }} disabled={loading || !ready}>Esqueci minha senha</ActionButton></div>
          <ActionButton type="submit" variant="primary" disabled={loading || !ready} >{loading ? <LoadingIndicator compact /> : undefined}{loading ? "Entrando..." : "Entrar"}</ActionButton>
          <div className="auth-or"><span>ou</span></div>
          <div className="google-row"><button className="google-button" type="button" aria-label="Continuar com Google" title="Continuar com Google" onClick={signInWithGoogle} disabled={loading || !ready}><GoogleMark /></button></div>
        </>}
      </form>
    </AccessFrame>
  );
}
