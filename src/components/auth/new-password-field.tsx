"use client";
import { useId, useState } from "react";
import { newPasswordSchema } from "@/lib/validation/password";

export const newPasswordHelp = "Use pelo menos 12 caracteres e no máximo 72 bytes UTF-8. Letras acentuadas podem ocupar mais de um byte. Você pode colar ou usar um gerenciador de senhas.";

export function NewPasswordField({ label = "Nova senha", name = "password", value, onChange, className, disabled = false }: {
  label?: string; name?: string; value?: string; onChange?: (value: string) => void; className?: string; disabled?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [invalid, setInvalid] = useState(false);
  return <div>
    <label className="block text-sm font-semibold" htmlFor={id}>{label}</label>
    <div className="flex items-center gap-2">
      <input id={id} className={className} name={name} type={visible ? "text" : "password"} minLength={12} maxLength={72} required autoComplete="new-password" disabled={disabled} value={value} aria-describedby={id + "-help"} aria-invalid={invalid || undefined}
        onChange={event => { const parsed = newPasswordSchema.safeParse(event.target.value); event.target.setCustomValidity(parsed.success ? "" : parsed.error.issues[0].message); setInvalid(Boolean(event.target.value) && !parsed.success); onChange?.(event.target.value); }} />
      <button className="min-h-11 shrink-0 px-2 text-sm underline" type="button" aria-label={visible ? "Ocultar nova senha" : "Mostrar nova senha"} aria-pressed={visible} disabled={disabled} onClick={() => setVisible(current => !current)}>{visible ? "Ocultar" : "Mostrar"}</button>
    </div>
    <p id={id + "-help"} className="mt-1 text-xs text-(--muted)">{newPasswordHelp}</p>
  </div>;
}
