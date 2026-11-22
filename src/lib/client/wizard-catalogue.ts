import { z } from "zod";
import { api } from "./api";
import { parseCatalogueCollectionRead } from "@/lib/validation/catalogue-list";

const productDetails = z.object({
  category: z.enum(["medicamentos", "higiene", "dieta"]),
  active: z.boolean().optional(),
  selectionPredecessors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    unit: z.string(),
  })).optional(),
});

export class CatalogueOpeningError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Não foi possível consultar o catálogo.", { cause });
  }
}

export async function readWizardCatalogue(patientId: string, signal: AbortSignal) {
  try {
    const params = new URLSearchParams({ careRecipientId: patientId, includeInactive: "true" });
    const response = await api<unknown>("/api/catalog?" + params, undefined, signal);
    const collection = parseCatalogueCollectionRead(response, patientId);
    const data = collection.data.filter(row => row.is_active).map(row => ({
      ...row,
      ...productDetails.parse(row),
    }));
    return { data, total: collection.total };
  } catch (cause) {
    throw new CatalogueOpeningError(cause);
  }
}
