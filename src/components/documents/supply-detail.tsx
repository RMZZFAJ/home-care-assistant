"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentSection } from "@/components/ui/model-section";
import { DocumentComplementsPanel } from "@/components/documents/document-complements";
import { DocumentCancellationNotice } from "@/components/documents/document-cancellation-notice";
import { roleLabel } from "@/components/layout/workspace-context";
import { DocumentBreadcrumb } from "@/components/documents/document-breadcrumb";
import { DocumentAccessObservation, DocumentAccessHistory } from "./document-access";
import { DocumentTimeline } from "./document-timeline";
import { DeliveryRecipientFacts } from "./delivery-recipient";
import { DeliveryRegularization } from "./delivery-regularization";
import { BalanceReview } from "./balance-review";
import { TransferDetails } from "./transfer-details";
import {
  documentPatientName,
  documentIssuerName,
} from "@/lib/documents/presentation";
import { documentVariant } from "@/lib/documents/variant";
import { SupplyLineSummary } from "./supply-line-summary";
import { PurchaseMaterials } from "./purchase-materials";
import { DeliveryMaterials } from "./delivery-materials";
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
import { PrivateOperationRecoveryActions } from "./private-operation-recovery-actions";
import { type PatientPerson, type SupplyDocument } from "@/types/documents";
import { quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { DocumentHeader } from "./document-header";
import { FamilyFulfillmentReview } from "./family-fulfillment-review";
import { DocumentFreshness } from "./document-freshness";
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
  PurchaseDetails,
  PurchaseExpectationComparison,
} from "./purchase-details";
import {
  acquisitionRemaining,
  arrivalRemaining,
} from "@/lib/documents/purchase";
import {
  DeliveryCancellationDetails,
  DeliveryCancellationComparison,
} from "./delivery-cancellation";

const secondaryDocumentActions = new Set<DocumentAction>([
  "cancel",
  "close_expectation",
  "reassign",
]);

