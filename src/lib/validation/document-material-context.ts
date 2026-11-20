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
  references: z.array(z.object({
    lineId: z.uuid(), document: document.pick({ id: true, type: true, kind: true, code: true }),
  })).optional(),
});
export const materialPanelSections = ["stock", "history", "links"] as const;
const lineScope = scope.extend({
  documentId: z.uuid().nullable(), lineId: z.uuid().nullable(),
  productId: z.string().nullable(), page: z.number().int().positive(),
});
const observationMode = z.enum(["observed", "unknown", "unfilled", "legacy_unclassified"]);
const historyRecord = z.object({
  type: z.string(), createdAt: date, author: z.string().nullable(),
  document: document.nullable(), arrival: z.object({ id: z.uuid(), code: z.string() }).nullable(),
});
export const materialHistoryRow = z.discriminatedUnion("kind", [
  historyRecord.extend({
    kind: z.literal("movement"), id: z.uuid(), quantity,
    source: z.string().nullable(), destination: z.string().nullable(),
    sourceAfter: quantity.nullable(), destinationAfter: quantity.nullable(),
  }),
  historyRecord.extend({
    kind: z.literal("decision"), id: z.string().min(1), quantity: quantity.nullable(),
    unit: z.string().nullable(), reason: z.string().nullable(), detail: z.string().nullable(),
  }),
]);
export const materialHistoryObservation = observationMode;
export type MaterialHistoryRow = z.infer<typeof materialHistoryRow>;
export const documentMaterialPanel = z.discriminatedUnion("section", [
  lineScope.extend({
    section: z.literal("stock"), ...balances,
    observations: z.array(z.object({
      documentId: z.uuid(), code: z.string().nullable(), createdAt: date,
      quantity: quantity.nullable(), observation: observationMode.nullable(),
      unit: z.string().nullable(), observedAt: date.nullable(),
      timeSource: z.enum(["client_draft", "server_submission", "legacy_unknown"]).nullable(),
    })),
  }),
  lineScope.extend({
    section: z.literal("history"), available: z.boolean(), total: z.number().int().nonnegative(),
    rows: z.array(materialHistoryRow),
  }),
  lineScope.extend({
    section: z.literal("links"), total: z.number().int().nonnegative(),
    rows: z.array(document.extend({ archived: z.boolean() })),
  }),
]);
export type MaterialPanelSection = typeof materialPanelSections[number];
