import { z } from "zod";
import { exactQuantity } from "./exact-quantity";

export const purchaseAssociation = z.object({ documentId: z.uuid().toLowerCase(), lineId: z.uuid().toLowerCase() }).strict();
export const purchaseCoverageChoice = purchaseAssociation.extend({ quantity: exactQuantity });
export const purchaseCoverageQuery = z.object({
  careRecipientId: z.uuid(), productId: z.string().min(1).max(120), sourceDocumentId: z.uuid().optional(),
}).strict();

const instant = z.iso.datetime({ offset: true });
export const purchaseCoverageTarget = purchaseAssociation.extend({
  code: z.string(), unit: z.string(), createdAt: instant, openPlanning: exactQuantity, waitingArrival: exactQuantity,
});
export const purchaseCoverageTargets = z.array(purchaseCoverageTarget);
export const purchaseLinkDetails = {
  linkedPurchase: z.object({ documentId: z.uuid(), code: z.string() }).strict().optional(),
  priorPlanning: z.object({ documentId: z.uuid(), code: z.string(), quantity: exactQuantity }).strict().optional(),
};
export type PurchaseCoverageTarget = z.infer<typeof purchaseCoverageTarget>;
export type PurchaseAssociation = z.infer<typeof purchaseAssociation>;
export type PurchaseCoverageChoice = z.infer<typeof purchaseCoverageChoice>;
export type PurchaseCoverageFact = {
  id: string;
  targetDocumentId: string;
  targetCode: string;
  targetLineId: string;
  material: string;
  unit: string;
  sourceDocumentId: string | null;
  sourceCode: string;
  sourceReceiptId: string | null;
  sourceArrivalId: string | null;
  primaryAssociation: boolean;
  planningQuantity: string;
  arrivalQuantity: string;
  recordedAt: string;
};
