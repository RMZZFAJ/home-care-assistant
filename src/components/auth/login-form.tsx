"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/safe-return-path";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

export function LoginForm() {
  const router = useRouter();
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(isAuthRetryableFetchError(signInError) || (signInError.status ?? 0) >= 500
        ? "Não foi possível conectar. Tente novamente."
        : signInError.status === 429
          ? "Muitas tentativas de acesso. Aguarde e tente novamente."
          : "E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }
    router.replace(safeReturnPath(searchParams.get("next"), window.location.origin));
    router.refresh();
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setLoading(false); }
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
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-senha` });
    if (recoveryError) {
      setError("Não foi possível iniciar a recuperação. Verifique o e-mail ou procure um administrador.");
      return;
    }
    setNotice("Se o e-mail estiver autorizado, você receberá instruções de recuperação.");
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setLoading(false); }
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
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(searchParams.get("next"), window.location.origin))}` },
    });
    if (oauthError) {
      setError("Não foi possível iniciar o login com Google. Verifique se o provedor está habilitado.");
      setLoading(false);
    }
    } catch { setError("Não foi possível conectar ao provedor. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {searchParams.get("error") && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">Não foi possível concluir a autenticação. O link pode ter expirado. Entre novamente ou solicite outro link.</p>}
      <label className="block text-sm font-semibold">E-mail
        <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-(--line) p-3" />
      </label>
      <label className="block text-sm font-semibold">Senha
        <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-(--line) p-3" />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-(--brand) px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? "Entrando..." : "Entrar"}</button>
      <button type="button" onClick={recoverPassword} disabled={loading} className="w-full text-left text-sm font-semibold text-(--brand) underline disabled:opacity-50">Esqueci minha senha</button>
      <div className="flex items-center gap-3 text-xs text-(--muted)"><span className="h-px flex-1 bg-(--line)" />ou<span className="h-px flex-1 bg-(--line)" /></div>
      <button type="button" onClick={signInWithGoogle} disabled={loading} className="w-full rounded-lg border border-(--line) px-4 py-3 font-bold text-(--ink) disabled:opacity-50">Continuar com Google</button>
    </form>
  );
}
