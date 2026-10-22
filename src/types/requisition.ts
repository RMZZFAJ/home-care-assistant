export type ProductCategory = "medicamentos" | "higiene" | "dieta";
export type RequisitionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "separated"
  | "delivered"
  | "cancelled";

export type CatalogItem = {
  id: string;
  name: string;
  aliases: string[];
  description?: string | null;
  active?: boolean;
  is_active?: boolean;
  sort_order?: number;
  category: ProductCategory;
  unit: string;
  quantity_decimals?: number;
};

export type RequisitionLine = {
  productId: string;
  productName: string;
  category: ProductCategory;
  unit?: string;
  currentStock: number;
  urgent: boolean;
  repeatReason?: string;
};

export type ExtraItem = {
  id: string;
  name: string;
  currentStock: number;
  urgent: boolean;
};

export type RequisitionFormData = {
  lines: RequisitionLine[];
  extraItems: ExtraItem[];
  observations: string[];
};

export type ReceiptLine = Omit<RequisitionLine, "currentStock"> & {
  currentStock: number | null;
};
export type ReceiptExtraItem = Omit<ExtraItem, "currentStock"> & {
  currentStock: number | null;
};

export type RequisitionReceipt = {
  lines: ReceiptLine[];
  extraItems: ReceiptExtraItem[];
  observations: string[];
  requisitionId?: string;
  protocol: string;
  code?: string;
  requesterName: string;
  recipientName: string;
  createdAt: string | null;
  legacyReconstructed?: boolean;
};
