import { z } from "zod";

/** Fixed provider origins keep user-supplied capabilities away from private hosts. */
export function allowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      url.pathname !== "/" &&
      (url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname === "web.push.apple.com" ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}

export const pushSubscription = z
  .object({
    endpoint: z
      .string()
      .max(4096)
      .refine(allowedPushEndpoint, "Serviço de avisos não suportado."),
    expirationTime: z
      .number()
      .int()
      .min(0)
      .max(4102444800000)
      .nullish()
      .transform((value) => value ?? null),
    keys: z
      .object({
        p256dh: z.string().regex(/^B[A-Za-z0-9_-]{86}$/),
        auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
      })
      .strict(),
  })
  .strict();
export type WebPushSubscription = z.infer<typeof pushSubscription>;

export const pushContextReference = z.string().regex(/^[a-f0-9]{64}$/);
export const pushEnrollment = z
  .object({
    subscription: pushSubscription,
    label: z.string().trim().min(1).max(80),
    consent: z.literal(true),
    contextReference: pushContextReference.optional(),
  })
  .strict();
export const pushDeviceCommand = z
  .object({
    id: z.string().uuid(),
    action: z.enum(["revoke", "pause", "resume"]),
    contextReference: pushContextReference.optional(),
  })
  .strict();
export const pushDevice = z
  .object({
    id: z.string().uuid(),
    label: z.string().max(80),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    state: z.enum(["active", "revoked", "expired"]),
    enabled: z.boolean(),
    currentSession: z.boolean(),
    mutedUntil: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    acceptedAt: z.string().nullable(),
  })
  .strict();
export const pushDevices = z.array(pushDevice).max(40);

export function pushDestination(value: unknown): string {
  const id = z.string().uuid().safeParse(value);
  return id.success
    ? "/notificacoes?push=" + encodeURIComponent(id.data)
    : "/notificacoes";
}
