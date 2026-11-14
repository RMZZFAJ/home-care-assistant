import type { ProductPresentation } from "@/types/catalogue";
import type { CatalogueScope } from "@/lib/validation/catalogue-preparation";
import { useScopedRead } from "@/lib/use-scoped-read";
import { cataloguePreparationUrl } from "./use-catalogue-preparation";

export type MeasurementUnit = {
  id: string;
  code: string;
  name: string;
  dimension: string;
  decimals: number;
  care_recipient_id: string | null;
};

export type CatalogueComplementaryReference = {
  hash: string;
  product: { id: string; name: string; unit: string; decimals: number; active: boolean } | null;
  presentation: ProductPresentation | null;
  units: MeasurementUnit[] | null;
};

export function useCatalogueProductReference(scope: CatalogueScope, selection: string, reference: CatalogueComplementaryReference | undefined, attempt: number) {
  const consult = !!reference && (attempt > 0 || (reference.product?.id ?? "") !== selection);
  const current = useScopedRead<CatalogueComplementaryReference>(
    consult ? cataloguePreparationUrl(scope, { selection }) : null, String(attempt));
  return { ...current, reference: consult ? current.data : reference };
}
