import { z } from "zod";
import { materialHistoryObservation, stockObservationTimeSource } from "./document-material-context";

export const supplySourceTarget = z.enum(["COM", "ENT", "DEV"]);
export type SupplySourceTarget = z.infer<typeof supplySourceTarget>;
export const sourcePickerTarget = z.enum(["REQ", "COM", "ENT", "DEV", "BAL"]);
export type SourcePickerTarget = z.infer<typeof sourcePickerTarget>;
export const materialDocumentReferences = z.array(z.strictObject({
  productId: z.string().min(1).max(120),
  documentId: z.uuid(),
})).max(100).refine(links => new Set(links.map(link => JSON.stringify([link.productId, link.documentId]))).size === links.length);
export type MaterialDocumentReferences = z.infer<typeof materialDocumentReferences>;
export const supplySourceFilter = z.enum(["", "REQ", "ENT", "COM", "BAL", "DEV"]);
export const supplySourceLink = z.object({
  documentId: z.uuid(),
  general: z.boolean(),
  productIds: z.array(z.string().min(1).max(120)).max(1000)
    .refine((ids) => new Set(ids).size === ids.length),
}).strict().refine((link) => link.general || link.productIds.length > 0);
export const supplySourceLinks = z.array(supplySourceLink).max(100)
  .refine((links) => new Set(links.map((row) => row.documentId)).size === links.length);
export type SupplySourceLink = z.infer<typeof supplySourceLink>;
export type SupplySourceOrigin = SupplySourceLink & { type: "REQ" | "COM" | "ENT"; code: string };

const recordedStock = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const sourceObservation = z.object({
  quantity: recordedStock.nullable(),
  mode: materialHistoryObservation.nullable(),
  unit: z.string().nullable(),
  observedAt: z.iso.datetime({ offset: true }).nullable(),
  timeSource: stockObservationTimeSource.nullable(),
}).strict();
const option = z.object({
  id: z.uuid(),
  type: z.enum(["REQ", "COM", "ENT", "BAL"]),
  kind: sourcePickerTarget.optional(),
  code: z.string().min(1),
  status: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  requesterName: z.string().nullable().optional(),
  materials: z.array(z.object({
    lineId: z.uuid(),
    productId: z.string().min(1),
    available: z.string().regex(/^\d+(?:\.\d+)?$/).nullable(),
    observation: sourceObservation.optional(),
  }).strict()).max(1000),
}).strict();
export type SupplySourceOption = z.infer<typeof option>;
export type SupplySourceObservation = z.infer<typeof sourceObservation>;

const sourceResponse = z.object({
  patientId: z.uuid(),
  target: sourcePickerTarget,
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  familyStock: z.record(z.string(), recordedStock).optional(),
  data: z.array(option).max(100),
}).strict();

export function parseSupplySources(value: unknown, patientId: string, target: SourcePickerTarget, page: number) {
  const result = sourceResponse.parse(value);
  if (result.patientId !== patientId || result.target !== target || result.page !== page)
    throw new Error("A consulta de origem não corresponde a esta ficha.");
  return result;
}
