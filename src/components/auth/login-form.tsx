"use client";
import { FeedbackBanner } from '@/components/ui/feedback';
import { ActionButton, FormField, LoadingIndicator, TextInput } from "@/components/ui/controls";

import { FormEvent, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useClientReady } from "@/lib/use-client-ready";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/safe-return-path";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { AccessFrame } from "./access-frame";

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
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
        safeReturnPath(searchParams.get("next"), window.location.origin),
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
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(searchParams.get("next"), window.location.origin))}`,
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
    <form onSubmit={recovery ? event => { event.preventDefault(); void recoverPassword(); } : submit} className="hca-access-form">
      {searchParams.get("error") ? <FeedbackBanner  tone="warning" role="alert">Não foi possível concluir a autenticação. O link pode ter expirado. Entre novamente ou solicite outro link.</FeedbackBanner> : null}
      <FormField label={"E-mail"} htmlFor={"login-email"}><TextInput id="login-email" name="email" required disabled={!ready || loading} type="email" autoComplete="email" value={email} onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setEmail(controlValue); }} /></FormField>
      {!recovery ? <FormField label={"Senha"} htmlFor={"login-password"}><TextInput id="login-password" name="password" required disabled={!ready || loading} type="password" autoComplete="current-password" value={password} onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setPassword(controlValue); }} /></FormField> : null}
      {error ? <FeedbackBanner  tone="error" role="alert">{error}</FeedbackBanner> : null}
      {notice ? <FeedbackBanner  tone="success" role="status">{notice}</FeedbackBanner> : null}
      {recovery ? <ActionButton type="submit" variant="primary" disabled={loading || !ready}>{loading ? "Solicitando…" : "Solicitar link de recuperação"}</ActionButton> : <>
      <ActionButton type="submit" variant="primary" disabled={loading || !ready} >{loading ? <LoadingIndicator compact /> : undefined}{loading ? "Entrando..." : "Entrar"}</ActionButton>
      <ActionButton variant="quiet" type="button" onClick={recoverPassword} disabled={loading || !ready}>Esqueci minha senha</ActionButton>
      <div className="hca-access-divider"><span />ou<span /></div>
      <ActionButton type="button" onClick={signInWithGoogle} disabled={loading || !ready}>Continuar com Google</ActionButton>
      </>}
    </form>
    </AccessFrame>
  );
}
