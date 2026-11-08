import type {
  RequisitionDraftContent,
  BalanceDraftContent,
} from "@/lib/validation/creation-drafts";
import type { DraftPurpose,ReceiptDraftContent,SupplyDraftContent } from "@/lib/validation/supply-drafts";
import type { DraftNavigation } from "@/lib/forms/draft-navigation";
export type DraftKind="REQ"|"BAL"|"COM"|"ENT";
export type CreationDraftContent =
  | RequisitionDraftContent
  | BalanceDraftContent
  | SupplyDraftContent
  | ReceiptDraftContent;
export type CreationDraft = {
  id: string;
  ownerId: string;
  patientId: string;
  kind: DraftKind;
  purpose?: DraftPurpose;
  targetDocumentId: string | null;
  schemaVersion: number;
  revision: number;
  state: "active" | "discarded" | "consumed" | "completed";
  createdAt: string;
  savedAt: string;
  contentHash: string;
  content: CreationDraftContent | null;
  navigation?: DraftNavigation | null;
  consumedDocumentId: string | null;
};
export type CreationDraftResult = Pick<
  CreationDraft,
  "id" | "revision" | "savedAt" | "state" | "consumedDocumentId"
> & { replayed: boolean };
