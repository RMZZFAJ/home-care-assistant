import { z } from "zod";
import { unlinkedOrigin } from "./unlinked-arrival";

const instant = z.iso.datetime({ offset: true });
const amount = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const target = {
  documentId: z.uuid().nullable(), receiptId: z.uuid(), version: z.number().int().min(1).max(2147483647),
};
export const arrivalReviewBatchLimit = 100;
export const arrivalReviewDecision = z.discriminatedUnion("decision", [
  z.object({ ...target, decision: z.literal("approve") }).strict(),
  z.object({ ...target, decision: z.enum(["reject", "request_correction"]), reason: z.string().trim().min(3).max(1000) }).strict(),
]);
export type ArrivalReviewDecision = z.infer<typeof arrivalReviewDecision>;
export const arrivalReviewAttempt = z.object({ careRecipientId: z.uuid(), key: z.uuid() }).strict();
export const arrivalReviewBatch = arrivalReviewAttempt.extend({
  entries: z.array(arrivalReviewDecision).min(1).max(arrivalReviewBatchLimit).refine(entries =>
    new Set(entries.map(entry => entry.receiptId)).size === entries.length, "Confira cada chegada uma vez."),
});
export const arrivalReviewQueueQuery = z.object({
  careRecipientId: z.uuid(), documentId: z.uuid().optional(), beforeAt: instant.optional(), beforeId: z.uuid().optional(),
}).strict().refine(value => Boolean(value.beforeAt) === Boolean(value.beforeId), "Confira a referência da página.");

const material = z.object({
  lineId: z.uuid(), name: z.string(), unit: z.string(), quantity: amount,
  expectedQuantity: amount.nullable(), remainingAction: z.enum(["wait", "short"]).nullable(), familyStock: amount.nullable(),
}).strict();
const arrivalReviewRow = z.object({ ...target, documentCode: z.string(), author: z.string().nullable(),
  submittedAt: instant, materials: z.array(material).min(1), origin: unlinkedOrigin.optional(),
}).strict().refine(row => (row.documentId === null) === (row.origin !== undefined));
export type ArrivalReviewRow = z.infer<typeof arrivalReviewRow>;
export const arrivalReviewQueue = z.object({ arrivals: z.array(arrivalReviewRow).max(30),
  next: z.object({ at: instant, id: z.uuid() }).strict().nullable(),
}).strict();
export type ArrivalReviewQueue = z.infer<typeof arrivalReviewQueue>;

const outcome = z.object({
  documentId: z.uuid().nullable(), receiptId: z.uuid(), documentCode: z.string().nullable(), submittedAt: instant.nullable(), materials: z.array(z.string()),
  status: z.enum(["approved", "rejected", "correction_requested", "already_decided", "changed", "blocked"]),
}).strict();
export const arrivalReviewReceipt = z.discriminatedUnion("state", [
  z.object({ key: z.uuid(), state: z.literal("recorded"), results: z.array(outcome).min(1).max(arrivalReviewBatchLimit) }).strict(),
  z.object({ key: z.uuid(), state: z.literal("not_applied"), results: z.null() }).strict(),
]);
export type ArrivalReviewReceipt = z.infer<typeof arrivalReviewReceipt>;

export function requireArrivalReviewReceipt(raw: unknown, key: string, entries?: readonly ArrivalReviewDecision[]) {
  const value = arrivalReviewReceipt.parse(raw);
  if (value.key !== key || value.state === "recorded" && entries && (
    value.results.length !== entries.length || value.results.some((result, index) => {
      const supplied = entries[index];
      const expected = supplied.decision === "approve" ? "approved" : supplied.decision === "reject" ? "rejected" : "correction_requested";
      return result.documentId !== supplied.documentId || result.receiptId !== supplied.receiptId ||
        result.status !== expected && !["already_decided", "changed", "blocked"].includes(result.status);
    }))) throw new Error("A resposta não confirmou as decisões desta tentativa.");
  return value;
}
