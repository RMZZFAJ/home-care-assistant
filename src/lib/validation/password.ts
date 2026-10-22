import { z } from "zod";
// Matches the configured Supabase Auth bcrypt limit; hashing remains in Auth.
export const newPasswordSchema = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(72, "Use até 72 caracteres; letras acentuadas podem ocupar mais espaço.")
  .refine(
    (value) => new TextEncoder().encode(value).byteLength <= 72,
    "A senha excede o limite de 72 bytes. Reduza o comprimento.",
  );
