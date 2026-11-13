"use client";
import { useId, useState } from "react";
import { newPasswordSchema, passwordRequirements } from "@/lib/validation/password";
import { ActionButton } from "@/components/ui/controls";

export const newPasswordHelp = "Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo. Limite de 72 bytes UTF-8. Você pode colar ou usar um gerenciador de senhas.";

export function NewPasswordField({ label = "Nova senha", name = "password", value, onChange, className, disabled = false }: {
  label?: string; name?: string; value?: string; onChange?: (value: string) => void; className?: string; disabled?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [entered, setEntered] = useState("");
  return <div>
    <label className="block text-sm font-semibold" htmlFor={id}>{label}</label>
    <div className="flex items-center gap-2">
      <input id={id} className={className} name={name} type={visible ? "text" : "password"} minLength={8} maxLength={72} required autoComplete="new-password" disabled={disabled} value={value} aria-describedby={id + "-help"} aria-invalid={invalid || undefined}
        onChange={event => { const parsed = newPasswordSchema.safeParse(event.target.value); event.target.setCustomValidity(parsed.success ? "" : parsed.error.issues[0].message); setInvalid(Boolean(event.target.value) && !parsed.success); setEntered(event.target.value); onChange?.(event.target.value); }} />
      <ActionButton variant="quiet" className="shrink-0" type="button" aria-label={visible ? "Ocultar nova senha" : "Mostrar nova senha"} aria-pressed={visible} disabled={disabled} onClick={() => setVisible(current => !current)}>{visible ? "Ocultar" : "Mostrar"}</ActionButton>
    </div>
    <p id={id + "-help"} className="mt-1 text-xs text-(--muted)">{newPasswordHelp}</p>
    <ul className="hca-password-checks" aria-label="Requisitos da senha">{passwordRequirements(value ?? entered).map(rule => <li key={rule.label} data-valid={rule.valid}><span aria-hidden="true">{rule.valid ? "✓" : "○"}</span> {rule.label}</li>)}</ul>
  </div>;
}
