import { z } from "zod";

const hash = z.string().regex(/^[0-9a-f]{64}$/);
export const avatarAttemptSchema = z.object({
  id: z.string().uuid(), key: z.string().uuid(), sourceHash: hash,
  sourceSize: z.number().int().positive().max(5_242_880), filename: z.string().min(1).max(160),
  referenceRevision: z.number().int().positive(), prepared: z.boolean(), verified: z.boolean(),
  state: z.enum(["pending", "applied", "abandoned"]), current: z.boolean(),
  createdAt: z.string().datetime({ offset: true }), appliedAt: z.string().datetime({ offset: true }).nullable(),
});
export const avatarStoredAttemptSchema = avatarAttemptSchema.extend({
  objectPath: z.string(), expectedHash: hash.nullable(), expectedSize: z.number().int().positive().nullable(),
});
export const avatarReadSchema = z.object({
  referenceRevision: z.number().int().positive(), attempt: avatarAttemptSchema.nullable(),
  avatar: z.string().nullable(), avatarUnavailable: z.boolean(),
});
export const avatarCommandSchema = z.object({ action: z.enum(["recover", "abandon"]), key: z.string().uuid() }).strict();
export type AvatarAttempt = z.infer<typeof avatarAttemptSchema>;
export type AvatarRead = z.infer<typeof avatarReadSchema>;
export function parseAvatarRead(value: unknown): AvatarRead {
  const parsed = avatarReadSchema.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível conferir a consulta da foto. Atualize esta seção.");
  return parsed.data;
}
