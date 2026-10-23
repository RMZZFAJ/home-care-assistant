"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  buttonClass,
  inputClass,
  Notice,
  panelClass,
  primaryClass,
} from "@/components/workspace";

export function AcceptInvitation() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const received = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (received) {
      sessionStorage.setItem("hca:invitation", received);
      window.history.replaceState(null, "", window.location.pathname);
    }
    const timer = window.setTimeout(() => {
      setToken(received ?? sessionStorage.getItem("hca:invitation"));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function accept(decision: "accept" | "decline" = "accept") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/invitations/accept", { token, decision });
      sessionStorage.removeItem("hca:invitation");
      setToken(null);
      if (decision === "decline") setDeclined(true);
      else setAccepted(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível aceitar o convite.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ notice: string }>(
        "/api/invitations/register",
        {
          token,
          email: form.get("email"),
          password: form.get("password"),
          fullName: form.get("fullName"),
        },
      );
      setNotice(result.notice);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível concluir o cadastro.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl p-4 sm:py-12">
      <section className={`${panelClass} space-y-5`}>
        <p className="text-xs font-bold uppercase tracking-wider text-(--brand)">
          Home Care Assistant
        </p>
        <h1 className="text-2xl font-semibold">
          Convite de acesso ao paciente
        </h1>
        {!ready && <Notice>Validando link…</Notice>}
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {declined ? (
          <Notice>Convite recusado. Nenhum vínculo foi concedido.</Notice>
        ) : accepted ? (
          <>
            <Notice>
              Convite aceito. Seu vínculo com o paciente está disponível.
            </Notice>
            <Link href="/" className={`${primaryClass} inline-block`}>
              Abrir Home Care Assistant
            </Link>
          </>
        ) : ready && token ? (
          <>
            <p className="text-sm">
              Entre com a conta do e-mail que recebeu o convite e confirme o
              aceite. O servidor valida o e-mail, a validade e as permissões do
              convite.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonClass}
                href="/login?next=%2Fconvites%2Faceitar"
              >
                Entrar com minha conta
              </Link>
              <button
                disabled={busy}
                className={primaryClass}
                onClick={() => void accept()}
              >
                {busy ? "Confirmando…" : "Aceitar convite com minha conta"}
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() => void accept("decline")}
              >
                Recusar convite
              </button>
            </div>
            <details>
              <summary className="cursor-pointer font-semibold">
                Ainda não tenho conta
              </summary>
              <form className="mt-4 space-y-4" onSubmit={register}>
                <label className="block">
                  Nome
                  <input
                    className={inputClass}
                    name="fullName"
                    autoComplete="name"
                    minLength={2}
                    maxLength={160}
                    required
                  />
                </label>
                <label className="block">
                  E-mail do convite
                  <input
                    className={inputClass}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="block">
                  Senha pessoal
                  <input
                    className={inputClass}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    required
                  />
                </label>
                <button className={primaryClass} disabled={busy}>
                  {busy ? "Registrando…" : "Criar minha conta"}
                </button>
              </form>
            </details>
          </>
        ) : (
          ready && (
            <Notice error>
              Este link não contém um convite válido. Solicite um novo link ao
              administrador do paciente.
            </Notice>
          )
        )}
      </section>
    </main>
  );
}
