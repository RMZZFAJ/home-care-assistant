import { z } from "zod";
import { pendingPurchaseExtras, type PendingPurchaseExtra } from "./pending-purchase-extras";
import type { SupplyDocument } from "@/types/documents";

const quantity = z.union([z.string().regex(/^\d+(?:\.\d+)?$/), z.number().finite().nonnegative()]);
const confirmed = z.object({
  persistence: z.literal("confirmed"),
  data: z.object({
    id: z.uuid(), care_recipient_id: z.uuid(), type: z.enum(["COM", "ENT", "BAL"]),
    version: z.number().int().positive(), status: z.string().regex(/^[a-z_]{1,40}$/),
    payload: z.record(z.string(), z.unknown()),
    lines: z.array(z.object({
      id: z.uuid(), product_id: z.string(), name_snapshot: z.string(), unit_snapshot: z.string(), quantity,
    }).passthrough()).max(1000),
    events: z.array(z.unknown()),
  }).passthrough(),
});

export function requireSupplyConfirmation(value: unknown, expected: {
  patientId: string; type: SupplyDocument["type"]; id?: string; minimumVersion?: number;
  observations?: string[]; pendingExtras?: PendingPurchaseExtra[];
  acquisitionMode?: "planned";
}): SupplyDocument {
  const parsed = confirmed.safeParse(value);
  if (!parsed.success) throw new Error("A resposta não confirmou a ficha. Recupere a mesma tentativa antes de emitir outra.");
  const row = parsed.data.data;
  if (row.care_recipient_id !== expected.patientId || row.type !== expected.type ||
    expected.id && row.id !== expected.id || row.version < (expected.minimumVersion ?? 1))
    throw new Error("A confirmação não corresponde à ficha e à versão desta tentativa. Recupere o resultado original.");
  if (expected.acquisitionMode === "planned" &&
    (row.payload.acquisitionMode !== expected.acquisitionMode || "origin" in row.payload))
    throw new Error("A confirmação não corresponde ao planejamento desta tentativa. Recupere o resultado original.");
  const extras = pendingPurchaseExtras.safeParse(row.payload.pendingExtras === undefined ? [] : row.payload.pendingExtras);
  if (!extras.success || extras.data.length && row.type !== "COM" || !row.lines.length && !extras.data.length)
    throw new Error("A resposta não confirmou os materiais da ficha. Recupere a mesma tentativa.");
  if (expected.pendingExtras && (expected.pendingExtras.length !== extras.data.length ||
    expected.pendingExtras.some((item, index) => {
      const actual = extras.data[index];
      return item.id !== actual.id || item.name !== actual.name || item.unit !== actual.unit ||
        item.category !== actual.category || item.quantity !== actual.quantity || item.details !== actual.details;
    }))) throw new Error("Os itens extras da ficha não correspondem à tentativa. Recupere o resultado original.");
  const actualObservations = row.payload.observations;
  if (expected.observations && (!Array.isArray(actualObservations) ||
    actualObservations.length !== expected.observations.length ||
    expected.observations.some((observation, index) => observation !== actualObservations[index])))
    throw new Error("As observações da ficha não correspondem à tentativa. Recupere o resultado original.");
  return row as SupplyDocument;
}
