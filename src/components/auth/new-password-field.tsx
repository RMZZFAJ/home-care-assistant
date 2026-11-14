"use client";
import { useId, useState } from "react";
import { newPasswordSchema, passwordRequirements } from "@/lib/validation/password";
import { PasswordInput } from "@/components/ui/controls";

export const newPasswordHelp = "Use pelo menos 6 caracteres, com maiúscula, minúscula, número e símbolo. Limite de 72 bytes UTF-8. Você pode colar ou usar um gerenciador de senhas.";

export function NewPasswordField({ label = "Nova senha", name = "password", value, onChange, className, disabled = false }: {
  label?: string; name?: string; value?: string; onChange?: (value: string) => void; className?: string; disabled?: boolean;
}) {
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  const [entered, setEntered] = useState("");
  return <div>
    <label className="block text-sm font-semibold" htmlFor={id}>{label}</label>
    <PasswordInput revealLabel="nova senha" id={id} className={className} name={name} minLength={6} maxLength={72} required autoComplete="new-password" disabled={disabled} value={value} aria-describedby={id + "-help"} aria-invalid={invalid || undefined}
        onChange={event => { const parsed = newPasswordSchema.safeParse(event.target.value); event.target.setCustomValidity(parsed.success ? "" : parsed.error.issues[0].message); setInvalid(Boolean(event.target.value) && !parsed.success); setEntered(event.target.value); onChange?.(event.target.value); }} />
    <p id={id + "-help"} className="mt-1 text-xs text-(--muted)">{newPasswordHelp}</p>
    <ul className="hca-password-checks" aria-label="Requisitos da senha">{passwordRequirements(value ?? entered).map(rule => <li key={rule.label} data-valid={rule.valid}><span aria-hidden="true">{rule.valid ? "✓" : "○"}</span> {rule.label}</li>)}</ul>
  </div>;
}
