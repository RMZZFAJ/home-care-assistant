import { z } from "zod";
import { quantity } from "@/lib/quantity";

export const stockLocation = z.enum(["FAMILY", "CARE_TEAM", "TRANSIT"]);
export const stockCustodySelection = z.enum(["", "FAMILY", "CARE_TEAM", "TRANSIT"]);
const productId = z.string().min(1);
// Read models include signed legacy balances and averages with more than six
// decimal places. Command limits and product precision belong to native writes.
const stockNumber = z.union([
  z.string().regex(/^-?\d+(?:\.\d+)?$/),
  z.number().finite(),
]).transform(value => quantity(value).toFixed());
const instant = z.string().datetime({ offset: true });
const custody = z.object({
  confirmed: stockNumber,
  incoming: stockNumber,
  minimum: stockNumber.nullable(),
});
const product = z.object({
  productId, name: z.string().min(1), unit: z.string().min(1),
  decimals: z.number().int().min(0).max(6), active: z.boolean(),
  family: custody.extend({ purchasePending: stockNumber }).nullable(),
  team: custody.extend({ purchasePending: stockNumber.optional() }).nullable(),
  disputed: stockNumber,
});
const metric = z.object({
  productId, location: z.enum(["FAMILY", "CARE_TEAM"]),
  quantity: stockNumber, averagePerDay: stockNumber,
});
const transitDocument = z.object({
  id: z.uuid(), code: z.string().min(1),
  status: z.enum(["pending_receipt", "disputed", "cancellation_pending"]),
  source: z.enum(["FAMILY", "CARE_TEAM"]), destination: z.enum(["FAMILY", "CARE_TEAM"]),
  createdAt: instant,
  lines: z.array(z.object({
    productId, name: z.string().min(1), unit: z.string().min(1),
    dispatched: stockNumber, accepted: stockNumber, reconciled: stockNumber,
    pending: stockNumber, disputed: z.boolean(),
  })).min(1),
}).refine(document => document.source !== document.destination);
const balance = z.object({ product_id: productId, location: stockLocation, balance: stockNumber });
const balancesRead = z.object({
  careRecipientId: z.uuid(), custody: stockCustodySelection,
  data: z.array(balance), overview: z.array(product), transit: z.array(transitDocument),
  metrics: z.array(metric), updatedAt: instant.nullable(),
});
const movement = z.object({
  id: z.uuid(), product_id: productId, quantity: stockNumber,
  source_location: stockLocation.nullable(), destination_location: stockLocation.nullable(),
  justification: z.string(), created_at: instant,
  reference_type: z.string().nullable(), reference_id: z.uuid().nullable(),
  reference_document_id: z.uuid().nullable().optional(),
});
const historyFilters = z.object({
  productId: z.string().nullable(), location: stockLocation.nullable(),
  from: z.string().nullable(), to: z.string().nullable(),
});
const historyRead = z.object({
  careRecipientId: z.uuid(), data: z.array(movement), balances: z.array(balance),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100), filters: historyFilters,
});
export type StockBalancesRead = z.infer<typeof balancesRead>;
export type StockHistoryRead = z.infer<typeof historyRead>;
export type StockHistoryScope = {
  careRecipientId: string; page: number; pageSize: number;
  productId: string; location: string; from: string; to: string;
};

function unique(values: string[]) {
  return new Set(values).size === values.length;
}
export function parseStockBalances(value: unknown, expected: { careRecipientId: string; custody: string }): StockBalancesRead {
  const parsed = balancesRead.safeParse(value);
  if (!parsed.success) throw new Error("A resposta dos saldos não pôde ser conferida. Atualize os saldos novamente.");
  const result = parsed.data;
  if (result.careRecipientId !== expected.careRecipientId || result.custody !== expected.custody
    || !unique(result.overview.map(row => row.productId)) || !unique(result.transit.map(row => row.id))
    || !unique(result.data.map(row => JSON.stringify([row.product_id, row.location])))
    || !unique(result.metrics.map(row => JSON.stringify([row.productId, row.location])))
    || (result.custody === "TRANSIT" ? result.overview.length > 0 || result.metrics.length > 0 || result.data.length > 0
      : result.transit.length > 0)) {
    throw new Error("A resposta recebida não corresponde à consulta dos saldos. Atualize os saldos novamente.");
  }
  return result;
}
export function parseStockHistory(value: unknown, expected: StockHistoryScope): StockHistoryRead {
  const parsed = historyRead.safeParse(value);
  if (!parsed.success) throw new Error("A resposta do histórico não pôde ser conferida. Atualize o histórico novamente.");
  const result = parsed.data;
  const count = Math.min(result.pageSize, Math.max(0, result.total - (result.page - 1) * result.pageSize));
  if (result.careRecipientId !== expected.careRecipientId || result.page !== expected.page || result.pageSize !== expected.pageSize
    || Object.entries(result.filters).some(([key, field]) => field !== (expected[key as keyof StockHistoryScope] || null))
    || result.data.length !== count || !unique(result.data.map(row => row.id))) {
    throw new Error("A resposta recebida não corresponde à consulta do histórico. Atualize o histórico novamente.");
  }
  return result;
}
