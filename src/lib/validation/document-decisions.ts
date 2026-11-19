import { z } from "zod";
import { purchaseCommandBody } from "./purchase-command";
import { purchaseArrivalBody, requestArrivalCorrection, resubmitArrival } from "./purchase-arrival";

export const documentDecisionIntention = z.object({
  domain: z.enum(["requisition", "supply", "transfer", "balance", "balance_workspace"]),
  action: z.string().min(1).max(80),
  body: z.record(z.string(), z.unknown()),
  expectedVersion: z.number().int().nonnegative().max(2147483647),
  referenceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict().refine(value => !["requisition", "balance", "balance_workspace"].includes(value.domain) || Boolean(value.referenceHash), "Confira a referência da ficha.")
  .refine(value => value.domain === "balance_workspace" || value.expectedVersion > 0, "Confira a versão da ficha.")
  .refine(value => value.domain !== "supply" || value.action !== "purchase" || purchaseCommandBody.safeParse(value.body).success, {
    path: ["body"],
    message: "Confira as quantidades e as previsões da compra.",
  })
  .refine(value => value.domain !== "supply" || value.action !== "receive" || !("lines" in value.body) ||
    purchaseArrivalBody.safeParse(value.body).success, { path: ["body"], message: "Confira os materiais da chegada." })
  .refine(value => value.domain !== "supply" || value.action !== "request_receipt_correction" || requestArrivalCorrection.safeParse(value.body).success,
    { path: ["body"], message: "Informe o que o autor precisa corrigir." })
  .refine(value => value.domain !== "supply" || value.action !== "resubmit_receipt" || resubmitArrival.safeParse(value.body).success,
    { path: ["body"], message: "Confira a declaração corrigida." });
export type DocumentDecisionIntention = z.infer<typeof documentDecisionIntention>;
const receiptBase = { documentId: z.uuid(), key: z.uuid(), recordedAt: z.iso.datetime({ offset: true }) };
export const documentDecisionReceipt = z.discriminatedUnion("state", [
  z.object({ ...receiptBase, state: z.literal("applied"), intention: documentDecisionIntention, result: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ ...receiptBase, state: z.literal("not_applied"), intention: z.null(), result: z.null() }).strict(),
]);
export type DocumentDecisionReceipt = z.infer<typeof documentDecisionReceipt>;

function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => sameJson(value, b[index]));
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => Object.hasOwn(right, key) && sameJson(left[key], right[key]));
}
export function requireDocumentDecisionReceipt(raw: unknown, scope: { documentId: string; key: string; domain: DocumentDecisionIntention["domain"]; action: string }, intention?: DocumentDecisionIntention) {
  const value = documentDecisionReceipt.parse(z.object({ data: z.unknown() }).parse(raw).data);
  if (value.documentId !== scope.documentId || value.key !== scope.key || value.state === "applied" &&
    (value.intention.domain !== scope.domain || value.intention.action !== scope.action || intention && !sameJson(value.intention, intention)))
    throw new Error("A resposta não confirmou esta tentativa. Confira o resultado antes de tentar outra ação.");
  return value;
}
