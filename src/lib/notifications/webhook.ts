import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function secretMatches(actual: string | null, expected: string | undefined) {
  if (!actual || !expected) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function verifyMetaSignature(body: string, signature: string | null, appSecret: string | undefined) {
  if (!appSecret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return secretMatches(signature, `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`);
}
const payloadSchema = z.object({ object: z.literal("whatsapp_business_account"), entry: z.array(z.object({ changes: z.array(z.object({ value: z.object({ statuses: z.array(z.object({ id: z.string().min(1).max(500), status: z.enum(["sent", "delivered", "read", "failed"]), biz_opaque_callback_data: z.string().uuid().optional() })).max(100).optional() }) })).max(100) })).max(100) });
export function metaStatuses(payload: unknown) {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  return parsed.data.entry.flatMap((entry) => entry.changes.flatMap((change) => change.value.statuses ?? [])).map((status) => ({ providerReference: status.id, state: status.status === "sent" ? "accepted" : status.status, notificationId: status.biz_opaque_callback_data }));
}
