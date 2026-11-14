import type { DocumentType, PurchaseProgress, PurchaseReceipt, DeliveryCancellationContext, DeliveryRegularizationContext, BalanceReviewFacts } from '@/types/documents';
import type { PdfSourceFacts } from '@/lib/documents/pdf-source-facts';
import type { PdfFidelityFacts } from '@/lib/documents/pdf-fidelity';
import { renderApprovedRequisitionPdf } from './approved-requisition-pdf';
import { ApprovedPdfTextUnsupportedError } from './approved-pdf-layout';
import { renderApprovedSupplyPdf } from './approved-supply-pdf';
import { renderApprovedDeliveryPdf } from './approved-delivery-pdf';
type Person = {
  id?: string;
  name: string;
  registration?: string;
  state?: string;
  category?: string;
};
export type DocumentSnapshot = {
  id: string;
  type: DocumentType;
  code: string;
  protocol: string;
  version: number;
  status: string;
  action?: string;
  actorName?: string;
  createdAt?: string;
  sourceFacts?: unknown;
  lifecycleFacts?: unknown;
  presentationFacts?: unknown;
  documentExpansion?: unknown;
  documentFacts?: unknown;
  balanceApplication?: unknown;
  balanceReviewCorrections?: unknown;
  materialIdentity?: string;
  materialIdentitySource?: string;
  purchaseProgress?: PurchaseProgress;
  purchaseReceipts?: PurchaseReceipt[];
  purchaseEntryBalances?: unknown;
  deliveryCancellation?: DeliveryCancellationContext | null;
  deliveryRegularization?: DeliveryRegularizationContext | null;
  transfer?: Omit<
    import("@/types/transfers").TransferFacts,
    "canAgree" | "canDispatch" | "canWithdraw"
  >;
  balanceReviews?: BalanceReviewFacts;
  fulfillmentReviews?: import("@/types/documents").SupplyDocument["fulfillmentReviews"];
  actors?: { issuer?: Person; recipient?: Person; patient?: Person; };
  lines: Record<string, unknown>[];
  payload: Record<string, unknown>;
  workflow?: Record<string, unknown>;
  attachments?: { filename: string; sha256: string; }[];
  sciencePolicy?: {
    familyAware?: boolean;
    science_satisfied_at?: string;
    policy?: Record<string, unknown>;
    manual_archive_required?: boolean;
    completed_at?: string;
    archived_at?: string;
  };
  scienceEvents?: { actor_name: string; mode: string; created_at: string; }[];
  history?: {
    action: string;
    actorName: string;
    createdAt: string;
    version: number;
  }[];
  fulfillmentLines?: { id: string; attended: boolean; serviceStatus?: "pending" | "partial" | "fulfilled" | "review_required"; }[];
  demo?: boolean;
  isHistorical?: boolean;
};
export function requisitionNextStep(snapshot: DocumentSnapshot) {
  const policy = snapshot.sciencePolicy;
  if (snapshot.isHistorical) return "Preservar o registro histórico";
  if (snapshot.status === "cancelled") return "Documento cancelado";
  if (policy?.archived_at) return "Documento arquivado";
  if (policy?.completed_at) {
    if (policy.manual_archive_required)
      return "Revisão e arquivamento manual pelo administrador";
    return "Aguardar arquivamento ou revisão administrativa";
  }
  if (
    snapshot.fulfillmentLines?.length &&
    snapshot.fulfillmentLines.every((line) => line.attended)
  )
    return "Conferir e conciliar a ENT vinculada";
  return "Providenciar ENT e conferir recebimento";
}
export type PdfEmissionContext = {
  example?: boolean;
  rendererRevision?: number;
  sourceFacts?: PdfSourceFacts;
  fidelityFacts?: PdfFidelityFacts;
  id: string;
  verificationCode: string;
  requestedAt: string;
  requestedName: string;
  representation: "operational" | "derived";
  verificationOrigin: string;
  onText?: (run: {
    page: number;
    text: string;
    x: number;
    baseline: number;
    width: number;
    size: number;
    decoration?: boolean;
    factGroup?: string;
  }) => void;
};
export class PdfTextUnsupportedError extends Error { }
/** The consolidated layout is the sole renderer. Issued bytes remain immutable. */
export async function renderDocumentPdf(snapshot: DocumentSnapshot, _hash: string, emission?: PdfEmissionContext) {
  if (!emission || ![16, 17].includes(emission.rendererRevision ?? 16)) throw new Error('Consolidated document emission required');
  try {
    return (snapshot.type === 'REQ' ? await renderApprovedRequisitionPdf(snapshot, emission) : snapshot.type === 'ENT' ? await renderApprovedDeliveryPdf(snapshot, emission) : await renderApprovedSupplyPdf(snapshot, emission)).bytes;
  } catch (error) {
    if (error instanceof ApprovedPdfTextUnsupportedError) throw new PdfTextUnsupportedError('UNREPRESENTABLE_TEXT');
    throw error;
  }
}
