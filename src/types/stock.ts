export type StockCustody = { confirmed: string; incoming: string; minimum: string | null; purchasePending?: string };
export type ProductStock = { productId: string; name: string; unit: string; decimals: number; active: boolean; family: StockCustody | null; team: StockCustody | null; disputed: string };
export type StockMetric = { productId: string; location: string; quantity: string; averagePerDay: string };
export type StockMovement = { id: string; product_id: string; quantity: string; source_location: string | null; destination_location: string | null; justification: string; created_at: string; reference_type: string | null; reference_id: string | null; reference_document_id?:string|null };

export type TransitDocument = {
  id: string;
  code: string;
  status: string;
  source: string;
  destination: string;
  createdAt: string;
  lines: {
    productId: string;
    name: string;
    unit: string;
    dispatched: string;
    accepted: string;
    reconciled: string;
    pending: string;
    disputed: boolean;
  }[];
};
