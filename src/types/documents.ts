export type DocumentType = "REQ" | "COM" | "ENT" | "BAL";
export type SupplyType = Exclude<DocumentType, "REQ">;
export type Custody = "FAMILY" | "CARE_TEAM";
export type Capabilities = Record<string, boolean>;
export type SupplyLine = {
  id: string;
  product_id: string;
  name_snapshot: string;
  unit_snapshot: string;
  category_snapshot: string;
  quantity: string;
  approved_quantity: string;
  purchased_quantity: string;
  accepted_quantity: string;
  reconciled_quantity: string;
  fully_checked: boolean;
  metadata: Record<string, unknown>;
  requisitionItemIds: string[];
};
export type DraftLine = {
  productId: string;
  quantity: string;
  requisitionItemIds?: string[];
  metadata?: Record<string, string>;
};
export type SupplyPayload = {
  lines: DraftLine[];
  notes?: string;
  origin?: "purchase" | "donation";
  source?: Custody;
  destination?: Custody;
  recipientId?: string;
  balanceAssignment?: { id: string; version: number; referenceRevision: string };
  balanceContext?: { cycleId: string; assignmentId: string; professionalId: string; professionalName: string; shiftId: string; shiftType: string; startsAt: string; endsAt: string; timezone: string; countedAt: string; weeks: string[]; kind: string };
};
export type DocumentEvent = {
  id: string;
  version: number;
  action: string;
  actorId: string;
  createdAt: string;
  hash: string;
};
export type PurchaseReceipt = {
  id: string;
  state: "pending" | "approved" | "rejected";
  submitted_by: string;
  lines: { lineId: string; quantity: string }[];
  created_at: string;
};
export type SupplyDocument = {
  id: string;
  care_recipient_id: string;
  type: DocumentType;
  number: number | null;
  code: string | null;
  protocol: string | null;
  status: string;
  created_by: string;
  recipient_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  content_hash: string;
  payload: SupplyPayload;
  workflow_data: Record<string, unknown>;
  canonical_snapshot: Record<string, unknown>;
  lines: SupplyLine[];
  events: DocumentEvent[];
  receipts: PurchaseReceipt[];
  approvals: {
    review_group: string;
    actor_id: string;
    count_version: number;
  }[];
  fullyCheckedLines: number;
  totalLines: number;
};
export type PatientPerson = { id: string; name: string; role: string };
export type ItemContext = {
  productId: string;
  familyStock: string | null;
  pending: {
    requisitionId: string;
    lineId: string;
    code: string;
    createdAt: string;
    status: string;
  }[];
};
export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  unit: string;
  aliases?: string[];
  quantity_decimals?: number;
};
export const documentLabels: Record<DocumentType, string> = {
  REQ: "Requisição",
  COM: "Compra de insumos",
  ENT: "Entrega / Entrada",
  BAL: "Balanço semanal",
};
export const documentStatuses: Record<string, string> = {
  historical: "Registro histórico",
  science_pending: "Ciência familiar pendente",
  awaiting_fulfillment: "Aguardando atendimento",
  fulfillment_partial: "Atendimento parcial",
  completed: "Atendimento concluído",
  completed_science_pending: "Concluída · ciência pendente",
  archived: "Arquivada",
  draft: "Rascunho",
  submitted: "Aguardando revisão",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  partially_approved: "Parcialmente aprovado",
  rejected: "Rejeitado",
  purchasing: "Compra em andamento",
  purchased: "Compra efetivada",
  partially_received: "Recebimento parcial",
  received: "Recebido",
  pending_receipt: "Aguardando recebimento",
  disputed: "Divergência pendente",
  confirmed: "Confirmado",
  cancellation_pending: "Cancelamento aguardando consentimento",
  cancelled: "Cancelado",
  under_review: "Em revisão",
  separated: "Separado",
};

export type DocumentSummary = {
  id: string;
  version: number;
  type: DocumentType;
  fulfillment?: { fulfilled: number; total: number };
  code: string | null;
  protocol: string | null;
  status: string;
  created_at: string;
  recipient_id: string | null;
  document_lines?: {
    id: string;
    fully_checked: boolean;
    accepted_quantity: string;
    quantity: string;
  }[];
};
