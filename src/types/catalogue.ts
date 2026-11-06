export type ProductPresentation = {
  id: string;
  care_recipient_id: string;
  product_id: string;
  barcode: string;
  name: string;
  base_quantity: number | string;
  active: boolean;
  version: number;
  updated_at: string | null;
  updated_by: string | null;
};
export type PresentationSelection = {
  id: string;
  version: number;
  packages: string;
  barcode: string;
  name: string;
  baseQuantity: string;
  unit: string;
};
export type PresentationVersion = {
  version: number;
  recorded_at: string;
  definition: ProductPresentation & {
    unit: string;
    actorName: string | null;
    capturedExisting: boolean;
  };
};
export type PresentationsRead = {
  data: ProductPresentation[];
  versions?: PresentationVersion[];
  versionTotal?: number;
};
