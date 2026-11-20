"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentSection } from "@/components/ui/model-section";
import { Icon } from "@/components/ui/icon";
import { DocumentComplementsPanel } from "@/components/documents/document-complements";
import { DocumentCancellationNotice } from "@/components/documents/document-cancellation-notice";
import { DocumentFollowUpActions } from "@/components/documents/document-follow-up-actions";
import { DocumentArchiveActions, DocumentArchiveDialog, type ArchiveDialogMode } from "@/components/documents/document-archive-dialog";
import { activeDocumentArchive, documentArchiveLabel } from "@/lib/documents/document-archive";
import { RequisitionScienceAction, type RequisitionScienceControl } from "./requisition-science-action";
import { DocumentFab } from "@/components/documents/document-fab";
import { DocumentCommunications } from "@/components/notifications/document-communications";
import { DocumentMaterialList } from "@/components/documents/document-material-list";
import { DocumentFreshness } from "@/components/documents/document-freshness";
import { DocumentFamilyDecisionNotice } from "@/components/documents/document-family-decision-notice";
import { changedFact } from "@/lib/documents/document-changes";
import { useDocumentCopy } from "@/lib/documents/use-document-copy";
import { roleLabel } from "@/components/layout/workspace-context";
import { ActionButton, Pill } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { DocumentBreadcrumb } from "@/components/documents/document-breadcrumb";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import {
  formatStockObservation,
  formatStockObservationTime,
} from "@/lib/stock-observation";
import type {
  RequisitionReceipt,
  StockObservation,
  StockObservationTimeSource,
} from "@/types/requisition";
import { textRows } from "@/lib/text-rows";
import { requisitionDocumentState, documentStatusLabel } from "@/lib/documents/presentation";
import { requisitionDeliveries, requisitionFollowUp, type RequisitionDelivery } from "@/lib/requisitions/follow-up";
import { formatQuantity } from "@/lib/quantity";
import { Attachments } from "@/components/documents/attachments";
import { DocumentHeader, DocumentMoreButton, DocumentMoreLink } from "@/components/documents/document-header";
import {
  DocumentTabs,
  DocumentPanel,
  DocumentAuditAccess,
  useDocumentTabs,
} from "@/components/documents/document-tabs";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentIssuanceResult } from "@/components/documents/document-issuance-result";
import { useIssuanceOpeningActivity } from "@/components/documents/document-issuance-navigation";
import { RequisitionReceiptCard } from "./requisition-receipt";
import { DocumentMilestones } from "@/components/documents/document-milestones";
import { DocumentNextStep } from "@/components/documents/document-next-step";
import { requisitionMilestones } from "@/lib/documents/milestones";
import { DocumentProgress } from "@/components/documents/document-progress";
import {
  DocumentTimeline,
  type TimelineEvent,
} from "@/components/documents/document-timeline";
import { RelatedDocument } from "@/components/documents/related-document";
import { RequisitionDecisionEditor } from "./requisition-decision-editor";
import type { RequisitionStockOutcome } from "./requisition-stock-cancellation";
import {
  type RequisitionOperationPurpose,
} from "@/lib/validation/supply-drafts";
import { ResolveExtraItem } from "./resolve-extra-item";
import { RequisitionDisplay, OpeningHistory } from "./requisition-display";
import {
  type DeliveryStatus,
} from "@/lib/notifications/presentation";

