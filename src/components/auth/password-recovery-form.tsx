"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useClientReady } from "@/lib/use-client-ready";
import { newPasswordSchema } from "@/lib/validation/password";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { NewPasswordField } from "./new-password-field";
import { AccessFrame } from "./access-frame";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Notice, inputClass, buttonClass } from "@/components/workspace";

export function PasswordRecoveryForm() {
  const ready = useClientReady();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const validation = newPasswordSchema.safeParse(password);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    if (password !== confirmation) {
      setError("As senhas precisam ser iguais. Confira a confirmação.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Serviço indisponível.");
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();
      if (sessionError || !user)
        throw new Error(
          "O link expirou ou é inválido. Solicite uma nova recuperação no login.",
        );
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError)
        throw new Error(
          "Não foi possível alterar a senha. Confira os requisitos ou solicite novo link.",
        );
      setPassword("");
      setConfirmation("");
      setDone(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessFrame active="recovery" title="Definir nova senha">
      {done ? (
        <Notice>
          Senha atualizada.{" "}
          <Link tabIndex={0} className={buttonClass} href="/">
            Acessar o sistema
          </Link>
        </Notice>
      ) : (
        <form onSubmit={submit} className="hca-access-form">
          <p className="text-sm">
            Abra esta página pelo link de recuperação ou ativação recebido.
          </p>
          <NewPasswordField className={inputClass} disabled={!ready || busy} value={password} onChange={setPassword} />
          <FormField label="Confirmar nova senha">
            <TextInput
              type="password"
              disabled={!ready || busy}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </FormField>
          {error ? <Notice error>{error}</Notice> : null}
          <ActionButton
            type="submit"
            variant="primary"
            disabled={busy || !ready}
          >
            {busy ? "Atualizando..." : "Salvar nova senha"}
          </ActionButton>
        </form>
      )}
      <Link tabIndex={0} href="/login" className={`${buttonClass} mt-4`}>
        Voltar ao login
      </Link>
    </AccessFrame>
  );
}
