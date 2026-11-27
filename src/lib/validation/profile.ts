import { z } from "zod";

export const phoneContact = z.string().regex(/^\+[1-9]\d{7,14}$/, "Use +, código do país, DDD e número.");
export const emailContact = z.string().trim().email("Informe um endereço de e-mail válido.").max(254).toLowerCase();
const contactStatus = z.object({
  emailConfirmed: z.boolean(),
  pendingEmail: emailContact.nullable(),
  pendingPhone: phoneContact.nullable(),
  recent: z.boolean(),
  repeatSignIn: z.boolean(),
});

const profileRead = z.object({
  data: z.object({
    full_name: z.string().min(1), professional_registration: z.string().nullable(),
    professional_state: z.string().nullable(), professional_category: z.string().nullable(),
    notification_preferences: z.record(z.string(), z.boolean()), avatar: z.string().nullable(),
    email: emailContact, phone: z.string().nullable(), providers: z.array(z.string()),
    contactStatus: contactStatus.optional(),
  }),
  memberships: z.array(z.object({
    care_recipient_id: z.string().uuid(), role: z.string(), status: z.string(),
    care_recipients: z.object({ id: z.string().uuid(), display_name: z.string(), is_active: z.boolean() }).nullable(),
  })),
  sessions: z.array(z.object({
    id: z.string().uuid(), createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }).nullable(), userAgent: z.string().nullable(), current: z.boolean(),
  })),
});
export type ProfileRead = z.infer<typeof profileRead>;
export function parseProfileRead(value: unknown): ProfileRead {
  const result = profileRead.safeParse(value);
  if (!result.success) throw new Error("A resposta da consulta do perfil não pôde ser lida. Consulte novamente.");
  return result.data;
}
