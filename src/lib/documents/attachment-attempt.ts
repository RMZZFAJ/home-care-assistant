import { z } from "zod";

// Leaves at least 270KB below the 4.5MB function payload ceiling for multipart.
export const attachmentMaxBytes = 4_194_304;
export const attachmentMaxLabel = "4 MB";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const attachmentReceipt = z.object({ id: z.uuid(), sha256: hash, sourceSha256: hash, persistence: z.literal("confirmed") });
export const attachmentPrepared = z.object({ id: z.uuid(), sha256: hash, sourceSha256: hash, persistence: z.literal("prepared") });
export type FrozenAttachment = Readonly<{ file: File; key: string; sourceSha256: string }>;
export async function freezeAttachment(file: File): Promise<FrozenAttachment> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Object.freeze({ file, key: crypto.randomUUID(), sourceSha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("") });
}
export function attachmentForm(attempt: FrozenAttachment, patientId: string, documentId?: string, movementId?: string, contingencyId?: string) {
  const form = new FormData();
  form.set("file", attempt.file);
  form.set("idempotencyKey", attempt.key);
  form.set("careRecipientId", patientId);
  if (documentId) form.set("documentId", documentId);
  if (movementId) form.set("movementId", movementId);
  if (contingencyId) form.set("contingencyId", contingencyId);
  return form;
}
export function confirmedAttachment(body: unknown, sourceSha256: string, id?: string) {
  const result = attachmentReceipt.safeParse(body);
  return result.success && result.data.sourceSha256 === sourceSha256 && (!id || result.data.id === id) ? result.data : null;
}
