import { z } from "zod";

const scope = z.object({ documentId: z.uuid(), patientId: z.uuid() });
const quantity = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const date = z.iso.datetime({ offset: true });
const document = z.object({
  id: z.uuid(), type: z.enum(["REQ", "COM", "ENT", "BAL"]),
  kind: z.enum(["REQ", "COM", "ENT", "DEV", "BAL"]), code: z.string().nullable(),
  status: z.string(), createdAt: date,
});
const balances = { family: quantity.nullable(), team: quantity.nullable() };
export const documentMaterialSummary = scope.extend({
  balances: z.array(z.object({ lineId: z.uuid(), productId: z.string().nullable(), ...balances })),
});
export const materialPanelSections = ["stock", "history", "links"] as const;
const lineScope = scope.extend({
  lineId: z.uuid(), productId: z.string().nullable(), page: z.number().int().positive(),
});
export const documentMaterialPanel = z.discriminatedUnion("section", [
  lineScope.extend({
    section: z.literal("stock"), ...balances,
    observations: z.array(z.object({
      documentId: z.uuid(), code: z.string().nullable(), createdAt: date,
      quantity: quantity.nullable(), observation: z.enum(["observed", "unknown", "unfilled", "legacy_unclassified"]).nullable(),
      unit: z.string().nullable(), observedAt: date.nullable(),
      timeSource: z.enum(["client_draft", "server_submission", "legacy_unknown"]).nullable(),
    })),
  }),
  lineScope.extend({
    section: z.literal("history"), available: z.boolean(), total: z.number().int().nonnegative(),
    rows: z.array(z.object({
      id: z.uuid(), quantity, type: z.string(), createdAt: date, author: z.string().nullable(),
      source: z.string().nullable(), destination: z.string().nullable(),
      sourceAfter: quantity.nullable(), destinationAfter: quantity.nullable(), document: document.nullable(),
    })),
  }),
  lineScope.extend({
    section: z.literal("links"), total: z.number().int().nonnegative(),
    rows: z.array(document.extend({ archived: z.boolean() })),
  }),
]);
export type MaterialPanelSection = typeof materialPanelSections[number];