const supplyCopyIdentity = (value: SupplyDocument) => JSON.stringify([value.version, value.status, value.workflow_data, value.lines, value.receipts]);
export function SupplyDocumentContent({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const liveRevision = useLiveRevision();
  const tabs = useDocumentTabs(can(context, "audit.read"));
  const [progressActionTarget, setProgressActionTarget] =
    useState<HTMLDivElement | null>(null);
  const [fileActionTarget, setFileActionTarget] =
    useState<HTMLDivElement | null>(null);
  const editingRef = useRef(false);
  const { data, setData, acceptRead, stale } = useDocumentCopy<SupplyDocument>(supplyCopyIdentity);
  const [people, setPeople] = useState<PatientPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useOperationActivity(loading && !data || busy, { title: busy ? "Confirmando a operação" : "Consultando a ficha", detail: "Aguarde a confirmação. Os registros e o preenchimento permanecem preservados." });
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [readDenied, setReadDenied] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [readNotice, setReadNotice] = useState("");
  const [action, setAction] = useState<DocumentAction | null>(null);
  const [review, setReview] = useState<{
    action: string;
    body: unknown;
    summary: string;
    expectedVersion: number;
    draftCommit?: { id: string; revision: number; };
  } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [purchaseConflict, setPurchaseConflict] = useState(false);
  const [deliveryConflict, setDeliveryConflict] = useState(false);
  const [regularizationEditing, setRegularizationEditing] = useState(false);
  const [balanceReviewEditing, setBalanceReviewEditing] = useState(false);
  const [transferEditing, setTransferEditing] = useState(false);
  const [focusRevision, setFocusRevision] = useState(0);
  const [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const commandFormRef = useRef<HTMLFormElement | null>(null);
  const referenceAdoptionRef = useRef<OperationReferenceHandle | null>(null);
  const decisionFocusRef = useRef(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const operationOpenerRef = useRef<HTMLButtonElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const restoreRefreshFocusRef = useRef(false);
  function refreshDocument() {
    if (loading || busy) return;
    restoreRefreshFocusRef.current = true;
    setLoading(true);
    setAttempt((value) => value + 1);
  }
  useEffect(() => {
    if (!loading && restoreRefreshFocusRef.current) {
      restoreRefreshFocusRef.current = false;
      refreshButtonRef.current?.focus();
    }
  }, [loading]);
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
  const patientId = context.patient?.id;
  useEffect(() => {
    const controller = new AbortController();
    // Cache Components can resume this route with its previous state. Reconnect
    // the loading state before exposing actions on a document being refreshed.
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
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
        acceptRead(result.data, id + ":" + attempt, editingRef.current);
        if (editingRef.current)
          setReadNotice(
            "O acompanhamento foi atualizado. Sua operação permanece preservada e será validada contra a versão original ao confirmar.",
          );
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
            setReadDenied(true);
            setData(null);
          }
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a ficha.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, patientId, attempt, liveRevision, acceptRead, setData]);
  async function execute() {
    if (!data) return;
    if (!pendingRef.current && review)
      pendingRef.current = {
        action: review.action,
        body: review.body,
        expectedVersion: review.expectedVersion,
        idempotencyKey: crypto.randomUUID(),
        ...(review.draftCommit ? { draftCommit: review.draftCommit } : {}),
      };
    if (!pendingRef.current) return;
    setBusy(true);
    setError("");
    const intention = pendingRef.current;
    try {
      const result = await api<{ data: SupplyDocument; }>(
        "/api/documents/" + id,
        intention,
      );
      result.data = requireSupplyConfirmation(result, {
        patientId: data.care_recipient_id,
        type: data.type,
        id,
        minimumVersion: intention.expectedVersion,
      });
      resultFocusRef.current = true;
      setFocusRevision((value) => value + 1);
      setData(result.data);
      setReadFailed(false);
      pendingRef.current = null;
      setUncertain(false);
      setReview(null);
      setAction(null);
      setPurchaseConflict(false);
      setDeliveryConflict(false);
      setComparison(null);
      setReadNotice("");
      const receipt = result.data.receipts.find(
        (receipt) => receipt.submission_key === intention.idempotencyKey,
      );
      const purchaseMessages: Record<string, string> = {
        approve:
          "Decisão de aprovação registrada. Quantidades adquiridas e recebidas não mudaram.",
        purchase:
          "Aquisição registrada. Este ato não confirma chegada nem entrada no estoque.",
        receive:
          receipt?.state === "approved"
            ? "Chegada registrada e validada. As quantidades desta parcela foram incorporadas ao estoque familiar."
            : receipt?.state === "pending"
              ? "Chegada registrada e aguardando conferência. Nenhuma quantidade desta parcela foi incorporada ao estoque."
              : "Chegada registrada. Consulte a parcela e seu estado de conferência.",
        validate_receipt:
          "Parcela validada. As quantidades declaradas integram o estoque familiar.",
        reject_receipt:
          "Parcela rejeitada. A declaração original foi preservada, sem entrada desta parcela no estoque.",
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
      const rejected =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status);
      if (rejected && !uncertain) {
        if (
          data.type === "COM" &&
          reason instanceof ApiError &&
          reason.code === "VERSION_CONFLICT"
        )
          setPurchaseConflict(true);
        if (
          data.type === "ENT" &&
          reason instanceof ApiError &&
          reason.code === "VERSION_CONFLICT"
        )
          setDeliveryConflict(true);
        if (
          data.type === "ENT" &&
          intention.action === "consent_cancel" &&
          reason instanceof ApiError &&
          reason.status === 403
        )
          setDeliveryConflict(true);
        pendingRef.current = null;
        setReview(null);
      }
      setUncertain(uncertain || !rejected);
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
      setComparison(result.data);
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
  const purchaseStep = data?.type === "COM" ? purchaseFollowUp({
    status: data.status, origin: data.payload.origin, progress: data.purchaseProgress,
  }) : null;
  const deliveryStep = data?.type === "ENT"
    ? data.transfer ? transferFollowUp(data) : deliveryFollowUp(data,
      materialTransferDirection(data.payload.source, data.payload.destination) === "return" ? "return" : "delivery") : null;
  const balanceStep = data?.type === "BAL" ? balanceFollowUp(data) : null;
  const followUpStep = purchaseStep ?? deliveryStep ?? balanceStep;
  const operationOpen = Boolean(action || review || uncertain || regularizationEditing || balanceReviewEditing || transferEditing);
  const allowed = (cap: string) => Boolean(activeContext && can(context, cap));
  const actions: DocumentAction[] = [];
  if (
    data &&
    !["cancelled", "rejected"].includes(data.status) &&
    activeContext
  ) {
    if (
      data.status === "draft" &&
      allowed(
        data.type === "BAL" ? "bal.count" : data.type.toLowerCase() + ".create",
      )
    )
      actions.push("submit");
    else if (data.type === "COM") {
      if (data.status === "pending_approval" && allowed("com.approve"))
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
        data.receipts.some((receipt) => receipt.state === "pending") &&
        allowed("com.validate")
      )
        actions.push("validate_receipt", "reject_receipt");
      if (
        data.purchaseProgress?.expectationPending &&
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
        data.status === "pending_receipt" &&
        !data.transfer &&
        (data.created_by === context.userId || allowed("access.manage"))
      )
        actions.push("reassign");
      if (
        (data.status === "disputed" ||
          (data.status === "cancellation_pending" &&
            data.lines.some((line) =>
              quantity(line.quantity)
                .minus(line.accepted_quantity)
                .minus(line.reconciled_quantity)
                .gt(0),
            ))) &&
        data.deliveryRegularization?.recipientAvailable !== false &&
        ((data.recipient_id === context.userId && allowed("ent.receive")) ||
          allowed("access.manage"))
      )
        actions.push("resolve");
      if (
        data.status === "cancellation_pending" &&
        data.recipient_id === context.userId &&
        allowed("ent.receive")
      ) {
        if (
          data.deliveryCancellation?.sourceReady &&
          data.deliveryCancellation.referenceHash &&
          !quantity(data.deliveryCancellation.unresolvedTransit ?? "0").gt(0)
        )
          actions.push("consent_cancel");
        actions.push("refuse_cancellation");
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
        (data.created_by === context.userId &&
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
    if (
      pending &&
      action === "consent_cancel" &&
      !referenceAdoptionRef.current?.adoptCancellationReference(
        comparison,
      )
    ) {
      setError(
        "Não foi possível atualizar a referência privada da conciliação. Consulte novamente.",
      );
      return;
    }
    decisionFocusRef.current = pending;
    resultFocusRef.current = !pending;
    setData(comparison);
    setComparison(null);
    setDeliveryConflict(false);
    setReview(null);
    if (!pending) setAction(null);
    setFocusRevision((value) => value + 1);
    setMessage(
      pending
        ? "Referência atual carregada. Confira os valores preservados e prepare uma nova revisão antes de decidir."
        : "Resultado atual carregado. O primeiro ato e sua autoria permanecem preservados.",
    );
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
  function renderAction(item: DocumentAction) {
    if (!data) return null;
    return (
      <button
        key={item}
        className={item === "receive" ? primaryClass : buttonClass}
        // Opening an editor has no official effect. A background read must not
        // disable a retained opener between pointerdown and pointerup. Existing
        // version/identity checks still authorize and validate confirmation.
        disabled={busy || uncertain}
        onClick={(event) => {
          operationOpenerRef.current = event.currentTarget;
          decisionFocusRef.current = true;
          setFocusRevision((value) => value + 1);
          tabs.select("workflow");
          setAction(item);
          setReview(null);
        }}
      >
        {data.type === "COM" && item === "receive"
          ? "Informar nova chegada"
          : actionLabels[item]}
      </button>
    );
  }
  return (
    <div className="hca-record-detail doc-page">
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
            disabled={loading || busy}
            onClick={refreshDocument}
            ref={refreshButtonRef}
          >
            Atualizar ficha
          </button>
        </div>
      )}
      {loading && !data ? <Notice>Consultando documento persistido…</Notice> : null}
      <span role="status" className="sr-only">
        {loading && data ? "Atualizando consulta da ficha…" : ""}
      </span>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {readNotice &&
        (action ||
          review ||
          uncertain ||
          regularizationEditing ||
          balanceReviewEditing ||
          transferEditing) ? (
        <Notice>{readNotice}</Notice>
      ) : null}
      {purchaseConflict && data?.type === "COM" ? (
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
      ) : null}
      {deliveryConflict && data?.type === "ENT" ? (
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
            progressActionRef={setProgressActionTarget}
            fileActionRef={setFileActionTarget}
            contextLabel={roleLabel(context.patient?.role)}
            onRefresh={refreshDocument}
            refreshButtonRef={refreshButtonRef}
            refreshDisabled={loading || busy}
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
                  .filter((item) => !secondaryDocumentActions.has(item))
                  .map(renderAction)}
              </>
            }
            secondaryActions={
              <>
                {data.type === "BAL" && data.payload.balanceContext ? (
                  <Link
                    href="/balancos"
                    className={buttonClass}
                    prefetch={false}
                  >
                    Acompanhar plantão, revisão e reconto
                  </Link>
                ) : null}
                {activeContext &&
                  (data.type === "COM" || data.type === "ENT") ? (
                  <PrivateOperationRecoveryActions
                    kind={data.type}
                    onSelect={(purpose) => {
                      operationOpenerRef.current = moreTriggerRef.current;
                      decisionFocusRef.current = true;
                      setFocusRevision((value) => value + 1);
                      tabs.select("workflow");
                      setAction(purpose);
                      setReview(null);
                      setPurchaseConflict(false);
                      setDeliveryConflict(false);
                      setComparison(null);
                    }}
                  />
                ) : null}
                {actions
                  .filter((item) => secondaryDocumentActions.has(item))
                  .map(renderAction)}
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
                    : "Compra ou doação de insumos"
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
              data.type === "COM"
                ? (data.purchaseProgress?.state ?? data.status)
                : data.status
            }
            statusLabel={followUpStep?.statusLabel}
            protocol={data.protocol}
            version={data.version}
            createdAt={data.created_at}
            patientName={documentPatientName(
              data.canonical_snapshot,
              context.patient?.display_name ??
              "Paciente identificado no documento",
            )}
          >
            {data.type === "COM" ? (
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
          <DocumentFreshness stale={stale} loading={loading || busy} onRefresh={refreshDocument} />
          {data.status === "cancelled" && data.protocol ? <DocumentCancellationNotice key={`${context.userId}:${id}`} document={data} userId={context.userId} activeContext={Boolean(activeContext)} onRecorded={() => setAttempt(value => value + 1)} /> : null}
              {followUpStep && (loading || readFailed || operationOpen) ? (
                <Notice>
                  {operationOpen
                    ? "Sua operação está preservada na versão de trabalho. Conclua ou feche a operação para consultar a próxima providência atual."
                    : loading
                      ? "Atualizando o acompanhamento da ficha…"
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
              />}
          <DocumentTabs
            rootRef={tabs.rootRef}
            type={data.type}
            value={tabs.value}
            onSelect={tabs.select}
            auditAllowed={can(context, "audit.read")}
          >
            <DocumentPanel value="overview"><div className="doc-overview-grid"><div className="doc-main-column">
              <DocumentProgress
                actionTarget={progressActionTarget}
                onAction={() => tabs.select("overview")}
                id={id}
                type={data.type}
                patientId={data.care_recipient_id}
                context={context}
              />
</div><aside className="doc-side-column"><DocumentSection title="Observações da emissão" icon="file">{data.payload.notes ? <ol className="doc-original-notes"><li>{data.payload.notes}</li></ol> : <p className="doc-subtle">Sem observações.</p>}<div className="doc-author-line"><span className="doc-avatar" aria-hidden="true">{documentIssuerName(data.canonical_snapshot).split(" ").slice(0,2).map(part => part[0]).join("")}</span><span><strong>{documentIssuerName(data.canonical_snapshot)}</strong><small>{formatBrazilDate(data.created_at)}</small></span></div></DocumentSection>
              {data.protocol ? <DocumentComplementsPanel key={`${context.userId}:${id}`} documentId={id} version={data.version} userId={context.userId} activeContext={Boolean(activeContext)} onRecorded={() => setAttempt(value => value + 1)} /> : null}
</aside></div></DocumentPanel>
            <DocumentPanel value="materials">
              {data.type === "ENT" ? <FamilyFulfillmentReview data={data} context={context} onReviewed={() => setAttempt(value => value + 1)} /> : null}
              <section className={data.type === "BAL" ? "ui-card" : "hca-materials-section"}>
                {data.type === "COM" ? <PurchaseMaterials data={data} /> : data.type === "ENT" ? <DeliveryMaterials data={data} /> : <>
                  <h2 className="font-semibold">Produtos e quantidades</h2>
                  <div className="mt-4 space-y-3">
                    {data.lines.map((line) => (
                      <SupplyLineSummary
                        key={line.id}
                        line={line}
                        type={data.type}
                        status={data.status}
                        declarationOnly={Boolean(
                          data.transfer && data.transfer.state !== "dispatched",
                        )}
                        purchaseLine={data.purchaseProgress?.lines.find(
                          (item) => item.lineId === line.id,
                        )}
                      />
                    ))}{" "}
                  </div>
                </>}
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
                  onEditingChange={setRegularizationEditing}
                  onUpdated={setData}
                />
              ) : null}
              {data.type === "ENT" && data.deliveryCancellation ? (
                <DeliveryCancellationDetails
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
              {data.type === "COM" ? <PurchaseDetails key={data.id} data={data} /> : null}
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
              {actions.length || action ? (
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
                      onCompareCancellationReference={() => {
                        setDeliveryConflict(true);
                        void comparePurchaseVersion();
                      }}
                      action={action}
                      data={data}
                      people={people.filter(
                        (person) => person.id !== data.created_by,
                      )}
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
                      ) =>
                        setReview({
                          action: command,
                          body,
                          summary,
                          expectedVersion: expectedVersion ?? data.version,
                          ...(draftCommit ? { draftCommit } : {}),
                        })
                      }
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
                  generationBlocked={stale}
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
                  activeContext &&
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
      <Dialog
        open={Boolean(review) && !readDenied}
        title={
          review?.action === "close_expectation"
            ? "Revisar encerramento da expectativa"
            : "Revisar operação definitiva"
        }
        closeDisabled={busy || uncertain}
        onClose={() => {
          if (!busy && !uncertain) setReview(null);
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
                ? "Recuperar tentativa"
                : review?.action === "close_expectation"
                  ? "Confirmar encerramento da expectativa"
                  : "Confirmar operação"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
export const actionLabels: Record<DocumentAction, string> = {
  submit: "Emitir rascunho",
  approve: "Aprovar itens",
  purchase: "Registrar aquisição",
  receive: "Confirmar recebimento",
  divergence: "Informar divergência",
  validate_receipt: "Validar recebimento",
  reject_receipt: "Rejeitar recebimento",
  close_expectation: "Encerrar expectativa restante",
  reassign: "Alterar destinatário",
  resolve: "Conciliar divergência",
  approve_family: "Revisão da família",
  approve_supervisor: "Revisão da supervisão",
  cancel: "Solicitar cancelamento",
  consent_cancel: "Consentir e reconciliar cancelamento",
  refuse_cancellation: "Recusar pedido de cancelamento",
  withdraw_cancellation: "Retirar meu pedido de cancelamento",
};