type Progress = {
  version: number;
  materialIdentity: string;
  familyAware: boolean;
  personalScience: boolean;
  designationPending: boolean;
  scienceSatisfied: boolean;
  eligible: boolean;
  completedAt: string | null;
  manualArchiveRequired: boolean;
  archivedAt: string | null;
  archiveReason: string | null;
  policy: { scienceRequired?: boolean; } | null;
  preferences: Record<string, boolean>;
  events: TimelineEvent[];
  science: {
    id: string;
    user_id: string;
    actor_name: string;
    mode: string;
    created_at: string;
  }[];
};
type Detail = {
  receipt?: RequisitionReceipt;
  id: string;
  care_recipient_id: string;
  code: string | null;
  protocol: string;
  status: string;
  created_at: string | null;
  is_historical?: boolean;
  requester_name_snapshot?: string;
  recipient_name_snapshot?: string;
  sourceRequisition?: import("@/types/requisition").RequisitionReceipt["sourceRequisition"];
  remainingNeeds: {
    id: string;
    code: string | null;
    protocol: string;
    created_at: string;
    remaining_need_reason: string;
  }[];
  remainingNeedTotal: number;
  requisition_items: {
    id: string;
    product_id: string | null;
    product_name_snapshot: string;
    custom_name: string | null;
    unit_snapshot: string;
    extra_details?: string | null;
    catalogue_extra?: { details?: string } | null;
    current_stock: string | null;
    stock_observation?: StockObservation;
    stock_observation_at?: string | null;
    stock_observation_time_source?: StockObservationTimeSource;
    urgent: boolean;
    resolution?: { product_id: string; } | null;
  }[];
  requisition_observations: { body: string; }[];
  requisition_notifications: DeliveryStatus[];
  fulfillment: {
    total: number;
    fulfilled: number;
    partial?: number;
    reviewRequired?: number;
    lines: {
      id: string;
      attended: boolean;
      serviceStatus?: "pending" | "partial" | "fulfilled" | "review_required";
      deliveries: RequisitionDelivery[];
    }[];
  };
  progress: Progress;
  documentArchive?: unknown;
};
const modes: Record<string, string> = {
  express: "Expressa no aplicativo",
  dialog: "Confirmação em diálogo antes de abrir",
  tacit: "Tácita por preferência anterior à emissão",
  app_visible: "Ciência automática legada · conteúdo exibido",
  whatsapp_read: "Ciência legada · leitura correlacionada no WhatsApp",
  whatsapp_confirm: "Ciência legada · WhatsApp verificado",
  dispatch: "Por expedição autorizada",
};

const requisitionCopyIdentity = (value: Detail) => JSON.stringify([value.status, value.progress, value.fulfillment, value.requisition_items]);

const needLabels = {
  pending: "Pendente",
  partial: "Parcial",
  fulfilled: "Integral",
  review_required: "Aguardando nova avaliação familiar",
};

function requisitionChanges(before: Detail, after: Detail) {
  const summary = (data: Detail) => {
    const archive = activeDocumentArchive(data.documentArchive);
    return archive ? documentArchiveLabel(archive) : documentStatusLabel(requisitionDocumentState({
      historical: data.is_historical, status: data.status, archivedAt: data.progress.archivedAt, completedAt: data.progress.completedAt,
      scienceSatisfied: data.progress.scienceSatisfied, fulfilled: data.fulfillment.fulfilled, partial: data.fulfillment.partial,
    }));
  };
  const changes = changedFact("state", "Situação da ficha", summary(before), summary(after));
  changes.push(...changedFact("science", "Ciência familiar", before.progress.familyAware ? "Registrada" : "Pendente", after.progress.familyAware ? "Registrada" : "Pendente"));
  const previous = new Map(before.fulfillment.lines.map(line => [line.id, line]));
  const next = new Map(after.fulfillment.lines.map(line => [line.id, line]));
  const status = (line: Detail["fulfillment"]["lines"][number] | undefined) =>
    line ? needLabels[line.serviceStatus ?? (line.attended ? "fulfilled" : "pending")] : "Sem avaliação";
  for (const item of after.requisition_items) {
    const name = item.custom_name ?? item.product_name_snapshot;
    changes.push(...changedFact(item.id, name + " · Atendimento da necessidade", status(previous.get(item.id)), status(next.get(item.id))));
  }
  return changes;
}

