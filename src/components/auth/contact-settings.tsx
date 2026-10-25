"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { useState, type FormEvent } from "react";
import {
  api,
  buttonClass,
  inputClass,
  Notice,
  primaryClass,
} from "../workspace";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
export function ContactSettings({
  email,
  phone,
  providers,
  onChange,
}: {
  email: string;
  phone: string | null;
  providers: string[];
  onChange: () => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [number, setNumber] = useState(phone ?? "");
  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: "email" | "phone" | "verifyPhone",
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/profile", {
        action,
        ...(action === "email"
          ? { email: form.get("email") }
          : {
              phone: number,
              ...(action === "verifyPhone" ? { token: form.get("token") } : {}),
            }),
      });
      setMessage(
        action === "email"
          ? "Confirme a alteração pelos links enviados pelo Supabase Auth aos endereços envolvidos."
          : action === "phone"
            ? "Código solicitado ao provedor de SMS. Informe o código recebido."
            : "Telefone confirmado e vinculado à sua identidade.",
      );
      onChange();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SettingsSection title="Contatos e métodos de login" summary="E-mail, telefone e provedores de autenticação">
      
      <p className="mt-2 text-xs text-(--muted)">
        Alterações sensíveis exigem sessão recente. A confirmação de telefone
        usa o provedor de SMS do Supabase Auth. COREN não é fator de
        autenticação.
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => void submit(event, "email")}
      >
        <label className="block text-sm font-semibold">
          Novo e-mail
          <input
            className={inputClass}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            required
          />
        </label>
        <button className={buttonClass} disabled={busy}>
          Solicitar alteração de e-mail
        </button>
      </form>
      <div className="mt-5 border-t border-(--line) pt-4">
        <p className="text-sm">
          Celular verificado: <strong>{phone ?? "Não confirmado"}</strong>
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => void submit(event, "phone")}
        >
          <label className="block text-sm font-semibold">
            Celular com código do país
            <input
              className={inputClass}
              type="tel"
              autoComplete="tel"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="+55…"
              pattern="\+[1-9][0-9]{7,14}"
              required
            />
          </label>
          <button className={buttonClass} disabled={busy}>
            Enviar código de verificação
          </button>
        </form>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(event) => void submit(event, "verifyPhone")}
        >
          <label className="min-w-0 flex-1 text-sm font-semibold">
            Código recebido
            <input
              className={inputClass}
              inputMode="numeric"
              autoComplete="one-time-code"
              name="token"
              pattern="[0-9]{6,8}"
              required
            />
          </label>
          <button className={primaryClass} disabled={busy}>
            Verificar celular
          </button>
        </form>
      </div>
      <div className="mt-5 border-t border-(--line) pt-4">
        <p className="text-sm">
          Google:{" "}
          {providers.includes("google")
            ? "Vinculado à mesma conta"
            : "Não vinculado"}
        </p>
        {!providers.includes("google") ? (
          <button
            className={buttonClass + " mt-3"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api("/api/profile", { action: "prepareLink" });
                const client = createSupabaseBrowserClient();
                if (!client) throw new Error("Auth indisponível.");
                const { error } = await client.auth.linkIdentity({
                  provider: "google",
                  options: {
                    redirectTo:
                      window.location.origin + "/auth/callback?next=/perfil",
                  },
                });
                if (error)
                  throw new Error(
                    "Habilite Google e vinculação manual no Supabase Auth para concluir esta operação.",
                  );
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Não foi possível vincular.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Vincular minha conta Google
          </button>
        ) : null}
      </div>
    </SettingsSection>
  );
}
