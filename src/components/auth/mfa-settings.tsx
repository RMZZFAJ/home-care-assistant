"use client";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/safe-return-path";
import {
  buttonClass,
  inputClass,
  Notice,
  primaryClass,
} from "@/components/workspace";

export function MfaSettings() {
  const params = useSearchParams();
  const [factor, setFactor] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const client = createSupabaseBrowserClient();
    if (client)
      void Promise.all([
        client.auth.mfa.listFactors(),
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])
        .then(([factors, assurance]) => {
          if (!active) return;
          if (factors.error || assurance.error) {
            setLoadFailed(true);
            setError(
              "Não foi possível consultar a autenticação em duas etapas.",
            );
            return;
          }
          setFactor(
            (
              factors.data.totp.find((item) => item.status === "verified") ??
              factors.data.totp[0]
            )?.id ?? null,
          );
          setVerified(assurance.data.currentLevel === "aal2");
        })
        .catch(() => {
          if (active) {
            setLoadFailed(true);
            setError("Não foi possível consultar seu autenticador.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [attempt]);
  async function enroll() {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const result = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Home Care Assistant",
      });
      if (result.error)
        throw new Error(
          "Não foi possível iniciar o TOTP. Verifique a configuração do Supabase Auth.",
        );
      setFactor(result.data.id);
      setQr(result.data.totp.qr_code);
      setMessage(
        "Cadastre o QR no seu autenticador e confirme o código antes de considerar a proteção ativa.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao iniciar TOTP.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createSupabaseBrowserClient();
    if (!client || !factor) return;
    setBusy(true);
    setError("");
    try {
      const result = await client.auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      });
      if (result.error)
        throw new Error(
          "Código inválido ou expirado. Confira o horário do autenticador e tente novamente.",
        );
      setQr("");
      setCode("");
      setVerified(true);
      setMessage("Autenticação em duas etapas confirmada nesta sessão.");
      window.dispatchEvent(new Event("hca:profile-updated"));
      setAttempt((value) => value + 1);
      const next = params.get("next");
      if (next)
        window.location.assign(safeReturnPath(next, window.location.origin));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível verificar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    const client = createSupabaseBrowserClient();
    if (!client || !factor) return;
    setBusy(true);
    setError("");
    const result = await client.auth.mfa.unenroll({ factorId: factor });
    if (result.error)
      setError("Confirme primeiro o código da sessão para remover este fator.");
    else {
      setFactor(null);
      setQr("");
      setVerified(false);
      setMessage("Fator removido pelo Supabase Auth.");
      window.dispatchEvent(new Event("hca:profile-updated"));
    }
    setBusy(false);
  }
  return (
    <section className="ui-card">
      <h2 className="font-semibold">Autenticação em duas etapas</h2>
      <p className="my-3 text-sm">
        Após ativar o autenticador, a administração exige verificação AAL2.
        Guarde o acesso ao autenticador; não compartilhe o QR.
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {loading ? (
        <Notice>Consultando autenticação em duas etapas…</Notice>
      ) : loadFailed ? (
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setLoading(true);
            setLoadFailed(false);
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          Consultar novamente
        </button>
      ) : !factor ? (
        <button
          type="button"
          className={primaryClass}
          disabled={busy}
          onClick={() => void enroll()}
        >
          Ativar autenticador TOTP
        </button>
      ) : (
        <>
          {qr ? (
            <Image
              unoptimized
              width={240}
              height={240}
              src={
                qr.startsWith("data:")
                  ? qr
                  : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr)
              }
              alt="QR privado para cadastrar seu autenticador"
            />
          ) : null}
          {!verified || qr ? (
            <form className="mt-3 space-y-3" onSubmit={confirm}>
              <label className="block text-sm font-semibold">
                Código do autenticador
                <input
                  className={inputClass}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              <button className={primaryClass} disabled={busy}>
                Verificar código
              </button>
            </form>
          ) : (
            <p className="my-3 text-sm">Sessão verificada em duas etapas.</p>
          )}
          <button
            type="button"
            className={buttonClass + " mt-3"}
            disabled={busy || (!verified && !qr)}
            onClick={() => void remove()}
          >
            {qr ? "Cancelar cadastro do fator" : "Remover este autenticador"}
          </button>
        </>
      )}
    </section>
  );
}
