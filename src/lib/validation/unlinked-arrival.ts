import { z } from "zod";
import { purchaseAssociation, purchaseCoverageChoice, purchaseLinkDetails } from "./purchase-coverage";

export const unlinkedOrigins = ["external_purchase", "gift", "donation"] as const;
export const unlinkedOrigin = z.enum(unlinkedOrigins);
export const unlinkedOriginLabel = { external_purchase: "Compra externa", gift: "Presente", donation: "Doação" } as const;
const state = z.enum(["pending", "approved", "rejected", "correction_requested"]);
const version = z.number().int().min(1).max(2147483647);
const instant = z.iso.datetime({ offset: true });
const amount = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const productId = z.string().min(1).max(120);
const choices = { association: purchaseAssociation.optional(), coverage: purchaseCoverageChoice.optional() };
const lines = z.array(z.object({ productId, quantity: z.string().regex(/^\d{1,10}(?:\.\d{1,6})?$/), ...choices }).strict()
  .refine(line => !line.coverage || line.association, "Selecione a compra antes de cobrir outro planejamento.")).min(1).max(100)
  .refine(items => new Set(items.map(item => item.productId)).size === items.length, "Inclua cada material uma vez.");
export const unlinkedArrivalIntent = z.union([
  z.object({ origin: unlinkedOrigin, lines }).strict(),
  z.object({ arrivalId: z.uuid(), version, lines }).strict(),
]);
export type UnlinkedArrivalIntent = z.infer<typeof unlinkedArrivalIntent>;
export const unlinkedArrivalCommand = z.object({ careRecipientId: z.uuid(), key: z.uuid(), intent: unlinkedArrivalIntent.nullable() }).strict();
const cursor = z.object({ at: instant, id: z.uuid() }).strict();
export const unlinkedArrivalQuery = z.object({
  careRecipientId: z.uuid(), id: z.uuid().optional(), beforeAt: instant.optional(), beforeId: z.uuid().optional(),
}).strict().refine(value => value.id ? !value.beforeAt && !value.beforeId : Boolean(value.beforeAt) === Boolean(value.beforeId));

const summary = z.object({
  id: z.uuid(), code: z.string().regex(/^CHE-\d{4,}$/), origin: unlinkedOrigin, state,
  version, author: z.string(), createdAt: instant, submittedAt: instant, reason: z.string().nullable(),
}).strict();
export type UnlinkedArrival = z.infer<typeof summary>;
const material = z.object({ lineId: z.uuid(), productId, name: z.string(), unit: z.string(), quantity: amount,
  decimals: z.number().int().min(0).max(6), ...choices }).strict();
export const unlinkedArrivalDetails = summary.extend({
  canCorrect: z.boolean(), materials: z.array(material.extend({ familyStock: amount.nullable(), ...purchaseLinkDetails })).min(1).max(100),
  history: z.array(z.object({ version, author: z.string(), at: instant, state, reason: z.string().nullable(),
    materials: z.array(material).min(1).max(100) }).strict()).min(1),
});
export type UnlinkedArrivalDetails = z.infer<typeof unlinkedArrivalDetails>;
export const unlinkedArrivalPage = z.object({ arrivals: z.array(summary).max(30), next: cursor.nullable() }).strict();
export const unlinkedArrivalReceipt = z.discriminatedUnion("state", [
  z.object({ key: z.uuid(), state: z.literal("recorded"), result: summary }).strict(),
  z.object({ key: z.uuid(), state: z.literal("not_applied"), result: z.null() }).strict(),
]);
