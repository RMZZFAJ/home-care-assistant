import { z } from "zod";

const event = z.object({
  eventId: z.uuid(), version: z.number().int().positive(), actorId: z.uuid().nullable(),
  actorName: z.string().nullable(), recordedAt: z.iso.datetime({ offset: true }),
});
/** Supplemental immutable reporting facts, separate from the canonical event hash. */
export const pdfFidelitySchema = z.object({
  schemaVersion: z.literal(1),
  deliveryResolutions: z.array(event.extend({
    lineId: z.uuid().nullable(), resolution: z.enum(["received", "missing", "returned"]).nullable(),
    quantity: z.string().nullable(), reason: z.string().nullable(),
  }).strict()),
  purchaseReceiptEvents: z.array(event.extend({
    action: z.enum(["com.receive", "com.validate_receipt", "com.reject_receipt"]), receiptId: z.uuid().nullable(),
  }).strict()),
}).strict();
export type PdfFidelityFacts = z.infer<typeof pdfFidelitySchema>;
