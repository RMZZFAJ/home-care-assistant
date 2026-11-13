import { z } from "zod";
// Keep these groups identical to Supabase Auth's configured requirements.
export function passwordRequirements(value: string) {
  return [
    { label: "Pelo menos 8 caracteres", valid: value.length >= 8 },
    { label: "Uma letra maiúscula (A–Z)", valid: /[A-Z]/.test(value) },
    { label: "Uma letra minúscula (a–z)", valid: /[a-z]/.test(value) },
    { label: "Um número", valid: /[0-9]/.test(value) },
    { label: "Um símbolo", valid: /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(value) },
    { label: "Até 72 bytes UTF-8", valid: value.length > 0 && new TextEncoder().encode(value).byteLength <= 72 },
  ];
}
export const newPasswordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(72, "Use até 72 caracteres; letras acentuadas podem ocupar mais espaço.")
  .refine(
    (value) => new TextEncoder().encode(value).byteLength <= 72,
    "A senha excede o limite de 72 bytes. Reduza o comprimento.",
  )
  .refine(value => passwordRequirements(value).every(rule => rule.valid),
    "Use maiúscula, minúscula, número e símbolo, com pelo menos 8 caracteres.");
