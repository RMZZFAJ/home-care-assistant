export type ProductCategory = "medicamentos" | "higiene" | "dieta";
export type RequisitionStatus = "draft" | "submitted" | "under_review" | "approved" | "separated" | "delivered" | "cancelled";

export type CatalogItem = {
  id: string;
  name: string;
  category: ProductCategory;
  unit: "unidade" | "caixa" | "frasco" | "pacote";
};

export type RequisitionLine = {
  productId: string;
  productName: string;
  category: ProductCategory;
  currentStock: number;
  requestedQuantity: number;
  urgent: boolean;
};

export type ExtraItem = {
  id: string;
  name: string;
  currentStock: number;
  requestedQuantity: number;
  urgent: boolean;
};

export type RequisitionFormData = {
  lines: RequisitionLine[];
  extraItems: ExtraItem[];
  observations: string[];
};

export type RequisitionReceipt = RequisitionFormData & {
  protocol: string;
  requesterName: string;
  recipientName: string;
  createdAt: string;
};
