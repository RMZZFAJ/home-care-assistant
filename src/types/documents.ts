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
  waived_quantity?: string;
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
  recipientReason?: string;
  recipientReference?: string;
  balanceAssignment?: {
    id: string;
    version: number;
    referenceRevision: string;
  };
  balanceContext?: {
    cycleId: string;
    assignmentId: string;
    professionalId: string;
    professionalName: string;
    shiftId: string;
    shiftType: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    countedAt: string;
    weeks: string[];
    kind: string;
  };
};
export type DeliveryPreparation = {
  source: Custody;
  destination: Custody;
  people: { id: string; name: string; role: string }[];
  shifts: {
    id: string;
    professionalId: string;
    professionalName: string;
    version: number;
    startsAt: string;
    endsAt: string;
  }[];
  suggestedId: string | null;
  state: "suggested" | "ambiguous" | "no_schedule" | "no_eligible_recipient";
  referenceHash: string;
  checkedAt: string;
};
export type DeliveryRecipientSelection = {
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  suggestedId: string | null;
  suggestionState: DeliveryPreparation["state"];
  shifts: DeliveryPreparation["shifts"];
  referenceHash: string;
  manual: boolean;
  reason: string | null;
  previousRecipientId: string | null;
  selectedBy: string;
  selectedName: string;
  recordedAt: string;
  official: boolean;
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
  submission_key?: string | null;
  submitted_name?: string | null;
  validated_name?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  reason?: string | null;
};
export type PurchaseProgressLine = {
  lineId: string;
  name: string;
  unit: string;
  plannedQuantity: string | number;
  approvedQuantity: string | number;
  purchasedQuantity: string | number;
  validatedQuantity: string | number;
  pendingValidationQuantity: string | number;
  unarrivedQuantity: string | number;
  waivedQuantity: string | number;
  waivableQuantity: string | number;
  remainingExpectation: string | number;
};
export type PurchaseProgress = {
  state: string;
  expectationClosed: boolean;
  expectationPending: boolean;
  physicalPending: boolean;
  validationPending: boolean;
  lines: PurchaseProgressLine[];
  closure: {
    actorId: string;
    actorName: string | null;
    recordedAt: string;
    reason: string;
    referenceVersion: number;
  } | null;
};
export type DeliveryConsumptionReference = {
  movementId: string;
  reportId: string;
  recordedAt: string;
  quantity: string;
};
export type DeliveryCancellationLine = {
  lineId: string;
  productId: string;
  name: string;
  unit: string;
  acceptedQuantity: string;
  availableConsumedQuantity?: string;
  minimumReturnQuantity?: string;
  quantityDecimals?: number;
  unresolvedTransit?: string;
  sourceReady?: boolean;
  returnQuantity?: string;
  consumedQuantity?: string;
  consumptionReferences: DeliveryConsumptionReference[];
  returnMovementIds?: string[];
};
export type DeliveryCancellationRequest = {
  id: string;
  source: "server_record" | "legacy_event";
  sourceEventId?: string;
  requestedBy: string | null;
  requestedName: string | null;
  requestedAt: string;
  requestedVersion: number;
  previousStatus: string | null;
  reason: string;
  status: "pending" | "consented" | "refused" | "withdrawn";
  outcome?: {
    action: string;
    actorId: string;
    actorName: string | null;
    recordedAt: string;
    reason: string;
    version: number;
    lines: DeliveryCancellationLine[];
  };
};
export type DeliveryCancellationContext = {
  historical?: boolean;
  request: DeliveryCancellationRequest;
  history: DeliveryCancellationRequest[];
  lines: DeliveryCancellationLine[];
  sourceReady: boolean;
  sourceAccess?: boolean;
  unresolvedTransit?: string;
  referenceHash: string | null;
  referenceVersion?: number;
};
export type DeliveryRegularizationLine = {
  lineId: string;
  productId: string;
  name: string;
  unit: string;
  quantityDecimals: number;
  expeditedQuantity: string;
  acceptedQuantity: string;
  priorReconciledQuantity: string;
  pendingQuantity: string;
  receivedQuantity: string;
  returnedQuantity: string;
  missingQuantity: string;
  unknownQuantity: string;
  movementIds?: string[];
};
export type DeliveryRegularizationCase = {
  id: string;
  document_id: string;
  care_recipient_id: string;
  proposed_by: string;
  reviewer_id: string;
  follow_up_owner_id: string | null;
  proposed_at: string;
  reference_version: number;
  state: "pending" | "approved" | "rejected" | "withdrawn" | "obsolete";
  before_snapshot: {
    version: number;
    status: string;
    recipientId: string | null;
    acceptedBy: string | null;
    acceptedAt: string | null;
    receiptName: string | null;
    lines: SupplyLine[];
  };
  proposal: {
    reason: string;
    basis: string;
    lines: DeliveryRegularizationLine[];
    unknownQuantity: string;
    proposedName: string;
    reviewerName: string;
    followUpOwnerName: string | null;
    personalReceipt: false;
  };
  decision: null | {
    action: string;
    actorId: string;
    actorName: string;
    recordedAt: string;
    reason: string;
    version: number;
    lines: DeliveryRegularizationLine[];
  };
  findings: {
    id: string;
    actor_id: string;
    actor_name: string;
    recorded_at: string;
    body: string;
  }[];
};
export type DeliveryRegularizationContext = {
  recipientAvailable: boolean;
  pendingTransit: string;
  sourceReady: boolean;
  sourceLines: {
    lineId: string;
    quantityDecimals: number | null;
    sourceReady: boolean;
  }[];
  cases: DeliveryRegularizationCase[];
  currentId: string | null;
  canPropose: boolean;
  canReview: boolean;
  canApprove: boolean;
  canRecordFinding: boolean;
  canClose: boolean;
  reviewers: PatientPerson[];
  followUpPeople: PatientPerson[];
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
  workflow_data: Record<string, unknown> & {
    recipientSelection?: DeliveryRecipientSelection;
    recipientSelectionHistory?: DeliveryRecipientSelection[];
  };
  canonical_snapshot: Record<string, unknown>;
  lines: SupplyLine[];
  events: DocumentEvent[];
  receipts: PurchaseReceipt[];
  purchaseProgress?: PurchaseProgress;
  deliveryCancellation?: DeliveryCancellationContext | null;
  deliveryRegularization?: DeliveryRegularizationContext | null;
  commandOutcome?: {
    state: "committed" | "recovered";
    action: string;
    eventId?: string;
    version: number;
    requestId: string | null;
  };
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
  closed_below_quantity: "Encerrada com quantidade inferior",
  closed_pending_validation:
    "Expectativa encerrada · parcelas aguardam conferência",
  closed_pending_arrival:
    "Expectativa encerrada · aquisição aguarda chegada válida",
  pending_validation: "Parcela aguardando conferência",
  received: "Recebido",
  pending_receipt: "Aguardando recebimento",
  disputed: "Divergência pendente",
  confirmed: "Confirmado",
  cancellation_pending: "Cancelamento aguardando consentimento",
  cancelled: "Cancelado",
  administratively_closed: "Encerrada administrativamente",
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
  task?: { code: string; label: string } | null;
  document_lines?: {
    id: string;
    fully_checked: boolean;
    accepted_quantity: string;
    quantity: string;
  }[];
};
