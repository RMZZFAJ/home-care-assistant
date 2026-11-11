import { z } from "zod";

const item = z.object({
  product_id: z.string().min(1), name: z.string(), category: z.string(), unit: z.string(),
  description: z.string().nullable(), aliases: z.array(z.string()), is_active: z.boolean(),
  quantity_decimals: z.number().int().min(0).max(6), sort_order: z.number().int(),
  updated_at: z.iso.datetime({ offset: true }),
}).passthrough();
const workspace = z.object({
  careRecipientId: z.uuid(), total: z.number().int().nonnegative(),
  items: z.array(item.extend({ care_recipient_id: z.uuid() })),
  successors: z.array(z.object({ product_id: z.string(), successor_product_id: z.string() })),
});
export function parseCatalogueWorkspace(value: unknown, patient: string) {
  const parsed = workspace.safeParse(value);
  if (!parsed.success) throw new Error("A leitura completa do catálogo não pôde ser conferida.");
  const result = parsed.data, ids = new Set(result.items.map(row => row.product_id));
  if (result.careRecipientId !== patient || result.items.length !== result.total || ids.size !== result.total
    || result.items.some(row => row.care_recipient_id !== patient)
    || new Set(result.successors.map(row => row.product_id)).size !== result.successors.length
    || result.successors.some(row => row.product_id === row.successor_product_id || !ids.has(row.product_id) || !ids.has(row.successor_product_id)))
    throw new Error("A leitura recebida não corresponde ao catálogo completo deste paciente.");
  return result;
}
const collection = z.object({
  careRecipientId: z.uuid(), total: z.number().int().nonnegative(), includeInactive: z.boolean(),
  data: z.array(item.extend({ id: z.string().min(1) })),
});
export function parseCatalogueCollectionRead(value: unknown, patient: string, includeInactive = true) {
  const parsed = collection.safeParse(value);
  if (!parsed.success) throw new Error("A resposta da consulta do catálogo não pôde ser lida. Atualize esta seção.");
  const result = parsed.data;
  if (result.careRecipientId !== patient || result.includeInactive !== includeInactive
    || result.data.length !== result.total || new Set(result.data.map(row => row.id)).size !== result.total
    || result.data.some(row => row.id !== row.product_id || (!includeInactive && !row.is_active)
      || ("care_recipient_id" in row && row.care_recipient_id !== patient)))
    throw new Error("A resposta recebida não corresponde à consulta completa do catálogo. Atualize esta seção.");
  return result;
}

const profilePage = z.object({
  data: z.array(z.object({ id: z.uuid(), full_name: z.string(), role: z.string(), status: z.string(), global_scope: z.boolean(), created_at: z.iso.datetime({ offset: true }) }).passthrough()),
  total: z.number().int().nonnegative(), profilePage: z.number().int().positive(), pageSize: z.literal(30), query: z.string(),
});
export function parseProfilesPage(value: unknown, page: number, query: string) {
  const parsed = profilePage.safeParse(value);
  if (!parsed.success) throw new Error("A resposta das contas globais não pôde ser lida. Consulte novamente.");
  const result = parsed.data;
  if (result.profilePage !== page || result.query !== query.trim()
    || result.data.length !== Math.min(30, Math.max(0, result.total - (page - 1) * 30))
    || new Set(result.data.map(row => row.id)).size !== result.data.length)
    throw new Error("A resposta recebida não corresponde à página de contas consultada. Consulte novamente.");
  return result;
}
