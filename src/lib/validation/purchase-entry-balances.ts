import { z } from "zod";
import { quantity } from "@/lib/quantity";
import type { PurchaseReceipt } from "@/types/documents";

const numeric = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const instant = z.iso.datetime({ offset: true });
const entry = z.object({
  receiptId: z.uuid(), eventId: z.uuid(), eventVersion: z.number().int().positive(),
  enteredQuantity: numeric.refine(value => quantity(value).gt(0)),
  submittedAt: instant.nullable(), submittedName: z.string().nullable(),
  validatedAt: instant.nullable(), validatorId: z.uuid().nullable(),
  validatorName: z.string().nullable(),
}).strict();
const line = { lineId: z.uuid() };
export const purchaseEntryBalances = z.array(z.discriminatedUnion("state", [
  z.object({ ...line, state: z.literal("known"), quantity: numeric, entry }).strict(),
  z.object({ ...line, state: z.literal("restricted"), quantity: z.null(), entry }).strict(),
  z.object({ ...line, state: z.literal("not_validated"), quantity: z.null(), entry: z.null() }).strict(),
  z.object({ ...line, state: z.literal("unavailable"), quantity: z.null(), entry: entry.nullable() }).strict(),
])).superRefine((facts, ctx) => {
  if (new Set(facts.map(fact => fact.lineId)).size !== facts.length)
    ctx.addIssue({ code: "custom", message: "Material repetido no saldo de entrada." });
  if (facts.some(fact => (fact.state === "known" || fact.state === "restricted")
    && (!fact.entry.validatedAt || !fact.entry.validatorId)))
    ctx.addIssue({ code: "custom", message: "Validação da entrada não preservada." });
});
export type PurchaseEntryBalances = z.infer<typeof purchaseEntryBalances>;
export type PurchaseEntryBalance = PurchaseEntryBalances[number];
type Source = {
  version: number;
  lines: readonly { id?: unknown; accepted_quantity?: unknown }[];
  receipts: readonly PurchaseReceipt[];
  events: readonly { id: string; version: number; action: string; actorId?: string | null; receiptId?: string | null }[];
};
/** Reporting consistency only. Authorization and historical capture remain in the database. */
export function requirePurchaseEntryBalances(value: unknown, source: Source): PurchaseEntryBalances {
  const facts = purchaseEntryBalances.parse(value);
  if (facts.length !== source.lines.length || facts.some(fact => !source.lines.some(item => item.id === fact.lineId)))
    throw new Error("O saldo não corresponde aos materiais desta ficha.");
  for (const fact of facts) {
    const material = source.lines.find(item => item.id === fact.lineId)!;
    if (fact.state === "not_validated" && ((typeof material.accepted_quantity !== "string" && typeof material.accepted_quantity !== "number")
      || !quantity(material.accepted_quantity).eq(0)
      || source.receipts.some(receipt => receipt.state === "approved" && receipt.lines.some(item => item.lineId === fact.lineId))))
      throw new Error("A ausência de entrada não corresponde ao registro.");
    if (!fact.entry) continue;
    const act = fact.entry;
    const receipt = source.receipts.find(item => item.id === act.receiptId);
    const event = source.events.find(item => item.id === act.eventId);
    const lines = receipt?.lines.filter(item => item.lineId === fact.lineId) ?? [];
    const sameInstant = (a: string | null | undefined, b: string | null) =>
      a == null ? b === null : b !== null && new Date(a).getTime() === new Date(b).getTime();
    if (!receipt || receipt.state !== "approved" || !lines.length || !event
      || !["com.receive", "com.validate_receipt"].includes(event.action)
      || event.version !== act.eventVersion || act.eventVersion > source.version
      || (event.receiptId != null && event.receiptId !== act.receiptId)
      || (event.actorId != null && act.validatorId != null && event.actorId !== act.validatorId)
      || !quantity(act.enteredQuantity).eq(lines.reduce((sum, item) => sum.plus(item.quantity), quantity(0)))
      || !sameInstant(receipt.created_at, act.submittedAt)
      || !sameInstant(receipt.validated_at, act.validatedAt)
      || (receipt.submitted_name ?? null) !== act.submittedName
      || (receipt.validated_by ?? null) !== act.validatorId
      || (receipt.validated_name ?? null) !== act.validatorName)
      throw new Error("O saldo não corresponde à parcela validada nesta versão.");
  }
  return facts;
}
