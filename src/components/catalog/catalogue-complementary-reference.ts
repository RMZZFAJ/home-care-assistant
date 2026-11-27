import type { ProductPresentation } from "@/types/catalogue";

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
