"use client";
import { IssuanceObservationList } from "@/components/forms/issuance-observations";
import { issuanceObservations } from "@/lib/documents/issuance-observations";
import { useDocumentDecision, DocumentDecisionFailure } from "./use-document-decision";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentSection } from "@/components/ui/model-section";
import { RelatedDocument } from "./related-document";
import { DocumentComplementsPanel } from "@/components/documents/document-complements";
import { DocumentCancellationNotice } from "@/components/documents/document-cancellation-notice";
import { roleLabel } from "@/components/layout/workspace-context";
import { DocumentBreadcrumb } from "@/components/documents/document-breadcrumb";
import { DocumentAccessObservation, DocumentAccessHistory } from "./document-access";
import { DocumentTimeline } from "./document-timeline";
import { DeliveryRecipientFacts } from "./delivery-recipient";
import { DeliveryReassignment, DeliveryReassignmentResult } from "./delivery-reassignment";
import { DeliveryRegularization } from "./delivery-regularization";
import { BalanceReview } from "./balance-review";
import { TransferDetails } from "./transfer-details";
import {
  documentPatientName,
  documentIssuerName,
} from "@/lib/documents/presentation";
import { documentVariant } from "@/lib/documents/variant";
import { IssuedBalanceMaterials } from "@/components/balances/balance-materials";
import { PurchaseMaterials } from "./purchase-materials";
import { PurchaseExtraResolution } from "./purchase-extra-resolution";
import { DeliveryMaterials } from "./delivery-materials";
import { CountedDeliveryReceipt, CountedDeliveryReceiptResult } from "./delivery-receipt";
import { canReconcileFromFamily, DeliveryReconciliation, DeliveryReconciliationResult } from "./delivery-reconciliation";
import { DeliveryTransitCancellation, DeliveryTransitCancellationResult } from "./delivery-transit-cancellation";
import { DeliveryCancellationDecision, DeliveryCancellationStatusDialog, type CancellationAction } from "./delivery-cancellation-decision";
import { DocumentFollowUpActions } from "./document-follow-up-actions";
import { DocumentFab } from "./document-fab";
import { DocumentArchiveActions, DocumentArchiveDialog, type ArchiveDialogMode } from "./document-archive-dialog";
import { activeDocumentArchive, documentArchiveLabel } from "@/lib/documents/document-archive";
import { supplyFollowUpState } from "@/lib/documents/follow-up-lifecycle";
import { cancelledTransitReturn, readCountedDeliveryReceipt, verifyCountedDeliveryReceipt } from "@/lib/documents/delivery-receipt";
import { deliveryTransit } from "@/lib/documents/family-fulfillment";
import { countedDeliveryReceiptBody, deliveryResolutionBody, type CountedDeliveryReceiptBody, type DeliveryResolutionBody } from "@/lib/validation/delivery-receipt";
import {
  DeliveryDispatchFacts,
  DeliveryReceiptReview,
} from "./delivery-receipt-facts";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  Notice,
  primaryClass,
  type WorkspaceContext,
} from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { Attachments } from "./attachments";
import {
  CommandEditor,
  type DocumentAction,
  type OperationReferenceHandle,
} from "./supply-command-editor";
import { DraftReferenceComparison } from "./draft-reference-comparison";
import { ConsentReferenceComparison } from "./consent-reference-comparison";
import type { PatientPerson, PurchaseReceipt, SupplyDocument } from "@/types/documents";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { purchaseCommandBody } from "@/lib/validation/purchase-command";
import { purchaseArrivalBody } from "@/lib/validation/purchase-arrival";
import type { DocumentDecisionIntention } from "@/lib/validation/document-decisions";
import { DocumentHeader, DocumentMoreButton, DocumentMoreLink } from "./document-header";
import { DocumentIssuanceResult } from "./document-issuance-result";
import { FamilyFulfillmentReview } from "./family-fulfillment-review";
import { DocumentFreshness } from "./document-freshness";
import { DocumentFamilyDecisionNotice } from "./document-family-decision-notice";
import { supplyChanges } from "@/lib/documents/document-changes";
import { useDocumentCopy } from "@/lib/documents/use-document-copy";
import {
  DocumentTabs,
  DocumentPanel,
  DocumentAuditAccess,
  useDocumentTabs,
} from "@/components/documents/document-tabs";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentMilestones } from "@/components/documents/document-milestones";
import { DocumentNextStep } from "@/components/documents/document-next-step";
import { supplyMilestones } from "@/lib/documents/milestones";
import { purchaseFollowUp } from "@/lib/documents/purchase-follow-up";
import { balanceFollowUp } from "@/lib/documents/balance-follow-up";
import { deliveryFollowUp } from "@/lib/documents/delivery-follow-up";
import { materialTransferDirection, materialTransferLabel, transferFollowUp } from "@/lib/documents/transfer-follow-up";
import { DocumentProgress } from "./document-progress";
import {
  PurchaseExpectationComparison,
} from "./purchase-details";
import { confirmedPurchase, PurchaseResult, type ConfirmedPurchase } from "./purchase-register";
import { PurchaseArrivalResult } from "./purchase-arrival";
import { PurchaseArrivalCorrections } from "./purchase-arrival-correction";
import { PurchaseArrivalReview, canReviewPurchaseArrivals, type OpenChangedArrivals } from "./purchase-arrival-review";
import { arrivalRefreshRetryLimit, PurchaseArrivalRefreshFailure } from "./purchase-arrival-refresh-failure";
import { useIssuanceOpeningActivity } from "./document-issuance-navigation";
import {
  acquisitionRemaining,
  arrivalRemaining,
  purchaseActivitySteps,
  requirePurchaseArrival,
  requirePurchaseReceipt,
} from "@/lib/documents/purchase";
import {
  DeliveryCancellationDetails,
  DeliveryCancellationComparison,
} from "./delivery-cancellation";

const secondaryDocumentActions = new Set<DocumentAction>([
  "cancel",
  "close_expectation",
  "reassign",
  "divergence",
]);
type SupplyReview = {
  action: string;
  body: unknown;
  summary: string;
  expectedVersion: number;
  draftCommit?: { id: string; revision: number; };
};
type ArrivalReadIntent = { scope: string; attempt: number; retries: number; before: SupplyDocument; failed?: boolean };
type ArrivalReadFailure = { cause: unknown; retries: number; open: boolean };

