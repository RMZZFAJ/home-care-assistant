import { z } from "zod";
import { selectionName, selectionProductIds } from "./recurring-selection";

export const householdListKind = z.enum(["REQ", "COM", "ENT"]);
export type HouseholdListKind = z.infer<typeof householdListKind>;
const revision = z.number().int().min(1).max(2147483647);
export const householdListQuery = z.object({
  careRecipientId: z.uuid(), kind: householdListKind,
});
export const householdListCommand = householdListQuery.extend({
  id: z.uuid().nullable(),
  expectedRevision: revision.nullable(),
  idempotencyKey: z.uuid(),
  name: selectionName,
  productIds: selectionProductIds,
}).strict().refine(command => (command.id === null) === (command.expectedRevision === null));
export type HouseholdListCommand = z.infer<typeof householdListCommand>;
const listSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  name: selectionName,
  productIds: selectionProductIds,
  revision,
  updatedAt: z.iso.datetime({ offset: true }),
  updatedBy: z.string(),
}).strict();
export type HouseholdMaterialList = z.infer<typeof listSchema>;
const rowsSchema = z.array(listSchema);
const receipt = z.object({ data: z.object({ list: listSchema, replayed: z.boolean() }).strict() });
export type HouseholdListReceipt = z.infer<typeof receipt>;

export function readHouseholdLists(value: unknown, patientId: string) {
  const rows = rowsSchema.parse(value);
  if (rows.some(row => row.patientId !== patientId) || new Set(rows.map(row => row.id)).size !== rows.length)
    throw new Error("As listas recebidas não correspondem à residência selecionada.");
  return rows;
}

export function householdListConfirmed(value: unknown, command: HouseholdListCommand) {
  const parsed = receipt.safeParse(value);
  if (!parsed.success) return false;
  const { list } = parsed.data.data;
  const ids = new Set(command.productIds);
  return list.patientId === command.careRecipientId && (!command.id || command.id === list.id) &&
    list.revision === (command.expectedRevision ?? 0) + 1 && list.name === command.name &&
    list.productIds.length === ids.size && list.productIds.every(id => ids.has(id));
}
