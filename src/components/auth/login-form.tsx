"use client";

import { FormEvent, useState } from "react";
import { Button, Field, Input, MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useRouter, useSearchParams } from "next/navigation";
import { useClientReady } from "@/lib/use-client-ready";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/safe-return-path";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

export function LoginForm() {
  const router = useRouter();
  const ready = useClientReady();
  const searchParams = useSearchParams();
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
      setError("O Supabase não está configurado neste ambiente.");
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
      setError("O Supabase não está configurado neste ambiente.");
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
      setError("O Supabase não está configurado neste ambiente.");
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
    <form onSubmit={submit} className="hca-auth-form">
      {searchParams.get("error") ? <MessageBar intent="warning" role="alert"><MessageBarBody>Não foi possível concluir a autenticação. O link pode ter expirado. Entre novamente ou solicite outro link.</MessageBarBody></MessageBar> : null}
      <Field label={{ children: "E-mail", htmlFor: "login-email" }}><Input id="login-email" name="email" required disabled={!ready || loading} type="email" autoComplete="email" value={email} onChange={(_, data) => setEmail(data.value)} size="large" /></Field>
      <Field label={{ children: "Senha", htmlFor: "login-password" }}><Input id="login-password" name="password" required disabled={!ready || loading} type="password" autoComplete="current-password" value={password} onChange={(_, data) => setPassword(data.value)} size="large" /></Field>
      {error ? <MessageBar intent="error" role="alert"><MessageBarBody>{error}</MessageBarBody></MessageBar> : null}
      {notice ? <MessageBar intent="success" role="status"><MessageBarBody>{notice}</MessageBarBody></MessageBar> : null}
      <Button type="submit" appearance="primary" size="large" disabled={loading || !ready} icon={loading ? <Spinner size="tiny" /> : undefined}>{loading ? "Entrando..." : "Entrar"}</Button>
      <Button appearance="transparent" type="button" onClick={recoverPassword} disabled={loading || !ready}>Esqueci minha senha</Button>
      <div className="hca-auth-divider"><span />ou<span /></div>
      <Button type="button" size="large" onClick={signInWithGoogle} disabled={loading || !ready}>Continuar com Google</Button>
    </form>
  );
}
