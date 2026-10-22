"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (password.length < 12 || password !== confirmation) {
      setError("Use pelo menos 12 caracteres e confirme a mesma senha."); return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Serviço indisponível.");
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) throw new Error("O link expirou ou é inválido. Solicite uma nova recuperação no login.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error("Não foi possível alterar a senha. Confira os requisitos ou solicite novo link.");
      setPassword(""); setConfirmation(""); setDone(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível conectar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md space-y-5 p-6"><h1 className="text-2xl font-semibold">Definir nova senha</h1>{done ? <p role="status">Senha atualizada. <Link className="underline" href="/">Acessar o sistema</Link></p> : <form onSubmit={submit} className="space-y-4"><p className="text-sm">Abra esta página pelo link de recuperação ou ativação recebido.</p><label className="block">Nova senha<input className="mt-1 w-full rounded border p-3" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="block">Confirmar nova senha<input className="mt-1 w-full rounded border p-3" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button className="rounded bg-(--brand) px-4 py-3 text-white disabled:opacity-50" disabled={busy}>{busy ? "Atualizando..." : "Salvar nova senha"}</button></form>}<Link href="/login" className="inline-block underline">Voltar ao login</Link></main>;
}