export function RequisitionDocumentContent({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const revision = useLiveRevision();
  const tabs = useDocumentTabs(can(context, "audit.read"));
  const fabRef = useRef<HTMLButtonElement>(null);
  const scienceControlRef = useRef<RequisitionScienceControl>(null);
  const reviewControlRef = useRef<(opener: HTMLButtonElement | null) => void>(null);
  const [fileActionTarget, setFileActionTarget] =
    useState<HTMLDivElement | null>(null);
  const [openingRevision, setOpeningRevision] = useState("initial");
  const { data, observedData, setData, acceptRead, stale } = useDocumentCopy<Detail>(requisitionCopyIdentity);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [readFailed, setReadFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [stockOutcome, setStockOutcome] = useState<RequisitionStockOutcome | null>(null);
  const [busy] = useState(false);
  const [reading, setReading] = useState(true);
  const [archiveDialog, setArchiveDialog] = useState<ArchiveDialogMode | null>(null);
  const archiveReviewRef = useRef<HTMLButtonElement>(null);
  const issuing = useIssuanceOpeningActivity(id, context.userId, context.patient?.id);
  useOperationActivity(reading && !data, issuing ??
    { title: "Consultando a ficha", detail: "Estamos identificando a requisição e conferindo seu acesso." });
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const restoreRefreshFocusRef = useRef(false);
  function refreshDocument() {
    if (reading || busy) return;
    restoreRefreshFocusRef.current = true;
    setReading(true);
    setAttempt((value) => value + 1);
  }
  useEffect(() => {
    if (!reading && restoreRefreshFocusRef.current) {
      restoreRefreshFocusRef.current = false;
      refreshButtonRef.current?.focus();
    }
  }, [reading]);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const [decision, setDecision] = useState<{
    purpose: RequisitionOperationPurpose;
    consulting: boolean;
    trigger: HTMLElement | null;
  } | null>(null);
  function openDecision(
    purpose: RequisitionOperationPurpose,
    consulting = false,
  ) {
    setDecision({
      purpose,
      consulting,
      trigger:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
    });
  }
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setReading(true);
    });
    void api<{ data: Detail; receipt?: RequisitionReceipt }>(
      `/api/requisitions/${id}`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          acceptRead({ ...result.data, receipt: result.receipt }, id + ":" + attempt);
          setReadFailed(false);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setReadFailed(true);
          if (
            cause instanceof ApiError &&
            [401, 403, 404].includes(cause.status)
          )
            setData(null);
          setError(cause.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false);
      });
    return () => controller.abort();
  }, [id, attempt, revision, acceptRead, setData]);
  if (!data && reading) return null;
  if (!data)
    return (
      <div className="space-y-3">
        <h1>Requisição e acompanhamento</h1>
        <Notice error={Boolean(error)}>
          {error || "Não foi possível consultar a requisição."}
        </Notice>
        {error ? (
          <button
            type="button"
            className={buttonClass}
            ref={refreshButtonRef}
            disabled={reading || busy}
            onClick={refreshDocument}
          >
            Tentar carregar requisição
          </button>
        ) : null}
      </div>
    );
  const { fulfillment: f, progress: p } = data;
  const lifecycleVisible = !data.is_historical && !p.archivedAt && context.patient?.id === data.care_recipient_id;
  const terminalFollowUp = data.status === "cancelled" || Boolean(p.completedAt);
  const patientAdmin = context.patient?.role === "admin" && can(context, "access.manage");
  const canComplete = can(context, "req.review") || patientAdmin;
  const archive = activeDocumentArchive(data.documentArchive);
  const archiveAllowed = patientAdmin && can(context, "req.archive") && context.patient?.id === data.care_recipient_id;
  const offerScience = !data.is_historical && p.eligible && !p.archivedAt && data.status !== "cancelled" && !p.science.some(row => row.user_id === context.userId && row.mode === "express");
  const progressAllowed = !p.archivedAt && context.activeContext?.mode === "patient"
    && context.patient?.id === data.care_recipient_id && can(context, "document.progress.create");
  const canStartDelivery = lifecycleVisible && can(context, "ent.create");
  const canStartPurchase = lifecycleVisible && can(context, "com.create");
  const operationalMenu = !terminalFollowUp && lifecycleVisible
    && (canStartDelivery || canStartPurchase || offerScience || progressAllowed);
  const documentState = requisitionDocumentState({
    historical: data.is_historical,
    status: data.status,
    archivedAt: p.archivedAt,
    completedAt: p.completedAt,
    scienceSatisfied: p.scienceSatisfied,
    fulfilled: f.fulfilled,
    partial: f.partial,
  });
  const serviceLabel = archive ? documentArchiveLabel(archive) : data.is_historical ? "Registro histórico" : p.archivedAt ? "Arquivada" : data.status === "cancelled" ? "Cancelada" : p.completedAt ? "Atendimento concluído" : f.fulfilled || f.partial ? "Atendimento parcial" : "Aguardando atendimento";
  const followUp = requisitionFollowUp({
    historical: Boolean(data.is_historical), status: data.status,
    archivedAt: p.archivedAt, completedAt: p.completedAt,
    scienceSatisfied: p.scienceSatisfied, designationPending: p.designationPending,
    eligible: p.eligible, personalScience: p.personalScience,
    fulfilled: f.fulfilled, total: f.total,
  });
  return (
    <div className="hca-record-detail doc-page">
      {context.patient?.id === data.care_recipient_id ? (
        <DocumentIssuanceResult id={id} userId={context.userId} patientId={data.care_recipient_id} patientName={context.patient.display_name}
          code={data.code ?? data.protocol} kind="REQ" />
      ) : null}
      <DocumentBreadcrumb code={data.code ?? data.protocol} />
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}

      <DocumentHeader
        headingLevel={1}
        fileActionRef={setFileActionTarget}
        contextLabel={roleLabel(context.patient?.role)}
        onRefresh={refreshDocument}
        refreshButtonRef={refreshButtonRef}
        refreshDisabled={reading || busy}
        dateHeading={data.is_historical ? "Registro original" : "Emissão"}
        metadata={[
          {
            label: "Solicitante",
            value:
              data.requester_name_snapshot ??
              (data.is_historical
                ? "Solicitante desconhecido"
                : "Solicitante registrado"),
          },
          {
            label: "Materiais",
            value: data.requisition_items.length + " itens",
          },
        ]}
        milestones={
          <DocumentMilestones
            summary={serviceLabel}
            items={requisitionMilestones({
              historical: Boolean(data.is_historical),
              issued: Boolean(data.protocol && data.created_at),
              scienceRequired: p.policy?.scienceRequired !== false,
              scienceSatisfied: p.scienceSatisfied,
              fulfilled: f.fulfilled,
              total: f.total,
              state: documentState,
            })}
          />
        }
        badges={
          <>{data.requisition_items.some((item) => item.urgent) ? (
            <Pill tone="danger">
              {data.requisition_items.filter((item) => item.urgent).length}{" "}
              {data.requisition_items.filter((item) => item.urgent).length === 1
                ? "item urgente"
                : "itens urgentes"}
            </Pill>
          ) : null}<Pill tone={p.familyAware ? "success" : "warning"}><Icon name="users" width={13} height={13} />{data.is_historical ? "Ciência não comprovada" : p.familyAware ? "Ciência registrada" : p.policy?.scienceRequired === false ? "Exigência dispensada" : "Ciência pendente"}</Pill></>
        }
        showFiles={false}
        updateNotice={<>
          {observedData ? <DocumentFreshness code={data.code ?? data.protocol}
            changes={requisitionChanges(data, observedData)} loading={reading || busy} editing={Boolean(decision)} onRefresh={refreshDocument} /> : null}
          {!data.is_historical && context.activeContext?.mode === "patient" && context.patient?.id === data.care_recipient_id &&
            can(context, "req.read") && can(context, "ent.read") ? <DocumentFamilyDecisionNotice
              key={context.userId + ":" + id} id={id} patientId={data.care_recipient_id} userId={context.userId}
              code={data.code ?? data.protocol} revision={revision + attempt} blocked={Boolean(decision || archiveDialog)} returnFocus={refreshButtonRef} /> : null}
        </>}
        nextStep={
          reading || readFailed ? (
            <Notice>
              {reading ? "Atualizando o acompanhamento da requisição…" : "O acompanhamento atual não foi confirmado. Atualize a ficha para consultar a próxima providência."}
              {" "}Os dados preservados são da última consulta válida.
            </Notice>
          ) : (
            <DocumentNextStep
              label={followUp.label}
              pending={followUp.pending}
              heading={followUp.heading}
              description={followUp.description}
              onOpen={() => tabs.select(followUp.section, true)}
            />
          )
        }
        actions={
          <>
            {terminalFollowUp && progressAllowed && tabs.value !== "progress" ? <ActionButton onClick={() => tabs.select("progress", true)}><Icon name="plus" />Novo andamento</ActionButton> : null}
            {!data.is_historical ? <RequisitionScienceAction id={id} userId={context.userId} version={p.version} materialIdentity={p.materialIdentity} mayRecord={Boolean(offerScience)} disabled={busy || reading} control={operationalMenu ? scienceControlRef : undefined} onRecorded={() => setAttempt(value => value + 1)} /> : null}
            {archive ? <DocumentArchiveActions archive={archive} reviewRef={archiveReviewRef} onReview={archiveAllowed ? () => setArchiveDialog("review") : undefined} /> : null}
            {lifecycleVisible ? <DocumentFollowUpActions
              id={id} patientId={data.care_recipient_id} kind="REQ" code={data.code ?? data.protocol}
              patientName={context.patient?.display_name ?? "Paciente identificado na ficha"}
              userId={context.userId} actor={context.fullName}
              canComplete={!terminalFollowUp && canComplete}
              reviewControl={reviewControlRef}
              canReopen={terminalFollowUp && patientAdmin} cancelled={data.status === "cancelled"}
              disabled={busy || reading}
              preservedFacts={<p>A contagem da emissão e as movimentações posteriores permanecem registradas.</p>}
              onUpdated={() => setAttempt(value => value + 1)} onShowMaterials={() => tabs.select("materials")}
              onCompleteAndArchive={archiveAllowed && !terminalFollowUp ? () => setArchiveDialog("archive") : undefined}
            /> : null}
          </>
        }
        secondaryActions={
          <>
            {lifecycleVisible && !terminalFollowUp && canComplete ? <DocumentMoreButton
              icon="check" disabled={busy || reading} onClick={() => reviewControlRef.current?.(moreTriggerRef.current)}
            >Revisar conclusão</DocumentMoreButton> : null}
            {terminalFollowUp && lifecycleVisible && archiveAllowed ? (
              <DocumentMoreButton
                className={buttonClass}
                disabled={busy}
                icon="archive" onClick={() => setArchiveDialog("archive")}
              >
                Arquivar ficha
              </DocumentMoreButton>
            ) : null}
            {!data.is_historical &&
              !p.archivedAt &&
              data.status !== "cancelled" &&
              can(context, "req.review") &&
              can(context, "req.create") ? (
              <DocumentMoreButton
                className={buttonClass}
                disabled={busy}
                danger icon="close" onClick={() => openDecision("cancel")}
              >
                Cancelar requisição
              </DocumentMoreButton>
            ) : null}
            {!data.is_historical && !p.archivedAt && can(context, "req.create") ? (
              <DocumentMoreLink
                className={buttonClass}
                href={`/fichas/req?careRecipientId=${data.care_recipient_id}&sourceRequisitionId=${id}`}
              >
                Declarar nova necessidade remanescente
              </DocumentMoreLink>
            ) : null}
          </>
        }
        moreTriggerRef={moreTriggerRef}
        id={id}
        type="REQ"
        code={data.code ?? data.protocol}
        protocol={data.protocol}
        status={documentState}
        statusLabel={serviceLabel}
        version={p.version}
        createdAt={data.created_at}
        dateLabel={
          data.is_historical && !data.created_at
            ? "Data original desconhecida"
            : undefined
        }
        patientName={
          data.recipient_name_snapshot ?? context.patient?.display_name
        }
      ></DocumentHeader>
      {operationalMenu ? <DocumentFab triggerRef={fabRef}>
        {canStartDelivery ? <DocumentMoreLink icon="truck" href={`/fichas/ent?requisitionId=${id}`}>Preparar entrega</DocumentMoreLink> : null}
        {canStartPurchase ? <DocumentMoreLink icon="box" href={`/fichas/com?requisitionId=${id}`}>Preparar compra</DocumentMoreLink> : null}
        {offerScience ? <DocumentMoreButton icon="check" disabled={busy || reading} onClick={() => scienceControlRef.current?.open(fabRef.current)}>Registrar minha ciência</DocumentMoreButton> : null}
        {progressAllowed ? <DocumentMoreButton icon="plus" onClick={() => tabs.select("progress", true)}>Novo andamento</DocumentMoreButton> : null}
      </DocumentFab> : null}
      {archiveDialog && archiveAllowed ? <DocumentArchiveDialog key={`${context.userId}:${id}:${archiveDialog}`} id={id} patientId={data.care_recipient_id}
        code={data.code ?? data.protocol} patientName={data.recipient_name_snapshot ?? context.patient?.display_name ?? "Paciente identificado na ficha"}
        actor={context.fullName} userId={context.userId} initial={archiveDialog} finalFocus={archiveDialog === "review" ? archiveReviewRef : moreTriggerRef}
        onClose={() => setArchiveDialog(null)} onUpdated={() => setAttempt(value => value + 1)} /> : null}
      {data.status === "cancelled" ? <DocumentCancellationNotice key={`${context.userId}:${id}`} document={data} userId={context.userId} activeContext={!p.archivedAt && data.care_recipient_id === context.patient?.id} onRecorded={() => setAttempt(value => value + 1)} /> : null}
      <RequisitionDisplay
        key={id}
        id={id}
        reference={p}
        onRecorded={setOpeningRevision}
      />

      <DocumentTabs
        rootRef={tabs.rootRef}
        type="REQ"
        value={tabs.value}
        onSelect={tabs.select}
        auditAllowed={can(context, "audit.read")}
      >
        <DocumentPanel value="progress">
          <DocumentProgress
            code={data.code ?? data.protocol}
            id={id}
            type="REQ"
            patientId={data.care_recipient_id}
            context={context}
            readOnly={Boolean(p.archivedAt)}
          />
        </DocumentPanel>
        <DocumentPanel value="overview">
          <div className="doc-main-column">
          {data.sourceRequisition ? (
            <section
              className="ui-card space-y-3"
              aria-label="Origem da necessidade remanescente"
            >
              <h2>Origem da necessidade remanescente</h2>
              <RelatedDocument
                type="REQ"
                id={data.sourceRequisition.id}
                label={
                  data.sourceRequisition.code ?? data.sourceRequisition.protocol
                }
              />
              <p>
                Referência na emissão: versão {data.sourceRequisition.version}.
              </p>
              <p className="whitespace-pre-wrap">
                Motivo próprio: {data.sourceRequisition.reason}
              </p>
              <p>
                Esta requisição tem ciência e atendimento próprios; os aceites
                anteriores pertencem à origem.
              </p>
            </section>
          ) : null}
          {data.remainingNeedTotal > 0 ? (
            <section
              className="ui-card space-y-3"
              aria-label="Necessidades seguintes"
            >
              <h2>Necessidades seguintes</h2>
              <p>
                {data.remainingNeeds.length} de {data.remainingNeedTotal}{" "}
                registros, mais recentes primeiro.
              </p>
              {data.remainingNeeds.map((row) => (
                <article key={row.id}>
                  <RelatedDocument
                    type="REQ"
                    id={row.id}
                    label={row.code ?? row.protocol}
                  />
                  <p>{row.remaining_need_reason}</p>
                </article>
              ))}
            </section>
          ) : null}
          <DocumentSection title="Observações da emissão" icon="file">
            {data.requisition_observations.length ? (
              textRows(
                data.requisition_observations.map((row) => row.body),
              ).map((row) => (
                <p key={row.key} className="mt-2 text-sm hca-origin-observation">
                  <span className="hca-origin-observation-number" aria-hidden="true" />{row.value}
                </p>
              ))
            ) : (
              <p className="mt-2 text-sm text-(--muted)">Sem observações.</p>
            )}
            <div className="doc-author-line"><span className="doc-avatar" aria-hidden="true">{(data.requester_name_snapshot ?? "?").split(" ").slice(0,2).map(part => part[0]).join("")}</span><span><strong>{data.requester_name_snapshot ?? "Solicitante não identificado"}</strong><small>{formatBrazilDate(data.created_at)}</small></span></div>
          </DocumentSection>

          <DocumentComplementsPanel key={`${context.userId}:${id}`} documentId={id} version={p.version} userId={context.userId} activeContext={!p.archivedAt && data.care_recipient_id === context.patient?.id} onRecorded={() => setAttempt(value => value + 1)} />

          </div>
        </DocumentPanel>
        <DocumentPanel value="materials">
          <section
            className="doc-card hca-requisition-facts"
            aria-label="Dimensões independentes da requisição"
          >
            <div className="my-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-(--background) p-3">
                <p className="text-xs text-(--muted)">Atendimento</p>
                <strong>
                  {data.is_historical
                    ? "Atendimento original não apurado"
                    : `${f.fulfilled}/${f.total} itens atendidos`}
                </strong>
                <p className="text-xs">
                  {data.is_historical
                    ? "Os registros preservados não comprovam o atendimento físico do original."
                    : f.total > 0 && f.fulfilled === f.total
                      ? "Completo"
                      : ["cancelled", "archived"].includes(documentState)
                        ? "Atendimento preservado no encerramento"
                        : f.fulfilled
                          ? "Parcial"
                          : "Aguardando ENT aceita"}
                </p>
              </div>
              <div className="rounded-lg bg-(--background) p-3">
                <p className="text-xs text-(--muted)">Ciência familiar</p>
                <strong>
                  {data.is_historical
                    ? "Não comprovada no original"
                    : p.familyAware
                      ? "Família ciente"
                      : p.designationPending
                        ? "Pendente de designação"
                        : "Ciência não registrada"}
                </strong>
                <p className="text-xs">Independente do recebimento</p>
              </div>
              <div className="rounded-lg bg-(--background) p-3">
                <p className="text-xs text-(--muted)">Documento</p>
                <strong>
                  {data.is_historical
                    ? "Registro histórico"
                    : p.archivedAt
                      ? "Arquivado"
                      : data.status === "cancelled"
                        ? "Cancelado"
                        : p.completedAt
                          ? "Concluído operacionalmente"
                          : "Em atendimento"}
                </strong>
              </div>
            </div>
          </section>

          <section className="hca-materials-section">
            <DocumentMaterialList key={data.id} documentId={data.id} patientId={data.care_recipient_id}
              revision={String(p.version)} active={tabs.value === "materials"} label="Materiais requisitados" settledLabel="Supridos"
              today={{ location: "family", label: "Família hoje" }}
              heading={<><h2>Materiais e atendimento</h2><p>Estoque observado e avaliação de atendimento têm registros próprios.</p></>}
              rows={data.requisition_items.map((item) => {
                const line = f.lines.find((row) => row.id === item.id);
                const name = item.product_name_snapshot ?? item.custom_name ?? "Nome não preservado no registro";
                const status = data.is_historical ? "Não apurado no original" : line?.attended ? "Atendido"
                  : line?.serviceStatus === "partial" ? "Parcialmente atendido"
                    : line?.serviceStatus === "review_required" ? "Nova avaliação familiar pendente"
                      : ["cancelled", "archived"].includes(documentState) ? "Sem atendimento confirmado"
                        : item.product_id || item.resolution ? "Em aberto" : "Cadastro pendente";
                return {
                  id: item.id, name, unit: item.unit_snapshot ?? null, urgent: item.urgent, done: Boolean(line?.attended),
                  status, tone: data.is_historical ? "neutral" : line?.attended ? "success" : "pending",
                  facts: [{ label: "Informado na REQ", value: formatStockObservation(item.current_stock, item.stock_observation, item.unit_snapshot) }],
                  detail: <div className="space-y-2">
                      <p>{status}</p>
                      <p>{formatStockObservationTime(item.stock_observation_at, item.stock_observation_time_source)}</p>
                      {item.catalogue_extra ? <p>Material do catálogo incluído como extra.</p> : null}
                      {item.catalogue_extra?.details ? <p className="whitespace-pre-wrap">{item.catalogue_extra.details}</p> : null}
                      {item.extra_details ? <p className="whitespace-pre-wrap">{item.extra_details}</p> : null}
                    </div>,
                  related: requisitionDeliveries(line?.deliveries ?? []).map(delivery => ({
                    document: { id: delivery.id, type: "ENT", code: delivery.code ?? "ENT em preparação" },
                    detail: <>
                      {documentStatusLabel(delivery.status)} ·{" "}
                      {delivery.acceptedQuantity === null ? "Quantidade aceita não informada"
                        : `Quantidade aceita para este item: ${formatQuantity(delivery.acceptedQuantity, item.unit_snapshot)}`}
                    </>,
                  })),
                };
              })} />
          </section>
          {!p.archivedAt && can(context, "catalog.manage") &&
            can(context, "req.review") &&
            data.requisition_items.some(
              (item) => !item.product_id && !item.resolution,
            ) ? (
            <ResolveExtraItem onOpen={() => openDecision("resolve_extra")} />
          ) : null}

          <DocumentSection title="Ciência familiar" icon="users">
            <div className="doc-science-record"><span className="doc-avatar"><Icon name={p.familyAware ? "check" : "clock"} width={18} height={18} /></span><div><strong>{data.is_historical ? "Não comprovada no original" : p.familyAware ? "Ciência registrada" : p.policy?.scienceRequired === false ? "Exigência dispensada" : "Ciência pendente"}</strong><p>Ciência, recebimento e atendimento têm registros próprios.</p></div></div>
            <p className="mt-2 text-sm">
              {data.is_historical
                ? "A ciência original não foi comprovada. Nenhuma confirmação foi inferida na importação."
                : p.familyAware
                  ? "Família ciente por uma pessoa habilitada. Cada pessoa mantém seu próprio registro."
                  : p.policy?.scienceRequired === false
                    ? "A exigência foi dispensada pela regra desta requisição. Isso não registra ciência em nome de ninguém."
                    : "A ciência familiar está pendente. Entregas e aceites válidos podem continuar normalmente."}
            </p>
            {!data.is_historical ? (
              <p className="mt-2 text-sm">
                Minha ciência:{" "}
                {p.personalScience
                  ? "registrada"
                  : p.eligible
                    ? "pendente"
                    : "sem habilitação neste paciente"}
                .
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {p.science.map((row) => (
                <li
                  className="doc-person-block hca-science-person"
                  key={row.id}
                >
                  <strong>{row.actor_name}</strong>
                  <p>
                    {modes[row.mode] ?? row.mode} ·{" "}
                    {formatBrazilDate(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>

            {p.manualArchiveRequired ? (
              <Notice>
                Concluída com ciência obrigatória pendente. O arquivamento
                automático está bloqueado; um responsável autorizado poderá
                arquivar com justificativa, sem inventar ciência.
              </Notice>
            ) : null}

            {p.archivedAt ? (
              <p className="mt-3 text-sm">
                Arquivado em {formatBrazilDate(p.archivedAt)} ·{" "}
                {p.archiveReason}
              </p>
            ) : null}
          </DocumentSection>
        </DocumentPanel>
        <DocumentPanel value="communications"><DocumentCommunications id={id} version={p.version} /></DocumentPanel>
        <DocumentPanel value="files">
          {data.receipt ? <RequisitionReceiptCard receipt={data.receipt} /> : null}
          <DocumentActions
            generationBlocked={stale}
            readOnly={Boolean(p.archivedAt)}
            actionTarget={fileActionTarget}
            onAction={() => tabs.select("files")}
            id={id}
            code={data.code ?? data.protocol}
            version={p.version}
          />
        </DocumentPanel>
        <DocumentPanel value="attachments">
          <Attachments
            patientId={data.care_recipient_id}
            documentId={id}
            writable={!p.archivedAt && can(context, "req.create")}
          />
        </DocumentPanel>
        <DocumentPanel value="history">
          <OpeningHistory id={id} refreshKey={openingRevision} authorized={can(context, "document.access.read")} />
          <DocumentTimeline id={id} version={p.version} events={p.events} />
        </DocumentPanel>
        {can(context, "audit.read") ? (
          <DocumentPanel value="audit">
            <DocumentAuditAccess patientId={data.care_recipient_id} />
          </DocumentPanel>
        ) : null}
      </DocumentTabs>
      {decision ? (
        <RequisitionDecisionEditor
          key={`${context.userId}:${data.care_recipient_id}:${data.id}:${decision.purpose}:${decision.consulting}`}
          id={data.id}
          patientId={data.care_recipient_id}
          context={context}
          purpose={decision.purpose}
          consulting={decision.consulting}
          restoreFocusTo={decision.trigger}
          restoreFocusFallbackRef={moreTriggerRef}
          onClose={() => setDecision(null)}
          onSaved={(result) => {
            setDecision(null);
            setAttempt((value) => value + 1);
            setStockOutcome(result ?? null);
            setMessage(result ? "" : "Decisão registrada ou recuperada. Consulte os fatos atuais desta requisição.");
          }}
        />
      ) : null}
      {stockOutcome && context.patient?.id === data.care_recipient_id ? (
        <Dialog open title="Ficha cancelada"
          kicker={data.code ?? data.protocol}
          onClose={() => setStockOutcome(null)}
          finalFocus={moreTriggerRef}
          footer={<ActionButton variant="primary" onClick={() => setStockOutcome(null)}>Voltar à ficha</ActionButton>}>
          <div className="hca-form-stack">
            <p>{stockOutcome.choice === "reverse"
              ? "O ajuste de estoque da emissão foi revertido. As movimentações posteriores foram preservadas."
              : "A contagem informada na emissão da REQ foi mantida. As movimentações posteriores foram preservadas."}</p>
            {can(context, "stock.team.read") && stockOutcome.lines.length ? (
              <ul className="hca-form-stack">
                {stockOutcome.lines.map((line) => (
                  <li className="hca-record" key={line.productId}>
                    <strong>{line.name}</strong>
                    <span>Saldo no cancelamento {formatQuantity(line.current)} → {formatQuantity(stockOutcome.choice === "reverse" ? line.afterReversal : line.current, line.currentUnit)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
