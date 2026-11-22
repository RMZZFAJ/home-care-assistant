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
export type CatalogueIdentity = {
  product_id: string;
  name: string;
  unit: string;
  category: string;
  aliases: string[];
  is_active: boolean;
  quantity_decimals: number;
  stock: Record<"FAMILY" | "CARE_TEAM" | "TRANSIT", string | null>;
};
export type CatalogueIdentityEvent = {
  id: string;
  actor_id: string;
  actor_name: string;
  action: "retire" | "reactivate" | "clear_successor";
  reason: string;
  recorded_at: string;
  before_state: {
    source: Omit<CatalogueIdentity, "stock">;
    successor: Omit<CatalogueIdentity, "stock"> | null;
  };
  after_state: {
    source: Omit<CatalogueIdentity, "stock">;
    successor: Omit<CatalogueIdentity, "stock"> | null;
  };
};
export type CatalogueIdentityContext = {
  source: CatalogueIdentity;
  successor: CatalogueIdentity | null;
  guidance: { successor_product_id: string } | null;
  referenceHash: string;
  events: CatalogueIdentityEvent[];
  eventTotal: number;
};
export type CatalogueIdentityResult = {
  result: {
    source: Omit<CatalogueIdentity, "stock">;
    successor: Omit<CatalogueIdentity, "stock"> | null;
    event: CatalogueIdentityEvent;
  };
  replayed: boolean;
};
