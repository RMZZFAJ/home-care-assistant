import type {
  RequisitionDraftContent,
  BalanceDraftContent,
} from "@/lib/validation/creation-drafts";
export type CreationDraftContent =
  | RequisitionDraftContent
  | BalanceDraftContent;
export type CreationDraft = {
  id: string;
  ownerId: string;
  patientId: string;
  kind: "REQ" | "BAL";
  targetDocumentId: string | null;
  schemaVersion: number;
  revision: number;
  state: "active" | "discarded" | "consumed" | "completed";
  createdAt: string;
  savedAt: string;
  contentHash: string;
  content: CreationDraftContent | null;
  consumedDocumentId: string | null;
};
export type CreationDraftResult = Pick<
  CreationDraft,
  "id" | "revision" | "savedAt" | "state" | "consumedDocumentId"
> & { replayed: boolean };
