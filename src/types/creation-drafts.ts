import type {
  StockPreparationContent,
  StockPreparationReceipt,
} from "@/lib/validation/stock-preparations";
import type {
  RequisitionDraftContent,
  BalanceDraftContent,
} from "@/lib/validation/creation-drafts";
import type {
  DraftPurpose,
  ReceiptDraftContent,
  SupplyDraftContent,
  TransferDeclarationDraftContent,
} from "@/lib/validation/supply-drafts";
import type { DraftNavigation } from "@/lib/forms/draft-navigation";
import type {
  BalancePreparationContent,
  BalancePreparationReceipt,
} from "@/lib/validation/balance-preparations";
export type DraftKind = "REQ" | "BAL" | "COM" | "ENT" | "STOCK";
export type CreationDraftContent =
  | RequisitionDraftContent
  | BalanceDraftContent
  | SupplyDraftContent
  | ReceiptDraftContent
  | TransferDeclarationDraftContent
  | BalancePreparationContent
  | StockPreparationContent;
export type CreationDraft = {
  id: string;
  ownerId: string;
  patientId: string;
  kind: DraftKind;
  purpose?: DraftPurpose;
  targetDocumentId: string | null;
  targetResourceId?: string | null;
  schemaVersion: number;
  revision: number;
  state: "active" | "discarded" | "consumed" | "completed";
  createdAt: string;
  savedAt: string;
  contentHash: string;
  content: CreationDraftContent | null;
  navigation?: DraftNavigation | null;
  consumedDocumentId: string | null;
  consumedResourceId?: string | null;
  consumedResult?: BalancePreparationReceipt | StockPreparationReceipt | null;
};
export type CreationDraftResult = Pick<
  CreationDraft,
  "id" | "revision" | "savedAt" | "state" | "consumedDocumentId"
> & {
  replayed: boolean;
  consumedResourceId?: string | null;
  consumedResult?: BalancePreparationReceipt | StockPreparationReceipt | null;
};