const supplyCopyIdentity = (value: SupplyDocument) => JSON.stringify([value.version, value.status, value.workflow_data, value.lines, value.receipts, value.deliveryCancellation?.referenceHash, value.balanceReview?.referenceHash]);
export function SupplyDocumentContent({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const liveRevision = useLiveRevision();
  const tabs = useDocumentTabs(can(context, "audit.read"));
  const fabRef = useRef<HTMLButtonElement>(null);
  const reviewControlRef = useRef<(opener: HTMLButtonElement | null) => void>(null);
  const [fileActionTarget, setFileActionTarget] =
    useState<HTMLDivElement | null>(null);
  const editingRef = useRef(false);
  const { data, observedData, setData, acceptRead, stale } = useDocumentCopy<SupplyDocument>(supplyCopyIdentity);
  const [people, setPeople] = useState<PatientPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [coveredRead, setCoveredRead] = useState(true);
  const refreshDisabled = busy || (loading && coveredRead);
  const readScopeRef = useRef("");
  const restoreRefreshFocusRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [readDenied, setReadDenied] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const arrivalReadRef = useRef<ArrivalReadIntent | null>(null);
  const [arrivalReadFailure, setArrivalReadFailure] = useState<ArrivalReadFailure | null>(null);
  const [openRecoveredComparison, setOpenRecoveredComparison] = useState(false);
  const [message, setMessage] = useState("");
  const [purchaseResult, setPurchaseResult] = useState<ConfirmedPurchase | null>(null);
  const [arrivalResult, setArrivalResult] = useState<{ documentId: string; receipt: PurchaseReceipt } | null>(null);
  const [deliveryReceiptResult, setDeliveryReceiptResult] = useState<SupplyDocument | null>(null);
  const [reassignmentResult, setReassignmentResult] = useState<SupplyDocument | null>(null);
  const [transitCancellationResult, setTransitCancellationResult] = useState<SupplyDocument | null>(null);
  const [cancellationStatus, setCancellationStatus] = useState<SupplyDocument | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<{ data: SupplyDocument; body: DeliveryResolutionBody } | null>(null);
  const [purchaseUpdating, setPurchaseUpdating] = useState(false);
  const purchaseReadAttemptRef = useRef<number | null>(null);
  useOperationActivity(purchaseUpdating, { title: "Registrando compra", stage: 2, steps: purchaseActivitySteps });
  const [action, setAction] = useState<DocumentAction | null>(null);
  const registeringPurchase = action === "purchase" && data?.payload.origin !== "donation";
  const registeringArrival = action === "receive" && data?.type === "COM";
  const countingDelivery = action === "receive" && data?.type === "ENT";
  const reassigningDelivery = action === "reassign" && data?.type === "ENT";
  const hasCountedTransit = data?.type === "ENT" && data.status === "disputed" &&
    data.lines.some(line => deliveryTransit(line).gt(0) && readCountedDeliveryReceipt(line.metadata));
  const reconcilingDelivery = action === "resolve" && hasCountedTransit;
  const hasUnreceivedDispatch = data?.type === "ENT" && data.status === "pending_receipt" && !data.workflow_data.acceptedAt;
  const cancellingTransit = action === "cancel" && hasUnreceivedDispatch;
  const hasPersonalReceipt = data?.type === "ENT" && (Boolean(data.workflow_data.acceptedAt) ||
    data.lines.some(line => quantity(line.accepted_quantity).gt(0)));
  const reviewingCancellation = data?.type === "ENT" && (action === "cancel" && hasPersonalReceipt ||
    action === "consent_cancel" || action === "refuse_cancellation" || action === "withdraw_cancellation");
  const coveredOperation = registeringPurchase || registeringArrival || reassigningDelivery;
  const refreshingArrival = loading && coveredRead && data?.type === "COM";
  const activityTitle = refreshingArrival ? "Atualizando chegada" : busy ? "Confirmando a operação" : "Consultando a ficha";
  const openingIssuance = useIssuanceOpeningActivity(id, context.userId, context.patient?.id);
  const activity = (!data && openingIssuance) || { title: activityTitle, detail: "Aguarde a confirmação. Os registros e o preenchimento permanecem preservados." };
  useOperationActivity(loading && coveredRead || (busy && !coveredOperation && !countingDelivery && !reconcilingDelivery && !cancellingTransit && !reviewingCancellation), activity);
  const [review, setReview] = useState<SupplyReview | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [closeUncertain, setCloseUncertain] = useState(false);
  const decision = useDocumentDecision({
    userId: context.userId, documentId: id, domain: "supply", action: review?.action ?? action ?? "none",
    purchaseArrival: registeringArrival, deliveryCancellationRequest: reviewingCancellation && action === "cancel",
  });
  const [purchaseConflict, setPurchaseConflict] = useState(false);
  const [deliveryConflict, setDeliveryConflict] = useState(false);
  const [regularizationEditing, setRegularizationEditing] = useState(false);
  const [balanceReviewEditing, setBalanceReviewEditing] = useState(false);
  const [transferEditing, setTransferEditing] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState<ArchiveDialogMode | null>(null);
  const archiveReviewRef = useRef<HTMLButtonElement>(null);
  const changedArrivalsRef = useRef<OpenChangedArrivals>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  const [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const commandFormRef = useRef<HTMLFormElement | null>(null);
  const referenceAdoptionRef = useRef<OperationReferenceHandle | null>(null);
  const decisionFocusRef = useRef(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const operationOpenerRef = useRef<HTMLButtonElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const patientId = context.patient?.id;
  function startDocumentRead(retries = 0) {
    // Explicit read intent may replace a live background read. Commands and
    // an already covered explicit read still block repeated activation.
    if (refreshDisabled) return;
    if (data?.type === "COM") {
      arrivalReadRef.current = { scope: id + ":" + patientId, attempt: attempt + 1, retries, before: data };
    }
    setArrivalReadFailure(failure => failure ? { ...failure, open: false } : null);
    setOpenRecoveredComparison(false);
    restoreRefreshFocusRef.current = true;
    setCoveredRead(true);
    setLoading(true);
    setAttempt((value) => value + 1);
  }
  function refreshDocument() {
    if (refreshDisabled) return;
    if (arrivalReadFailure) {
      setArrivalReadFailure({ ...arrivalReadFailure, open: true });
    } else {
      startDocumentRead();
    }
  }
  useEffect(() => {
    if (!loading && restoreRefreshFocusRef.current) {
      restoreRefreshFocusRef.current = false;
      if (!arrivalReadFailure?.open && !openRecoveredComparison) refreshButtonRef.current?.focus();
    }
  }, [loading, arrivalReadFailure?.open, openRecoveredComparison]);
  const resultFocusRef = useRef(false);
  useEffect(() => {
    if (decisionFocusRef.current) {
      decisionFocusRef.current = false;
      const target =
        commandFormRef.current?.querySelector<HTMLElement>(
          "input,textarea,select,button",
        ) ??
        headerRef.current
          ?.closest(".hca-record-detail")
          ?.querySelector<HTMLElement>("[data-private-operation-recovery]");
      target?.focus();
    } else if (resultFocusRef.current) {
      resultFocusRef.current = false;
      headerRef.current
        ?.querySelector<HTMLElement>("[data-document-heading]")
        ?.focus();
    }
  }, [data?.version, focusRevision]);
  useEffect(() => {
    editingRef.current = Boolean(
      action ||
      review ||
      uncertain ||
      regularizationEditing ||
      balanceReviewEditing ||
      transferEditing,
    );
  }, [
    action,
    review,
    uncertain,
    regularizationEditing,
    balanceReviewEditing,
    transferEditing,
  ]);
  const pendingRef = useRef<{
    action: string;
    body: unknown;
    expectedVersion: number;
    idempotencyKey: string;
    draftCommit?: { id: string; revision: number; };
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    // Cache Components can resume this route with its previous state. Reconnect
    // the loading state before exposing actions on a document being refreshed.
    const readScope = id + ":" + patientId;
    const changedScope = readScopeRef.current !== readScope;
    readScopeRef.current = readScope;
    const intent = arrivalReadRef.current;
    const arrivalRead = intent?.attempt === attempt && intent.scope === readScope ? intent : null;
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        if (changedScope) {
          setCoveredRead(true);
          setArrivalReadFailure(null);
          setOpenRecoveredComparison(false);
        }
        setLoading(true);
      }
    });
    api<{ data: SupplyDocument; }>(
      "/api/documents/" + id,
      undefined,
      controller.signal,
    )
      .then(async (result) => {
        if (controller.signal.aborted) return;
        setReadDenied(false);
        setReadFailed(false);
        setArrivalReadFailure(null);
        if (arrivalRead) {
          arrivalReadRef.current = null;
          if (arrivalRead.retries > 0 && !arrivalRead.failed && supplyChanges(arrivalRead.before, result.data).length) {
            setOpenRecoveredComparison(true);
          }
        }
        const preserveCopy = editingRef.current || Boolean(arrivalRead && (arrivalRead.retries || arrivalRead.failed));
        acceptRead(result.data, id + ":" + attempt, preserveCopy);
        setError("");
        if (result.data.type !== "COM" && result.data.care_recipient_id === patientId) {
          const directory = await api<{ directory: PatientPerson[]; }>(
            "/api/patient-settings?careRecipientId=" +
            result.data.care_recipient_id,
            undefined,
            controller.signal,
          );
          if (!controller.signal.aborted) setPeople(directory.directory);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setReadFailed(true);
          if (
            reason instanceof ApiError &&
            [401, 403, 404].includes(reason.status)
          ) {
            arrivalReadRef.current = null;
            setArrivalReadFailure(null);
            setOpenRecoveredComparison(false);
            setReadDenied(true);
            setData(null);
          } else if (arrivalRead) {
            if (!arrivalRead.failed) {
              arrivalReadRef.current = { ...arrivalRead, failed: true };
              setArrivalReadFailure({ cause: reason, retries: arrivalRead.retries, open: true });
            }
            return;
          }
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a ficha.",
          );
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setCoveredRead(false);
        setLoading(false);
        if (purchaseReadAttemptRef.current !== null && attempt >= purchaseReadAttemptRef.current) {
          purchaseReadAttemptRef.current = null;
          setPurchaseUpdating(false);
        }
      });
    return () => controller.abort();
  }, [id, patientId, attempt, liveRevision, acceptRead, setData]);
  async function execute(nextReview = review) {
    if (!data) return;
    if (!pendingRef.current && nextReview)
      pendingRef.current = {
        action: nextReview.action,
        body: nextReview.body,
        expectedVersion: nextReview.expectedVersion,
        idempotencyKey: crypto.randomUUID(),
        ...(nextReview.draftCommit ? { draftCommit: nextReview.draftCommit } : {}),
      };
    const checking = uncertain || decision.uncertain;
    if (!pendingRef.current && !checking) return;
    setBusy(true);
    setError("");
    const initialIntention = pendingRef.current;
    try {
      const verify = (row: Record<string, unknown>, accepted: DocumentDecisionIntention, key: string) => {
        const read = requireSupplyConfirmation({ data: row, persistence: "confirmed" }, {
          patientId: data.care_recipient_id, type: data.type, id, minimumVersion: accepted.expectedVersion,
        });
        if (accepted.action === "purchase") {
          const { lines } = purchaseCommandBody.parse(accepted.body);
          requirePurchaseArrival(read, lines);
        }
        if (accepted.action === "receive" && read.type === "COM") {
          requirePurchaseReceipt(read, purchaseArrivalBody.parse(accepted.body).lines, key);
        }
        if (accepted.action === "receive" && read.type === "ENT" && "countedReceipt" in accepted.body) {
          verifyCountedDeliveryReceipt(read, countedDeliveryReceiptBody.parse(accepted.body), accepted.expectedVersion, context.userId);
        }
        if (accepted.action === "reassign") {
          const selection = read.workflow_data.recipientSelection;
          const event = read.events.find(item => item.version === accepted.expectedVersion + 1 && item.actorId === context.userId && item.action === "ent.reassign");
          if (read.type !== "ENT" || !event || !selection || selection.recipientId !== accepted.body.recipientId ||
            selection.reason !== accepted.body.reason || selection.selectedBy !== context.userId ||
            read.recipient_id !== accepted.body.recipientId)
            throw new Error("Não foi possível verificar a troca de recebedor.");
        }
        if (accepted.action === "resolve" && read.type === "ENT" && reconcilingDelivery) {
          const body = deliveryResolutionBody.parse(accepted.body);
          const event = read.events.find(item => item.version === accepted.expectedVersion + 1 && item.actorId === context.userId && item.action === "ent.resolve");
          const assessment = !body.familyAssessment || read.fulfillmentReviews?.some(item => item.lineId === body.lineId &&
            item.expectedVersion === accepted.expectedVersion && item.actorId === context.userId && item.decision === body.familyAssessment && item.reason === body.reason);
          if (!event || !assessment) throw new Error("Não foi possível verificar a conciliação deste material.");
        }
        if (accepted.action === "cancel" && accepted.body.transitReturned === true) {
          const event = read.events.find(item => item.version === accepted.expectedVersion + 1 && item.actorId === context.userId && item.action === "ent.cancel");
          if (read.type !== "ENT" || read.status !== "cancelled" || !event ||
            read.lines.some(line => deliveryTransit(line).gt(0)) ||
            !read.lines.some(line => typeof line.metadata.cancelledTransitReturn === "string"))
            throw new Error("Não foi possível verificar o cancelamento e o retorno dos materiais.");
        }
        if (reviewingCancellation && read.type === "ENT") {
          const request = read.deliveryCancellation?.request;
          const expectedStatus = { cancel: "pending", consent_cancel: "consented", refuse_cancellation: "refused", withdraw_cancellation: "withdrawn" }[accepted.action as CancellationAction];
          const event = read.events.find(item => item.version === accepted.expectedVersion + 1 && item.actorId === context.userId && item.action === "ent." + accepted.action);
          if (!request || request.status !== expectedStatus || !event ||
            (accepted.action === "cancel" ? request.reason !== accepted.body.reason || request.requestedBy !== context.userId : request.id !== accepted.body.requestId || request.outcome?.reason !== accepted.body.reason))
            throw new Error("Não foi possível verificar a decisão deste pedido.");
        }
      };
      const outcome = checking ? await decision.checkPrevious(verify) : initialIntention && await decision.execute({
        domain: "supply", action: initialIntention.action, body: initialIntention.body as Record<string, unknown>, expectedVersion: initialIntention.expectedVersion,
      }, verify);
      if (!outcome) return;
      if (outcome.state === "not_applied") {
        pendingRef.current = null; setUncertain(false); setReview(null);
        setError("A conferência confirmou que nada foi alterado. Seus campos continuam nesta tela para tentar novamente. Se persistir, procure a supervisão."); return;
      }
      const intention = { ...outcome.intention, idempotencyKey: outcome.key };
      const result = { data: requireSupplyConfirmation({ data: outcome.result, persistence: "confirmed" }, {
        patientId: data.care_recipient_id, type: data.type, id, minimumVersion: intention.expectedVersion,
      }) };
      resultFocusRef.current = true;
      setFocusRevision((value) => value + 1);
      if (result.data.version >= data.version) { setData(result.data); setReadFailed(false); }
      setAttempt(value => value + 1);
      pendingRef.current = null;
      setUncertain(false);
      setReview(null);
      setAction(null);
      setPurchaseConflict(false);
      setDeliveryConflict(false);
      setComparison(null);
      if (result.data.type === "ENT" && intention.action === "reassign") {
        setMessage("");
        setReassignmentResult(result.data);
        return;
      }
      if (result.data.type === "ENT" && intention.action === "receive" && countedDeliveryReceiptBody.safeParse(intention.body).success) {
        setMessage("");
        setDeliveryReceiptResult(result.data);
        return;
      }
      if (reconcilingDelivery && intention.action === "resolve") {
        setMessage("");
        setReconciliationResult({ data: result.data, body: deliveryResolutionBody.parse(intention.body) });
        return;
      }
      if (intention.action === "cancel" && intention.body.transitReturned === true) {
        setMessage("");
        setTransitCancellationResult(result.data);
        return;
      }
      if (reviewingCancellation && result.data.deliveryCancellation) {
        tabs.select("workflow");
        setCancellationStatus(result.data);
        return;
      }
      if (intention.action === "purchase" && result.data.payload.origin !== "donation") {
        const { lines } = purchaseCommandBody.parse(intention.body);
        setMessage("");
        purchaseReadAttemptRef.current = attempt + 1;
        setPurchaseUpdating(true);
        setPurchaseResult(confirmedPurchase(result.data, lines, requirePurchaseArrival(result.data, lines)));
        return;
      }
      const receipt = result.data.receipts.find(receipt => receipt.submission_key === intention.idempotencyKey);
      const zeroArrival = receipt?.l2_arrival && receipt.lines.every(line => quantity(line.quantity).eq(0));
      if (result.data.type === "COM" && intention.action === "receive" && receipt &&
        (receipt.state === "approved" || receipt.state === "pending")) {
        setArrivalResult({ documentId: id, receipt });
      }
      const purchaseMessages: Record<string, string> = {
        approve:
          "Decisão de aprovação registrada. Quantidades adquiridas e recebidas não mudaram.",
        purchase: "Aquisição registrada. A chegada terá seu próprio registro.",
        receive:
          receipt?.state === "approved" && zeroArrival
            ? "Conferência registrada sem movimentação de estoque."
            : receipt?.state === "approved"
              ? "Chegada registrada e validada. As quantidades desta parcela foram incorporadas ao estoque familiar."
            : receipt?.state === "pending"
              ? "Chegada registrada e aguardando conferência. Nenhuma quantidade desta parcela foi incorporada ao estoque."
              : "Chegada registrada. Consulte a parcela e seu estado de conferência.",
        close_expectation:
          "Expectativa restante encerrada, sem entrada ou baixa de material." +
          (result.data.purchaseProgress?.physicalPending
            ? " Parcelas que ainda aguardam chegada válida ou conferência continuam pendentes."
            : " As quantidades efetivamente validadas foram preservadas."),
        submit:
          "COM emitida. A emissão não comprova aquisição, chegada ou entrada no estoque.",
        cancel:
          "Ficha cancelada com histórico preservado, sem entrada ou baixa de material.",
      };
      const cancellationMessages: Record<string, string> = {
        cancel:
          result.data.status === "cancellation_pending"
            ? "Pedido de cancelamento registrado, sem estorno. O recebedor decide pessoalmente; o solicitante pode retirar o pedido."
            : "Cancelamento registrado. Confira a situação física e as movimentações preservadas na ficha.",
        consent_cancel:
          "Cancelamento consentido. Devoluções reais registradas e consumo confirmado referenciado na conciliação.",
        refuse_cancellation:
          "Pedido de cancelamento recusado, sem movimento de estoque. A ficha retoma a conferência vigente.",
        withdraw_cancellation:
          "Pedido de cancelamento retirado, sem movimento de estoque. A ficha retoma a conferência vigente.",
      };
      setMessage(
        result.data.type === "COM"
          ? (purchaseMessages[intention.action] ??
            "Decisão registrada na ficha.")
          : result.data.type === "ENT" &&
            result.data.commandOutcome?.state === "recovered"
            ? "Resultado anterior recuperado. Consulte o pedido correspondente no histórico da ficha."
            : result.data.type === "ENT" &&
              cancellationMessages[intention.action]
              ? cancellationMessages[intention.action]
              : "Operação confirmada e registrada na ficha. Consulte os eventos e as notificações para acompanhar o processamento.",
      );
    } catch (reason) {
      const failure = reason instanceof DocumentDecisionFailure ? reason : null;
      const cause = failure?.cause ?? reason;
      const rejected = failure?.outcome === "not_applied" || cause instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(cause.status);
      if (rejected) {
        if (
          data.type === "COM" &&
          cause instanceof ApiError &&
          cause.status === 409
        )
          setPurchaseConflict(true);
        if (
          data.type === "ENT" &&
          cause instanceof ApiError &&
          cause.status === 409
        )
          setDeliveryConflict(true);
        if (
          data.type === "ENT" &&
          (initialIntention?.action ?? action) === "consent_cancel" &&
          cause instanceof ApiError &&
          cause.status === 403
        )
          setDeliveryConflict(true);
        pendingRef.current = null;
        setReview(null);
      }
      setUncertain(failure ? failure.outcome === "uncertain" : uncertain || !rejected);
      setError(
        reason instanceof Error
          ? reason.message
          : "O resultado precisa ser confirmado.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function comparePurchaseVersion() {
    if (data?.type === "ENT" && action === "consent_cancel")
      setComparison(null);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ data: SupplyDocument; }>(
        "/api/documents/" + id,
      );
      setComparison(data ? requireSupplyConfirmation({ data: result.data, persistence: "confirmed" }, {
        id: data.id, patientId: data.care_recipient_id, type: data.type, minimumVersion: data.version,
      }) : null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar a versão atual.",
      );
    } finally {
      setBusy(false);
    }
  }
  const [accessRevision, setAccessRevision] = useState("initial");
  const activeContext = data?.care_recipient_id === context.patient?.id;
  const pendingCorrections = data?.type === "COM" ? data.receipts.filter(receipt => receipt.state === "correction_requested") : [];
  const purchaseStep = data?.type === "COM" ? purchaseFollowUp({
    status: data.status, origin: data.payload.origin, progress: data.purchaseProgress,
    arrivalCorrection: pendingCorrections.length ? pendingCorrections.some(receipt =>
      receipt.submitted_by === context.userId && activeContext && can(context, "com.receive")) ? "author" : "waiting" : undefined,
  }) : null;
  const deliveryStep = data?.type === "ENT"
    ? data.transfer ? transferFollowUp(data) : deliveryFollowUp(data,
      materialTransferDirection(data.payload.source, data.payload.destination) === "return" ? "return" : "delivery") : null;
  const balanceStep = data?.type === "BAL" ? balanceFollowUp(data) : null;
  const followUpStep = purchaseStep ?? deliveryStep ?? balanceStep;
  const operationOpen = Boolean(action || review || uncertain || regularizationEditing || balanceReviewEditing || transferEditing);
  const archive = activeDocumentArchive(data?.workflow_data.documentArchive);
  const archived = Boolean(archive);
  const copyChanges = data && observedData ? supplyChanges(data, observedData) : [];
  const changedArrivalIds = new Set(copyChanges.flatMap(change => change.arrivalId ? [change.arrivalId] : []));
  const reviewableChangedArrivals = observedData?.type === "COM" && activeContext && !archived
    && !activeDocumentArchive(observedData.workflow_data.documentArchive) && canReviewPurchaseArrivals(context)
    ? observedData.receipts.filter(receipt => receipt.state === "pending" &&
      receipt.submitted_by !== context.userId && changedArrivalIds.has(receipt.id)).map(receipt => receipt.id)
    : [];
  const allowed = (cap: string) => Boolean(activeContext && !archived && can(context, cap));
  const followUpState = data && supplyFollowUpState(data.status, data.workflow_data.documentFollowUp);
  const followUpTerminal = followUpState === "completed" || data?.status === "cancelled" && followUpState !== "reopened";
  const purchaseIdentificationPending = data?.type === "COM" && data.purchaseProgress?.identificationPending === true;
  const patientAdmin = Boolean(activeContext && context.patient?.role === "admin" && can(context, "access.manage"));
  const canReviewCompletion = Boolean(activeContext && !archived && data?.protocol && data.type !== "BAL"
    && !purchaseIdentificationPending
    && !followUpTerminal && data.status !== "rejected" && data.status !== "administratively_closed"
    && (patientAdmin || (data.type === "COM" ? allowed("com.approve")
      : data.recipient_id === context.userId && allowed("ent.receive") || data.created_by === context.userId && allowed("ent.create"))));
  const progressAllowed = allowed("document.progress.create");
  const canPrepareDelivery = data?.type === "COM" && allowed("ent.create")
    && data.lines.some(line => quantity(line.accepted_quantity).gt(0));
  const actions: DocumentAction[] = [];
  if (
    data &&
    !["cancelled", "rejected"].includes(data.status) &&
    activeContext && !archived
  ) {
    if (
      data.status === "draft" &&
      allowed(
        data.type === "BAL" ? "bal.count" : data.type.toLowerCase() + ".create",
      )
    )
      actions.push("submit");
    else if (data.type === "COM") {
      if (data.status === "pending_approval" && allowed("com.approve") && data.lines.length)
        actions.push("approve");
      if (
        [
          "approved",
          "partially_approved",
          "purchasing",
          "partially_received",
        ].includes(data.status) &&
        allowed("com.purchase") &&
        data.lines.some((line) => acquisitionRemaining(line).gt(0))
      )
        actions.push("purchase");
      if (
        ["purchased", "purchasing", "partially_received"].includes(
          data.status,
        ) &&
        allowed("com.receive") &&
        data.lines.some((line) => arrivalRemaining(line, data).gt(0))
      )
        actions.push("receive");
      if (
        data.purchaseProgress?.expectationPending &&
        !purchaseIdentificationPending &&
        !data.purchaseProgress.expectationClosed &&
        allowed("com.close_expectation")
      )
        actions.push("close_expectation");
    } else if (data.type === "ENT") {
      if (
        data.status === "pending_receipt" &&
        data.recipient_id === context.userId &&
        allowed("ent.receive")
      )
        actions.push("receive", "divergence");
      if (
        hasUnreceivedDispatch &&
        !hasPersonalReceipt &&
        (!data.transfer || data.kind !== "DEV" && data.transfer.declaration.mode === "direct") &&
        allowed("ent.create") &&
        (data.created_by === context.userId || allowed("access.manage"))
      )
        actions.push("reassign");
      if (
        (((data.status === "disputed" || data.status === "cancellation_pending") &&
          data.lines.some((line) => quantity(line.quantity).minus(line.accepted_quantity).minus(line.reconciled_quantity).gt(0))) ||
          (data.status === "disputed" && data.lines.some(line => line.metadata.issueOpen && !readCountedDeliveryReceipt(line.metadata)))) &&
        data.deliveryRegularization?.recipientAvailable !== false &&
        ((data.recipient_id === context.userId && allowed("ent.receive")) || allowed("access.manage") ||
          (hasCountedTransit && canReconcileFromFamily(data, context)))
      )
        actions.push("resolve");
      if (
        data.status === "cancellation_pending" &&
        data.recipient_id === context.userId &&
        allowed("ent.receive")
      ) {
        if (data.deliveryCancellation?.request.status === "pending") actions.push("consent_cancel");
      }
      if (
        data.status === "cancellation_pending" &&
        data.deliveryCancellation?.request.requestedBy === context.userId &&
        allowed("ent.cancel")
      )
        actions.push("withdraw_cancellation");
    }
    if (
      (!data.transfer || data.transfer.state === "dispatched") &&
      !["cancellation_pending", "administratively_closed"].includes(
        data.status,
      ) &&
      (data.type === "ENT"
        ? allowed("ent.cancel") ||
        (data.created_by === context.userId && !data.workflow_data.acceptedAt &&
          !data.lines.some((line) => quantity(line.accepted_quantity).gt(0)))
        : data.type === "COM"
          ? allowed("com.approve") &&
          !data.lines.some((line) =>
            quantity(line.purchased_quantity).gt(0),
          ) &&
          !data.receipts.length &&
          !data.purchaseProgress?.expectationClosed
          : data.status !== "approved" &&
          !data.payload.balanceContext &&
          allowed("access.manage"))
    )
      actions.push("cancel");
  }
  function adoptDeliveryComparison() {
    if (!comparison) return;
    const pending = comparison.status === "cancellation_pending";
    decisionFocusRef.current = pending;
    resultFocusRef.current = !pending;
    setData(comparison);
    setComparison(null);
    setDeliveryConflict(false);
    setReview(null);
    setError("");
    if (reviewingCancellation) {
      const canReviewRequestAgain = action === "cancel" && hasPersonalReceipt && ["confirmed", "disputed"].includes(comparison.status);
      if (!canReviewRequestAgain && (!pending || data?.deliveryCancellation?.request.id !== comparison.deliveryCancellation?.request.id)) {
        setAction(null);
        if (comparison.deliveryCancellation) setCancellationStatus(comparison);
      }
    } else if (!pending) setAction(null);
    setFocusRevision((value) => value + 1);
    setMessage(
      pending || (action === "cancel" && reviewingCancellation && ["confirmed", "disputed"].includes(comparison.status))
        ? "Referência atual carregada. Confira os valores preservados e prepare uma nova revisão antes de decidir."
        : "Resultado atual carregado. O primeiro ato e sua autoria permanecem preservados.",
    );
  }
  function adoptReconciliationComparison() {
    if (!comparison) return;
    const stillDisputed = comparison.status === "disputed" &&
      comparison.lines.some(line => deliveryTransit(line).gt(0) && readCountedDeliveryReceipt(line.metadata));
    setData(comparison);
    setComparison(null);
    setDeliveryConflict(false);
    setError("");
    setReview(null);
    if (!stillDisputed) setAction(null);
  }
  function renderDeliveryComparison(ready: boolean) {
    if (!data || !comparison) return null;
    return (
      <>
        {ready ? (
          <DeliveryCancellationComparison
            original={
              comparison.deliveryCancellation?.sourceAccess === false &&
                data.deliveryCancellation
                ? {
                  ...data,
                  deliveryCancellation: {
                    ...data.deliveryCancellation,
                    lines: [],
                  },
                }
                : data
            }
            current={comparison}
          />
        ) : null}
        <button
          type="button"
          className={primaryClass}
          disabled={busy || !ready}
          onClick={adoptDeliveryComparison}
        >
          {comparison.status === "cancellation_pending"
            ? "Usar referência atual e revisar novamente"
            : "Mostrar resultado atual do pedido"}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => void comparePurchaseVersion()}
        >
          Consultar pedido e referências atuais novamente
        </button>
      </>
    );
  }
  const operationalMenu = Boolean(data?.protocol && !followUpTerminal && data.status !== "rejected" && activeContext && !archived);
  const fabActions: DocumentAction[] = operationalMenu
    ? actions.filter(item => item === "purchase" || item === "receive" || item === "reassign")
    : [];
  const prepareReturn = operationalMenu && data?.type === "ENT" && data.kind !== "DEV"
    && allowed("ent.create") && allowed("stock.team.read");

  function renderAction(item: DocumentAction, inFab = false) {
    if (!data) return null;
    const menuAction = inFab || secondaryDocumentActions.has(item);
    const Action = menuAction ? DocumentMoreButton : "button";
    return (
      <Action
        key={item}
        {...(menuAction ? { icon: item === "cancel" ? "close" as const : item === "reassign" ? "user" as const : item === "purchase" ? "box" as const : item === "receive" && data.type === "COM" ? "truck" as const : "check" as const, danger: item === "cancel" } : {})}
        className={item === "receive" ? primaryClass : buttonClass}
        // Opening an editor has no official effect. A background read must not
        // disable a retained opener between pointerdown and pointerup. Existing
        // version/identity checks still authorize and validate confirmation.
        disabled={busy || uncertain}
        onClick={(event) => {
          operationOpenerRef.current = inFab ? fabRef.current : menuAction ? moreTriggerRef.current : event.currentTarget;
          if (item === "reassign" || (item === "receive" && data.type === "ENT") || (item === "resolve" && hasCountedTransit) ||
            (item === "cancel" && (hasUnreceivedDispatch || hasPersonalReceipt)) || item === "consent_cancel" || item === "withdraw_cancellation") {
            setError("");
            setReview(null);
            setAction(item);
            return;
          }
          decisionFocusRef.current = true;
          setFocusRevision((value) => value + 1);
          tabs.select("workflow");
          setAction(item);
          setReview(null);
          if (item === "purchase" || (item === "receive" && data.type === "COM")) setError("");
        }}
      >
        {data.type === "COM" && item === "receive"
          ? inFab ? "Registrar chegada" : "Informar nova chegada"
          : item === "receive"
            ? "Conferir recebimento"
          : item === "purchase"
            ? data.payload.origin === "donation" ? "Registrar aquisição" : inFab ? "Registrar compra realizada" : actionLabels[item]
            : item === "cancel" && hasUnreceivedDispatch ? "Cancelar ficha" : actionLabels[item]}
      </Action>
    );
  }
  const purchaseConflictPanel = purchaseConflict && data?.type === "COM" ? (
    <section className="ui-card space-y-3">
      <Notice error>
        A COM mudou desde o resumo que você revisou. Seus campos permanecem
        preservados; consulte a versão atual antes de preparar outra
        confirmação.
      </Notice>
      {comparison ? (
        <>
          <PurchaseExpectationComparison
            original={data}
            current={comparison}
          />
          <DraftReferenceComparison
            id={data.id}
            fromVersion={data.version}
            toVersion={comparison.version}
          >
            {(ready) => (
              <button
                type="button"
                className={primaryClass}
                disabled={busy || !ready || !comparison.purchaseProgress}
                onClick={() => {
                  if (
                    action === "close_expectation" &&
                    !referenceAdoptionRef.current?.adoptClosingReference(
                      comparison,
                    )
                  ) {
                    setError(
                      "Não foi possível atualizar a referência do preenchimento. Consulte as versões novamente.",
                    );
                    return;
                  }
                  decisionFocusRef.current = true;
                  setData(comparison);
                  setComparison(null);
                  setPurchaseConflict(false);
                  setReview(null);
                  setMessage(
                    "Versão atual carregada. Confira os valores preservados e prepare uma nova revisão. O encerramento exige nova concordância com o resumo.",
                  );
                }}
              >
                Usar versão atual e revisar novamente
              </button>
            )}
          </DraftReferenceComparison>
        </>
      ) : (
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => void comparePurchaseVersion()}
        >
          Consultar versão atual da COM
        </button>
      )}
    </section>
  ) : null;
  if (!data && loading) return null;
  return (
    <div className="hca-record-detail doc-page">
      {data?.code && context.patient?.id === data.care_recipient_id && (data.type === "COM" || data.type === "ENT") ? (
        <DocumentIssuanceResult id={id} userId={context.userId} patientId={data.care_recipient_id} patientName={context.patient.display_name}
          code={data.code} kind={data.kind === "DEV" || data.code.startsWith("DEV-") ? "DEV" : data.type}
          donation={data.type === "COM" && data.payload.origin === "donation"} />
      ) : null}
      {data?.type === "COM" && arrivalReadFailure ? (
        <PurchaseArrivalRefreshFailure key={arrivalReadFailure.retries} cause={arrivalReadFailure.cause} retries={arrivalReadFailure.retries}
          open={arrivalReadFailure.open} returnFocus={refreshButtonRef}
          onClose={() => setArrivalReadFailure({ ...arrivalReadFailure, open: false })}
          onRetry={() => {
            if (arrivalReadFailure.retries < arrivalRefreshRetryLimit) startDocumentRead(arrivalReadFailure.retries + 1);
          }} />
      ) : null}
      {data ? (
        <DocumentBreadcrumb
          code={
            data.code ??
            (data.transfer ? "Declaração sem expedição" : "Rascunho")
          }
        />
      ) : (
        <div className="space-y-3">
          <h1>Acompanhamento da ficha</h1>
          <button
            type="button"
            className={buttonClass}
            disabled={refreshDisabled}
            onClick={refreshDocument}
            ref={refreshButtonRef}
          >
            Atualizar ficha
          </button>
        </div>
      )}
      <span role="status" className="sr-only">
        {loading && data ? "Atualizando consulta da ficha…" : ""}
      </span>
      {decision.recoveryMessage ? <Notice>{decision.recoveryMessage}</Notice> : null}
      {error && !countingDelivery && !reconcilingDelivery && !cancellingTransit && !reviewingCancellation ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {!coveredOperation ? purchaseConflictPanel : null}
      {deliveryConflict && data?.type === "ENT" && !countingDelivery && !reconcilingDelivery && !cancellingTransit && !reviewingCancellation ? (
        <section className="ui-card space-y-3">
          <Notice error>
            O pedido, a versão ou as referências da conciliação mudaram. Seus
            campos continuam preservados para comparação.
          </Notice>
          {comparison ? (
            action === "consent_cancel" &&
              comparison.status === "cancellation_pending" ? (
              <ConsentReferenceComparison
                expected={{
                  id: data.id,
                  patientId: data.care_recipient_id,
                  version: comparison.version,
                  requestId: comparison.deliveryCancellation?.request.id,
                  referenceHash: comparison.deliveryCancellation?.referenceHash,
                  lineIds: Array.isArray(comparison.lines)
                    ? comparison.lines.map((line) => line.id)
                    : [],
                }}
              >
                {(ready) => renderDeliveryComparison(ready)}
              </ConsentReferenceComparison>
            ) : (
              renderDeliveryComparison(
                Boolean(
                  comparison.id === data.id &&
                  comparison.care_recipient_id === data.care_recipient_id &&
                  comparison.type === "ENT" &&
                  comparison.version,
                ),
              )
            )
          ) : (
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void comparePurchaseVersion()}
            >
              Consultar pedido e referências atuais
            </button>
          )}
        </section>
      ) : null}
      {uncertain ? (
        <Notice>
          Esta tentativa está preservada.{" "}
          <button
            className={primaryClass}
            disabled={busy}
            onClick={() => void execute()}
          >
            Recuperar operação
          </button>
        </Notice>
      ) : null}
      {data ? (
        <>
          <DocumentHeader
            headingLevel={1}
            fileActionRef={setFileActionTarget}
            contextLabel={roleLabel(context.patient?.role)}
            onRefresh={refreshDocument}
            refreshButtonRef={refreshButtonRef}
            refreshDisabled={refreshDisabled}
            refreshing={loading}
            metadata={[
              {
                label: "Registrada por",
                value: documentIssuerName(data.canonical_snapshot),
              },
              { label: "Materiais", value: data.lines.length + " itens" },
            ]}
            milestones={<DocumentMilestones items={supplyMilestones(data)} />}
            showFiles={false}
            updateNotice={<>
              {observedData ? <DocumentFreshness code={data.code ?? data.type}
                changes={copyChanges} loading={refreshDisabled} editing={operationOpen} onRefresh={refreshDocument}
                openedAfterRecovery={openRecoveredComparison} onCloseRecovery={() => setOpenRecoveredComparison(false)}
                onReviewArrival={reviewableChangedArrivals.length ? opener => changedArrivalsRef.current?.(
                  reviewableChangedArrivals, () => opener?.isConnected ? opener : refreshButtonRef.current,
                ) : undefined} /> : null}
              {data.kind === "ENT" && data.protocol && activeContext && context.activeContext?.mode === "patient" && can(context, "ent.read") ? <DocumentFamilyDecisionNotice
                key={context.userId + ":" + id} id={id} patientId={data.care_recipient_id} userId={context.userId}
                code={data.code ?? data.type} revision={liveRevision + attempt} blocked={operationOpen || Boolean(archiveDialog)} returnFocus={refreshButtonRef} /> : null}
            </>}
            nextStep={
              archived ? <Notice>A ficha arquivada está disponível para consulta e download.</Notice> : followUpStep && loading ? null : followUpStep && (readFailed || operationOpen) ? (
                <Notice>
                  {operationOpen
                    ? "Sua operação está preservada na versão de trabalho. Conclua ou feche a operação para consultar a próxima providência atual."
                    : "O acompanhamento atual não foi confirmado. Atualize a ficha para consultar a próxima providência."}
                  {" "}Os dados preservados não representam uma nova confirmação.
                </Notice>
              ) : <DocumentNextStep
                label={
                  followUpStep
                    ? followUpStep.label
                    : data.type === "BAL"
                      ? "Contagem e revisão"
                      : "Atendimento e decisões"
                }
                heading={followUpStep?.heading}
                description={followUpStep?.description}
                pending={followUpStep?.pending ?? (
                  data.status === "draft" ||
                  data.status === "pending_receipt" ||
                  data.status === "disputed" ||
                  data.status === "cancellation_pending" ||
                  Boolean(
                    data.purchaseProgress?.expectationPending ||
                    data.purchaseProgress?.physicalPending ||
                    data.purchaseProgress?.validationPending,
                  ) ||
                  Boolean(
                    data.balanceReview?.reviewRequired &&
                    data.status !== "approved",
                  ) ||
                  Boolean(
                    data.balanceRecount?.activeAssignment ||
                    data.balanceRecount?.requiresDesignation,
                  )
                )}
                onOpen={() => tabs.select(followUpStep?.section ?? "workflow", Boolean(followUpStep))}
              />
            }
            actions={
              <>
                {activeContext &&
                  data.status === "draft" &&
                  allowed(
                    data.type === "BAL"
                      ? "bal.count"
                      : data.type.toLowerCase() + ".create",
                  ) ? (
                  <Link
                    className={primaryClass}
                    href={
                      "/fichas/" +
                      data.type.toLowerCase() +
                      "?documentId=" +
                      data.id
                    }
                  >
                    Editar rascunho
                  </Link>
                ) : null}
                {activeContext &&
                  data.type === "BAL" &&
                  data.status === "submitted" &&
                  allowed("bal.count") &&
                  !data.payload.balanceContext &&
                  !data.balanceRecount?.hasRecountCycle ? (
                  <Link
                    className={buttonClass}
                    href={"/fichas/bal?documentId=" + data.id + "&recount=true"}
                  >
                    Recontar com nova referência de estoque
                  </Link>
                ) : null}
                {actions
                  .filter((item) => !secondaryDocumentActions.has(item) && !fabActions.includes(item))
                  .map(item => renderAction(item))}
                {followUpTerminal && progressAllowed && tabs.value !== "progress" ? <ActionButton onClick={() => tabs.select("progress", true)}><Icon name="plus" />Novo andamento</ActionButton> : null}
                {archive ? <DocumentArchiveActions archive={archive} reviewRef={archiveReviewRef} onReview={patientAdmin ? () => setArchiveDialog("review") : undefined} /> : null}
                {activeContext && !archived && data.protocol && data.type !== "BAL" ? <DocumentFollowUpActions
                  id={data.id} patientId={data.care_recipient_id} kind={data.type === "COM" ? "COM" : data.kind === "DEV" ? "DEV" : "ENT"}
                  code={data.code ?? data.protocol} patientName={documentPatientName(data.canonical_snapshot, context.patient?.display_name ?? "Paciente identificado na ficha")}
                  userId={context.userId} actor={context.fullName}
                  canReopen={followUpTerminal && patientAdmin}
                  canComplete={canReviewCompletion} reviewControl={reviewControlRef}
                  cancelled={data.status === "cancelled" && followUpState !== "completed"}
                  disabled={busy || operationOpen} onUpdated={() => setAttempt(value => value + 1)}
                  onShowMaterials={() => tabs.select("materials")}
                  onCompleteAndArchive={patientAdmin && !followUpTerminal && !purchaseIdentificationPending ? () => setArchiveDialog("archive") : undefined}
                  preservedFacts={data.type === "ENT" ? data.lines.map(line => {
                    const returned = data.deliveryCancellation?.lines.find(result => result.lineId === line.id);
                    return <article key={line.id} className="hca-receipt-line">
                      <h3>{line.name_snapshot}</h3>
                      <DefinitionGrid className="hca-cancellation-quantities" items={[
                        { label: "Recebimento registrado", value: data.workflow_data.acceptedAt ? formatQuantity(line.accepted_quantity, line.unit_snapshot) : "Sem conferência registrada" },
                        { label: "Consumo confirmado", value: formatQuantity(returned?.consumedQuantity, line.unit_snapshot) },
                        { label: "Retorno registrado", value: formatQuantity(returned?.returnQuantity ?? cancelledTransitReturn(line.metadata), line.unit_snapshot) },
                      ]} />
                    </article>;
                  }) : <p>Compras e entradas físicas anteriores permanecem registradas.</p>} /> : null}
                {activeContext && !archived && data.type === "COM" ? <PurchaseArrivalReview context={context} documentId={data.id} changedArrivalsRef={changedArrivalsRef}
                  hasPending={data.receipts.some(receipt => receipt.state === "pending" && receipt.submitted_by !== context.userId)}
                  onReviewed={async () => {
                    const current = await api<{ data: SupplyDocument }>("/api/documents/" + data.id);
                    const updated = requireSupplyConfirmation({ data: current.data, persistence: "confirmed" }, {
                      id: data.id, patientId: data.care_recipient_id, type: "COM", minimumVersion: data.version,
                    });
                    setData(previous => previous?.id === updated.id && previous.version <= updated.version ? updated : previous);
                  }} /> : null}
                {canPrepareDelivery && !operationalMenu ? (
                  <Link className={buttonClass} href={`/fichas/ent?purchaseId=${data.id}`}>Preparar entrega</Link>
                ) : null}
              </>
            }
            secondaryActions={
              <>
                {canReviewCompletion ? <DocumentMoreButton
                  icon="check" disabled={busy || operationOpen} onClick={() => reviewControlRef.current?.(moreTriggerRef.current)}
                >Revisar conclusão</DocumentMoreButton> : null}
                {data.type === "BAL" && data.payload.balanceContext ? (
                  <DocumentMoreLink
                    icon="calendar" href="/balancos"
                    className={buttonClass}
                    prefetch={false}
                  >
                    Acompanhar plantão, revisão e reconto
                  </DocumentMoreLink>
                ) : null}

                {actions
                  .filter((item) => secondaryDocumentActions.has(item) && !fabActions.includes(item))
                  .map(item => renderAction(item))}
                {patientAdmin && !archived && followUpTerminal && data.protocol && data.type !== "BAL" ? <DocumentMoreButton
                  icon="archive" disabled={busy || operationOpen} onClick={() => setArchiveDialog("archive")}>Arquivar ficha</DocumentMoreButton> : null}
              </>
            }
            moreTriggerRef={moreTriggerRef}
            observedRef={headerRef}
            id={data.id}
            type={data.type}
            typeLabel={
              data.type === "COM"
                ? data.payload.origin === "donation"
                  ? "Doação de insumos"
                  : data.payload.origin === "purchase"
                    ? "Compra de insumos"
                    : data.payload.acquisitionMode === "planned" ? "Planejamento de aquisição" : "Compra ou doação de insumos"
                : data.transfer
                  ? materialTransferLabel(data.transfer.declaration.source, data.transfer.declaration.destination)
                  : data.type === "ENT"
                    ? documentVariant(data.type, data.payload, data.workflow_data)
                    : data.type === "BAL"
                      ? documentVariant(data.type, data.payload, data.workflow_data)
                      : undefined
            }
            code={
              data.code ??
              (data.transfer ? "Declaração sem expedição" : "Rascunho")
            }
            unissuedLabel={
              data.transfer
                ? "Declaração sem expedição; o protocolo ENT será atribuído ao expedir."
                : undefined
            }
            status={
              archived ? "archived" : data.type === "COM"
                ? (data.purchaseProgress?.state ?? data.status)
                : data.status
            }
            statusLabel={archive ? documentArchiveLabel(archive) : followUpState === "reopened" ? "Acompanhamento reaberto" : followUpState === "completed" ? "Acompanhamento concluído" : followUpStep?.statusLabel}
            protocol={data.protocol}
            version={data.version}
            createdAt={data.created_at}
            patientName={documentPatientName(
              data.canonical_snapshot,
              context.patient?.display_name ??
              "Paciente identificado no documento",
            )}
          >
            {data.type === "COM" && data.payload.acquisitionMode !== "planned" ? (
              <p className="mt-3 text-sm">
                Origem:{" "}
                {data.payload.origin === "donation"
                  ? "Doação"
                  : data.payload.origin === "purchase"
                    ? "Compra"
                    : "Não informada no registro"}
              </p>
            ) : null}
            {data.type === "ENT" ? (
              <div className="mt-4 space-y-2">
                <p className="font-semibold">
                  {data.fullyCheckedLines}/{data.totalLines} linhas
                  integralmente conferidas
                </p>
                <p className="text-sm text-(--muted)">
                  {data.payload.source === "FAMILY"
                    ? "Família → Equipe"
                    : "Equipe → Família"}{" "}
                  · Destinatário:{" "}
                  {data.workflow_data.recipientSelection?.recipientName ??
                    people.find((person) => person.id === data.recipient_id)
                      ?.name ??
                    "Pessoa designada no documento"}
                </p>
                <p className="text-xs text-(--muted)">
                  {data.transfer && data.transfer.state !== "dispatched"
                    ? "Esta preparação ainda não expediu materiais. Concordância, expedição e recebimento são atos separados; não há entrada no destino nesta preparação."
                    : data.status === "cancelled"
                      ? "Os fatos anteriores permanecem preservados. Consulte as devoluções e o consumo efetivamente conciliados, quando existentes."
                      : data.status === "administratively_closed"
                        ? "O aceite pessoal, quando existente, permanece preservado. O dossiê distingue os efeitos administrativos comprovados da parcela física ainda desconhecida."
                        : data.status === "confirmed"
                          ? "Conferência encerrada. Consulte as quantidades aceitas e os atos próprios de conciliação; devolução e falta não são recebimento."
                          : "Quantidades aceitas já integram o saldo confirmado do destino. Divergências seguem pendentes até conciliação formal."}
                </p>
              </div>
            ) : null}
            {!activeContext ? (
              <Notice>
                Selecione o paciente desta ficha no cabeçalho para
                disponibilizar as ações autorizadas.
              </Notice>
            ) : null}
            {data.type === "REQ" ? (
              <Link className={primaryClass} href={"/historico/" + data.id}>
                Abrir requisição
              </Link>
            ) : null}
          </DocumentHeader>
          {operationalMenu && (fabActions.length > 0 || canPrepareDelivery || prepareReturn || progressAllowed) ? <DocumentFab triggerRef={fabRef}>
            {fabActions.map(item => renderAction(item, true))}
            {canPrepareDelivery ? <DocumentMoreLink icon="truck" href={`/fichas/ent?purchaseId=${data.id}`}>Preparar entrega</DocumentMoreLink> : null}
            {prepareReturn ? <DocumentMoreLink icon="undo"
              href={`/fichas/devolucao?careRecipientId=${data.care_recipient_id}${data.lines.some(line => quantity(line.accepted_quantity ?? 0).gt(0)) ? "&originId=" + data.id : ""}`}>
              Preparar devolução
            </DocumentMoreLink> : null}
            {progressAllowed ? <DocumentMoreButton icon="plus" onClick={() => tabs.select("progress", true)}>Novo andamento</DocumentMoreButton> : null}
          </DocumentFab> : null}
          {archiveDialog && patientAdmin ? <DocumentArchiveDialog key={`${context.userId}:${id}:${archiveDialog}`} id={id} patientId={data.care_recipient_id}
            code={data.code ?? data.protocol ?? data.type} patientName={documentPatientName(data.canonical_snapshot, context.patient?.display_name ?? "Paciente identificado na ficha")}
            actor={context.fullName} userId={context.userId} initial={archiveDialog} finalFocus={archiveDialog === "review" ? archiveReviewRef : moreTriggerRef}
            onClose={() => setArchiveDialog(null)} onUpdated={() => setAttempt(value => value + 1)} /> : null}
          {data.status === "cancelled" && data.protocol ? <DocumentCancellationNotice key={`${context.userId}:${id}`} document={data} userId={context.userId} activeContext={Boolean(activeContext && !archived)} onRecorded={() => setAttempt(value => value + 1)} /> : null}
          <DocumentTabs
            rootRef={tabs.rootRef}
            type={data.type}
            value={tabs.value}
            onSelect={tabs.select}
            auditAllowed={can(context, "audit.read")}
          >
            <DocumentPanel value="progress">
              <DocumentProgress
                code={data.code ?? data.protocol ?? "Rascunho"}
                id={id}
                type={data.type}
                patientId={data.care_recipient_id}
                context={context}
                readOnly={archived}
              />
            </DocumentPanel>
            <DocumentPanel value="overview">
              <div className="doc-main-column">
                <DocumentSection title="Observações da emissão" icon="file"><IssuanceObservationList observations={issuanceObservations(data.payload)} /><div className="doc-author-line"><span className="doc-avatar" aria-hidden="true">{documentIssuerName(data.canonical_snapshot).split(" ").slice(0,2).map(part => part[0]).join("")}</span><span><strong>{documentIssuerName(data.canonical_snapshot)}</strong><small>{formatBrazilDate(data.created_at)}</small></span></div></DocumentSection>
              {data.protocol ? <DocumentComplementsPanel key={`${context.userId}:${id}`} documentId={id} version={data.version} userId={context.userId} activeContext={Boolean(activeContext && !archived)} onRecorded={() => setAttempt(value => value + 1)} /> : null}
              </div>
            </DocumentPanel>
            <DocumentPanel value="materials">
              {data.originDocuments?.length ? <section className="hca-form-stack" aria-label="Fichas de origem">
                <h3>Fichas de origem</h3>
                {data.originDocuments.map((origin) => <RelatedDocument
                  key={origin.documentId} id={origin.documentId} type={origin.type} label={origin.code} />)}
              </section> : null}
              {data.type === "ENT" ? <FamilyFulfillmentReview data={data} context={context} readOnly={archived} onReviewed={() => setAttempt(value => value + 1)} /> : null}
              <section className="hca-materials-section">
                {data.type === "COM" ? <>
                  <PurchaseExtraResolution key={data.id} data={data}
                    mayIdentify={Boolean(activeContext && !archived &&
                      ["pending_approval", "approved", "partially_approved", "purchasing", "purchased", "partially_received"].includes(data.status) &&
                      allowed("com.approve") && allowed("catalog.manage"))}
                    onUpdated={document => {
                      const updated = requireSupplyConfirmation({ data: document, persistence: "confirmed" }, {
                        id: data.id, patientId: data.care_recipient_id, type: "COM", minimumVersion: data.version + 1,
                      });
                      setData(current => current?.id === updated.id && current.version <= updated.version ? updated : current);
                    }} />
                  {data.lines.length || !purchaseIdentificationPending
                    ? <PurchaseMaterials data={data} active={tabs.value === "materials"} /> : null}
                </> : data.type === "ENT" ? <DeliveryMaterials data={data} active={tabs.value === "materials"} />
                  : <IssuedBalanceMaterials data={data} active={tabs.value === "materials"} />}
                {data.payload.notes ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm">
                    {data.payload.notes}
                  </p>
                ) : null}
              </section>

              {data.type === "ENT" && data.protocol ? (
                <section className="ui-card">
                  <DeliveryDispatchFacts data={data} />
                </section>
              ) : null}
              {data.transfer ? (
                <TransferDetails
                  data={data}
                  context={context}
                  onUpdated={setData}
                  onEditingChange={setTransferEditing}
                />
              ) : null}
              {data.type === "ENT" && data.workflow_data.recipientSelection ? (
                <section className="ui-card space-y-4">
                  <DeliveryRecipientFacts
                    selection={data.workflow_data.recipientSelection}
                  />
                  {data.workflow_data.recipientSelectionHistory?.length ? (
                    <details>
                      <summary>Indicações anteriores preservadas</summary>
                      <div className="mt-3 space-y-4">
                        {data.workflow_data.recipientSelectionHistory.map(
                          (selection) => (
                            <DeliveryRecipientFacts
                              key={
                                selection.recordedAt +
                                ":" +
                                selection.recipientId
                              }
                              selection={selection}
                            />
                          ),
                        )}
                      </div>
                    </details>
                  ) : null}
                </section>
              ) : null}
              {data.type === "ENT" ? (
                <DeliveryRegularization
                  data={data}
                  context={context}
                  readOnly={archived}
                  onEditingChange={setRegularizationEditing}
                  onUpdated={setData}
                />
              ) : null}
              {data.type === "ENT" && data.deliveryCancellation ? (
                <DeliveryCancellationDetails
                  onInspect={() => setCancellationStatus(data)}
                  sourceChecking={
                    action === "consent_cancel" &&
                    (deliveryConflict || busy || uncertain)
                  }
                  context={
                    action === "consent_cancel" &&
                      (deliveryConflict || busy || uncertain)
                      ? {
                        ...data.deliveryCancellation,
                        lines: [],
                        sourceReady: false,
                        sourceAccess: undefined,
                        referenceHash: null,
                      }
                      : data.deliveryCancellation
                  }
                  onRefresh={() => {
                    if (editingRef.current) {
                      setDeliveryConflict(true);
                      setComparison(null);
                      void comparePurchaseVersion();
                    } else setAttempt((value) => value + 1);
                  }}
                />
              ) : null}
              {data.type === "COM" ? (
                <PurchaseArrivalCorrections key={`${data.id}:${context.userId}:${context.patient?.id}`} data={data} context={context} readOnly={archived}
                  onUpdated={updated => { setData(updated); setAttempt(value => value + 1); }} />
              ) : null}
              {data.type === "BAL" && data.status !== "draft" ? (
                <BalanceReview
                  data={data}
                  context={context}
                  onRefresh={() => setAttempt(value => value + 1)}
                  onEditingChange={setBalanceReviewEditing}
                />
              ) : null}
              {data.type === "BAL" && data.payload.balanceContext ? (
                <section className="ui-card">
                  <h2>Plantão e contagem física</h2>
                  <strong>
                    {data.payload.balanceContext.professionalName} ·{" "}
                    {data.payload.balanceContext.shiftType}
                  </strong>
                  <p>
                    {formatBrazilDate(data.payload.balanceContext.startsAt)} →{" "}
                    {formatBrazilDate(data.payload.balanceContext.endsAt)}
                  </p>
                  <p>
                    Contagem atual:{" "}
                    {formatBrazilDate(data.payload.balanceContext.countedAt)}
                  </p>
                  <p>
                    Semanas vinculadas:{" "}
                    {data.payload.balanceContext.weeks
                      .map((week) => week.split("-").reverse().join("/"))
                      .join(", ")}
                  </p>
                  <p className="hca-muted">
                    Semanas anteriores são regularizadas pela contagem atual,
                    preservando seus prazos e atrasos históricos.
                  </p>
                  {data.status === "draft" ? (
                    <Notice>
                      Rascunho: a obrigação ainda não foi concluída.
                    </Notice>
                  ) : null}
                </section>
              ) : null}
              {!countingDelivery && !reassigningDelivery && !reconcilingDelivery && !cancellingTransit && !reviewingCancellation && (actions.length || action) ? (
                <section className="ui-card">
                  <h2>
                    {action && !actions.includes(action)
                      ? "Seu preenchimento preservado"
                      : "Próxima ação"}
                  </h2>
                  {action ? (
                    <CommandEditor
                      key={data.id + action}
                      referenceAdoptionRef={referenceAdoptionRef}
                      recoveryOnly={!actions.includes(action)}
                      action={action}
                      purchaseFeedback={error}
                      purchaseConflictContent={purchaseConflictPanel}
                      confirmationPending={busy || uncertain}
                      data={data}
                      context={context}
                      formRef={commandFormRef}
                      reviewDisabled={
                        busy ||
                        uncertain ||
                        purchaseConflict ||
                        deliveryConflict
                      }
                      onCancel={() => {
                        setAction(null);
                        setPurchaseConflict(false);
                        setDeliveryConflict(false);
                        setComparison(null);
                        setAttempt((value) => value + 1);
                        const opener = operationOpenerRef.current;
                        if (
                          opener?.isConnected &&
                          opener.getClientRects().length &&
                          !opener.matches(":disabled")
                        )
                          opener.focus();
                        else moreTriggerRef.current?.focus();
                      }}
                      onReview={(
                        command,
                        body,
                        summary,
                        draftCommit,
                        expectedVersion,
                      ) => {
                        const next = {
                          action: command,
                          body,
                          summary,
                          expectedVersion: expectedVersion ?? data.version,
                          ...(draftCommit ? { draftCommit } : {}),
                        };
                        setReview(next);
                        if (coveredOperation) void execute(next);
                      }}
                    />
                  ) : null}
                  {!action ? (
                    <p className="hca-field-help">
                      Escolha uma ação autorizada no cabeçalho. Consultar as
                      etapas não confirma operações.
                    </p>
                  ) : null}
                </section>
              ) : null}
            </DocumentPanel>
            <DocumentPanel value="communications">
              <DocumentDeliveryStatus id={data.id} version={data.version} />
            </DocumentPanel>
            <DocumentPanel value="files">
              {data.protocol ? (
                <DocumentActions
                  generationBlocked={stale || Boolean(arrivalReadFailure)}
                  readOnly={archived}
                  actionTarget={fileActionTarget}
                  onAction={() => tabs.select("files")}
                  id={id}
                  code={data.code ?? "Ficha"}
                  version={data.version}
                />
              ) : (
                <Notice>
                  Esta declaração ou rascunho ainda não tem emissão documental
                  definitiva.
                </Notice>
              )}
            </DocumentPanel>
            <DocumentPanel value="attachments">
              <Attachments
                patientId={data.care_recipient_id}
                documentId={data.id}
                writable={
                  activeContext && !archived &&
                  (data.created_by === context.userId ||
                    data.recipient_id === context.userId ||
                    allowed("access.manage"))
                }
                onChange={() => setAttempt((value) => value + 1)}
              />
            </DocumentPanel>
            <DocumentPanel value="history">
              {data?.protocol && activeContext ? <DocumentAccessObservation key={`${context.userId}:${data.id}:${data.version}`} id={data.id} version={data.version} onRecorded={setAccessRevision} /> : null}
              <DocumentAccessHistory id={id} refreshKey={`${data.version}:${accessRevision}`} authorized={can(context, "document.access.read")} />
              <DocumentTimeline
                id={id}
                version={data.version}
                events={data.events}
                title="Versões e integridade"
              />
            </DocumentPanel>
            {can(context, "audit.read") ? (
              <DocumentPanel value="audit">
                <DocumentAuditAccess patientId={data.care_recipient_id} />
              </DocumentPanel>
            ) : null}
          </DocumentTabs>
        </>
      ) : null}
      {data && reassigningDelivery && !readDenied && activeContext ? <DeliveryReassignment
        key={data.id}
        data={data} patientName={context.patient?.display_name ?? "Paciente identificado na ficha"}
        latestVersion={observedData?.version ?? data.version}
        busy={busy || decision.busy} blocked={!actions.includes("reassign")}
        uncertain={uncertain || decision.uncertain} conflict={deliveryConflict} error={error || decision.recoveryMessage}
        opener={operationOpenerRef}
        onSubmit={(body, expectedVersion) => {
          const next = { action: "reassign", body, summary: "", expectedVersion };
          setReview(next);
          void execute(next);
        }}
        onRefresh={() => { setError(""); setDeliveryConflict(false); }}
        onRecover={() => void execute()}
        onClose={() => {
          pendingRef.current = null;
          setUncertain(false);
          setAction(null);
          setReview(null);
          setError("");
          setDeliveryConflict(false);
          setAttempt(value => value + 1);
        }} /> : null}
      {reassignmentResult?.id === id && !readDenied && activeContext ? <DeliveryReassignmentResult
        data={reassignmentResult} onClose={() => {
          setReassignmentResult(null);
          resultFocusRef.current = true;
          setFocusRevision(value => value + 1);
        }} /> : null}
      {data && countingDelivery && !readDenied ? <CountedDeliveryReceipt
        key={data.id}
        data={data} context={context} sender={data.transfer?.declaration.actor.name ?? documentIssuerName(data.canonical_snapshot)}
        review={review ? review.body as CountedDeliveryReceiptBody : null}
        busy={busy || decision.busy} blocked={deliveryConflict || !actions.includes("receive")} uncertain={uncertain || decision.uncertain}
        error={error || decision.recoveryMessage}
        finalFocus={operationOpenerRef}
        conflict={deliveryConflict ? <Notice>
          A ficha mudou durante a conferência.
          {comparison ? <><p>Versão atual {comparison.version} · {comparison.lines.length} materiais.</p>
            <ActionButton disabled={busy} onClick={adoptDeliveryComparison}>Usar versão atual e revisar novamente</ActionButton></>
            : <ActionButton disabled={busy} onClick={() => void comparePurchaseVersion()}>Consultar versão atual</ActionButton>}
        </Notice> : !actions.includes("receive") ? <Notice>O recebimento desta ficha está indisponível para este acesso.</Notice> : null}
        onReview={(body, different) => {
          const next = { action: "receive", body, summary: "", expectedVersion: data.version };
          setError("");
          setReview(next);
          if (!different) void execute(next);
        }}
        onEdit={() => setReview(null)} onConfirm={() => void execute()} onCloseUncertain={() => setCloseUncertain(true)}
        onClose={() => {
          setAction(null);
          setReview(null);
          setError("");
          setDeliveryConflict(false);
          setComparison(null);
          setAttempt(value => value + 1);
        }} /> : null}
      {deliveryReceiptResult?.id === id && !readDenied && activeContext ? <CountedDeliveryReceiptResult
        data={deliveryReceiptResult} onClose={() => {
          setDeliveryReceiptResult(null);
          resultFocusRef.current = true;
          setFocusRevision(value => value + 1);
        }} /> : null}
      {data && reconcilingDelivery && !readDenied ? <DeliveryReconciliation
        key={data.id}
        data={data} context={context}
        busy={busy || decision.busy} blocked={deliveryConflict || !actions.includes("resolve")} uncertain={uncertain || decision.uncertain}
        error={error || decision.recoveryMessage} finalFocus={operationOpenerRef}
        conflict={deliveryConflict ? <Notice>
          A ficha mudou durante a conciliação.
          {comparison ? <ActionButton disabled={busy} onClick={adoptReconciliationComparison}>Usar versão atual e revisar novamente</ActionButton> :
            <ActionButton disabled={busy} onClick={() => void comparePurchaseVersion()}>Consultar versão atual</ActionButton>}
        </Notice> : !actions.includes("resolve") ? <Notice>A conciliação está indisponível para este acesso.</Notice> : null}
        onSubmit={body => {
          const next = { action: "resolve", body, summary: "", expectedVersion: data.version };
          setReview(next);
          void execute(next);
        }}
        onRecover={() => void execute()}
        onClose={() => {
          if (uncertain || decision.uncertain) { setCloseUncertain(true); return; }
          setAction(null);
          setReview(null);
          setError("");
          setDeliveryConflict(false);
          setComparison(null);
          setAttempt(value => value + 1);
        }} /> : null}
      {reconciliationResult?.data.id === id && !readDenied && activeContext ? <DeliveryReconciliationResult
        {...reconciliationResult} onClose={() => {
          setReconciliationResult(null);
          resultFocusRef.current = true;
          setFocusRevision(value => value + 1);
        }} /> : null}
      {data && cancellingTransit && !readDenied ? <DeliveryTransitCancellation
        key={data.id}
        data={data} patientName={context.patient?.display_name ?? "Paciente identificado na ficha"} actor={context.fullName}
        busy={busy || decision.busy} blocked={deliveryConflict || !actions.includes("cancel")}
        uncertain={uncertain || decision.uncertain} error={error || decision.recoveryMessage}
        finalFocus={operationOpenerRef}
        conflict={deliveryConflict ? <Notice>
          A ficha mudou durante a revisão. Confira a situação atual antes de cancelar.
          {comparison ? <ActionButton disabled={busy} onClick={() => {
            setData(comparison);
            setComparison(null);
            setDeliveryConflict(false);
            setReview(null);
            setError("");
            if (comparison.status !== "pending_receipt" || comparison.workflow_data.acceptedAt) setAction(null);
          }}>Usar versão atual</ActionButton> :
            <ActionButton disabled={busy} onClick={() => void comparePurchaseVersion()}>Consultar versão atual</ActionButton>}
        </Notice> : null}
        onSubmit={body => {
          const next = { action: "cancel", body, summary: "", expectedVersion: data.version };
          setReview(next);
          void execute(next);
        }}
        onRecover={() => void execute()}
        onClose={() => {
          setAction(null);
          setReview(null);
          setError("");
          setDeliveryConflict(false);
          setComparison(null);
          setAttempt(value => value + 1);
        }}
        onCloseUncertain={() => setCloseUncertain(true)} /> : null}
      {transitCancellationResult?.id === id && !readDenied && activeContext ? <DeliveryTransitCancellationResult
        data={transitCancellationResult} onClose={() => {
          setTransitCancellationResult(null);
          resultFocusRef.current = true;
          setFocusRevision(value => value + 1);
        }} /> : null}
      {data && reviewingCancellation && !readDenied ? <DeliveryCancellationDecision
        key={data.id}
        data={data} action={action as CancellationAction}
        patientName={context.patient?.display_name ?? "Paciente identificado na ficha"} actor={context.fullName}
        busy={busy || decision.busy} blocked={deliveryConflict || !actions.includes(action === "refuse_cancellation" ? "consent_cancel" : action!)}
        uncertain={uncertain || decision.uncertain} error={error || decision.recoveryMessage}
        finalFocus={operationOpenerRef}
        conflict={deliveryConflict ? <Notice>
          O pedido, a versão ou as referências da conciliação mudaram. Seus campos permanecem nesta revisão.
          {comparison ? action === "consent_cancel" && comparison.status === "cancellation_pending" ? <ConsentReferenceComparison
            expected={{
              id: data.id, patientId: data.care_recipient_id, version: comparison.version,
              requestId: comparison.deliveryCancellation?.request.id, referenceHash: comparison.deliveryCancellation?.referenceHash,
              lineIds: comparison.lines.map(line => line.id),
            }}>
            {renderDeliveryComparison}
          </ConsentReferenceComparison> : renderDeliveryComparison(comparison.id === data.id && comparison.care_recipient_id === data.care_recipient_id)
            : <ActionButton onClick={() => void comparePurchaseVersion()}>Consultar pedido e referências atuais</ActionButton>}
        </Notice> : null}
        focusRevision={focusRevision}
        onAction={next => { setAction(next); setReview(null); setError(""); }}
        onCompare={() => { setDeliveryConflict(true); void comparePurchaseVersion(); }}
        onSubmit={body => {
          const next = { action: action!, body, summary: "", expectedVersion: data.version };
          setReview(next);
          void execute(next);
        }}
        onRecover={() => void execute()}
        onClose={() => {
          setAction(null);
          setReview(null);
          setError("");
          setDeliveryConflict(false);
          setComparison(null);
          setAttempt(value => value + 1);
        }}
        onCloseUncertain={() => setCloseUncertain(true)} /> : null}
      {cancellationStatus?.id === id && !readDenied && activeContext ? <DeliveryCancellationStatusDialog
        data={cancellationStatus}
        patientName={context.patient?.display_name ?? "Paciente identificado na ficha"}
        onWithdraw={actions.includes("withdraw_cancellation") && data?.deliveryCancellation?.request.id === cancellationStatus.deliveryCancellation?.request.id ? () => {
          setCancellationStatus(null);
          setAction("withdraw_cancellation");
        } : undefined}
        onClose={() => {
          setCancellationStatus(null);
          resultFocusRef.current = true;
          setFocusRevision(value => value + 1);
        }}
        onHistory={() => { setCancellationStatus(null); tabs.select("history"); }} /> : null}
      <Dialog
        open={Boolean(review) && !readDenied && !countingDelivery && !reassigningDelivery && !reconcilingDelivery && !cancellingTransit && !reviewingCancellation && (!coveredOperation || uncertain)}
        title={
          review?.action === "close_expectation"
            ? "Revisar encerramento da expectativa"
            : registeringPurchase
              ? "Conferir resultado da compra"
              : registeringArrival ? "Conferir resultado da chegada"
              : "Revisar operação definitiva"
        }
        closeDisabled={busy}
        onClose={() => {
          if (!busy) { if (uncertain) setCloseUncertain(true); else setReview(null); }
        }}
      >
        {error ? <Notice error>{error}</Notice> : null}
        {uncertain ? (
          <Notice>
            O resultado ainda não foi confirmado. Esta tentativa permanece
            preservada; recupere o resultado antes de editar ou iniciar outra
            operação.
          </Notice>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-6">
          {review?.summary}
        </p>
        {data?.type === "ENT" && review?.action === "receive" ? (
          <DeliveryReceiptReview data={data} body={review.body} />
        ) : null}
        <p className="mt-4 text-xs text-(--muted)">
          Esta operação será registrada na versão documental e na auditoria.
        </p>
        <div className="ui-form-actions">
          <button
            className={buttonClass}
            disabled={busy || uncertain}
            onClick={() => setReview(null)}
          >
            {review?.action === "close_expectation"
              ? "Manter restante"
              : "Voltar à edição"}
          </button>
          <button
            className={primaryClass}
            disabled={busy}
            onClick={() => void execute()}
          >
            {busy
              ? "Confirmando…"
              : uncertain
                ? "Conferir resultado"
                : review?.action === "close_expectation"
                  ? "Confirmar encerramento da expectativa"
                  : "Confirmar operação"}
          </button>
        </div>
      </Dialog>
      {purchaseResult?.documentId === id && !readDenied && !purchaseUpdating ? <PurchaseResult result={purchaseResult} onClose={() => {
        setPurchaseResult(null);
        resultFocusRef.current = true;
        setFocusRevision(value => value + 1);
      }} /> : null}
      {arrivalResult?.documentId === id && data && !readDenied ? <PurchaseArrivalResult receipt={arrivalResult.receipt} lines={data.lines}
        onClose={() => {
          setArrivalResult(null);
          resultFocusRef.current = true;
          setFocusRevision(value => value + 1);
        }} /> : null}
      <Dialog open={closeUncertain} title="Fechar sem resultado confirmado?" onClose={() => setCloseUncertain(false)}>
        <p>O resultado continua sem confirmação. Fechar descarta os campos desta tela. Procure a supervisão e confira o resultado antes de repetir a ação.</p>
        <div className="hca-toolbar"><ActionButton onClick={() => setCloseUncertain(false)}>Voltar à conferência</ActionButton><ActionButton onClick={() => { setCloseUncertain(false); setReview(null); setAction(null); pendingRef.current = null; setUncertain(false); }}>Fechar e procurar supervisão</ActionButton></div>
      </Dialog>
    </div>
  );
}
export const actionLabels: Record<DocumentAction, string> = {
  submit: "Emitir rascunho",
  approve: "Aprovar itens",
  purchase: "Registrar compra",
  receive: "Confirmar recebimento",
  divergence: "Informar divergência",
  close_expectation: "Encerrar expectativa restante",
  reassign: "Trocar recebedor",
  resolve: "Conciliar divergência",
  approve_family: "Revisão da família",
  approve_supervisor: "Revisão da supervisão",
  cancel: "Solicitar cancelamento",
  consent_cancel: "Analisar pedido de cancelamento",
  refuse_cancellation: "Recusar pedido de cancelamento",
  withdraw_cancellation: "Retirar meu pedido de cancelamento",
};
