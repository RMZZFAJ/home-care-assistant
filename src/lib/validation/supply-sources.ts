import { z } from "zod";

export const supplySourceTarget = z.enum(["COM", "ENT", "DEV"]);
export type SupplySourceTarget = z.infer<typeof supplySourceTarget>;
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

const option = z.object({
  id: z.uuid(),
  type: z.enum(["REQ", "COM", "ENT"]),
  code: z.string().min(1),
  status: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  materials: z.array(z.object({
    lineId: z.uuid(),
    productId: z.string().min(1),
    available: z.string().regex(/^\d+(?:\.\d+)?$/).nullable(),
  }).strict()).max(1000),
}).strict();
export type SupplySourceOption = z.infer<typeof option>;

const sourceResponse = z.object({
  patientId: z.uuid(),
  target: supplySourceTarget,
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  data: z.array(option).max(100),
}).strict();

export function parseSupplySources(value: unknown, patientId: string, target: SupplySourceTarget, page: number) {
  const result = sourceResponse.parse(value);
  if (result.patientId !== patientId || result.target !== target || result.page !== page)
    throw new Error("A consulta de origem não corresponde a esta ficha.");
  return result;
}
