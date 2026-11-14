"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { FeedbackBanner } from '@/components/ui/feedback';
import { ActionButton, FormField, LoadingIndicator, PasswordInput, TextInput } from "@/components/ui/controls";

import { FormEvent, useEffect, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useClientReady } from "@/lib/use-client-ready";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/safe-return-path";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { AccessFrame } from "./access-frame";
import { completeEntry } from "@/lib/auth/complete-entry";

export function LoginForm() {
  const router = useRouter();
  const ready = useClientReady();
  const searchParams = useSearchParams();
  const recovery = searchParams.get("access") === "recover";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || notice) { feedbackRef.current?.focus({ preventScroll: true }); feedbackRef.current?.scrollIntoView({ block: "nearest" }); } }, [error, notice]);
  useOperationActivity(loading || !ready, { title: !ready ? "Preparando seu acesso" : recovery ? "Solicitando a recuperação" : "Confirmando seu acesso", detail: "Aguarde enquanto conferimos a solicitação." });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("O serviço de acesso está indisponível. Tente novamente em instantes.");
      setLoading(false);
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
        setLoading(false);
        return;
      }
      const { data: assurance } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        assurance?.nextLevel === "aal2" &&
        assurance.currentLevel !== "aal2"
      ) {
        router.replace(
          "/perfil?mfa=required&next=" +
          encodeURIComponent(
            safeReturnPath(searchParams.get("next"), window.location.origin),
          ),
        );
        router.refresh();
        return;
      }
      router.replace(
        await completeEntry(searchParams.get("next"), signedIn.user!.id),
      );
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
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
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("O serviço de acesso está indisponível. Tente novamente em instantes.");
      setLoading(false);
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
        setLoading(false);
      }
    } catch {
      setError("Não foi possível conectar ao provedor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccessFrame active={recovery ? "recovery" : "login"} title={recovery ? "Recuperar seu acesso" : "Entrar"} returnTo={searchParams.get("next")}>
      <div className="auth-feedback" ref={feedbackRef} tabIndex={-1}>
        {searchParams.get("error") ? <FeedbackBanner tone="warning" role="alert">Não foi possível concluir a autenticação. O link pode ter expirado. Entre novamente ou solicite outro link.</FeedbackBanner> : null}
        {error ? <FeedbackBanner tone="error" role="alert">{error}</FeedbackBanner> : null}
        {notice ? <FeedbackBanner tone="success" role="status">{notice}</FeedbackBanner> : null}
      </div><form onSubmit={recovery ? event => { event.preventDefault(); void recoverPassword(); } : submit} className="auth-form hca-access-form">
        <FormField label={"E-mail"} htmlFor={"login-email"}><TextInput id="login-email" name="email" required disabled={!ready || loading} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.currentTarget.value)} /></FormField>
        {!recovery ? <FormField label={"Senha"} htmlFor={"login-password"}><PasswordInput id="login-password" name="password" required disabled={!ready || loading} autoComplete="current-password" value={password} onChange={event => setPassword(event.currentTarget.value)} /></FormField> : null}
        {recovery ? <ActionButton type="submit" variant="primary" disabled={loading || !ready}>{loading ? "Solicitando…" : "Solicitar link de recuperação"}</ActionButton> : <>
          <div className="auth-form-links"><ActionButton variant="quiet" type="button" onClick={recoverPassword} disabled={loading || !ready}>Esqueci minha senha</ActionButton></div>
          <ActionButton type="submit" variant="primary" disabled={loading || !ready} >{loading ? <LoadingIndicator compact /> : undefined}{loading ? "Entrando..." : "Entrar"}</ActionButton>
          <div className="auth-or"><span>ou</span></div>
          <div className="google-row"><button className="google-button" type="button" aria-label="Continuar com Google" title="Continuar com Google" onClick={signInWithGoogle} disabled={loading || !ready}><svg width="21" height="21" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.2H24v8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.8 6-15.2Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.4a12.2 12.2 0 0 1 0-7.8v-5.4H5.7a20.3 20.3 0 0 0 0 18.6l6.9-5.4Z"/><path fill="#EA4335" d="M24 11.2c3 0 5.7 1 7.8 3l5.8-5.8A19.5 19.5 0 0 0 24 3a20.4 20.4 0 0 0-18.3 11.2l6.9 5.4c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg></button></div>
        </>}
      </form>
    </AccessFrame>
  );
}
