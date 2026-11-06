import type { SupplyDocument } from "./documents";
import type { ConsumptionReport } from "./consumption";
import type { StockMovement } from "./stock";

export type OriginMovement = StockMovement & { performed_by: string | null };
export type StockOrigin = {
  movement: OriginMovement;
  actor: { name: string | null; source: "current_profile" | "unavailable" };
  material: { name: string | null; unit: string | null };
} & (
  | {
      kind: "document";
      document: SupplyDocument;
      receiptId: string | null;
      regularizationId: string | null;
    }
  | { kind: "consumption"; report: ConsumptionReport }
  | { kind: "manual"; compensates: OriginMovement | null }
  | {
      kind: "inventory";
      inventory: {
        id: string;
        location: string;
        status: string;
        created_at: string;
        counted_at: string | null;
        approved_at: string | null;
        review_reason: string | null;
        stock_inventory_items: {
          id: string;
          product_id: string;
          expected_quantity: string | null;
          counted_quantity: string | null;
          is_counted: boolean;
          justification: string | null;
        }[];
      };
    }
  | { kind: "unavailable"; message: string }
);
