"use client";
import { roleLabel } from "@/components/layout/workspace-context";
import { Pill } from "@/components/ui/controls";
import { DocumentBreadcrumb } from "@/components/documents/document-breadcrumb";
import Link from "next/link";
import { SettingsSection } from "@/components/forms/settings-section";
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
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import {
  formatStockObservation,
  formatStockObservationTime,
} from "@/lib/stock-observation";
import type {
  StockObservation,
  StockObservationTimeSource,
} from "@/types/requisition";
import { textRows } from "@/lib/text-rows";
import { requisitionDocumentState } from "@/lib/documents/presentation";
import { Attachments } from "@/components/documents/attachments";
import { DocumentHeader } from "@/components/documents/document-header";
import {
  DocumentTabs,
  DocumentPanel,
  DocumentAuditAccess,
  useDocumentTabs,
} from "@/components/documents/document-tabs";
import { DocumentActions } from "@/components/documents/document-actions";
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
import { requisitionDecisionLabels } from "@/lib/forms/requisition-decision-draft";
import {
  requisitionOperationPurposes,
  type RequisitionOperationPurpose,
} from "@/lib/validation/supply-drafts";
import { ResolveExtraItem } from "./resolve-extra-item";
import { RequisitionDisplay, OpeningHistory } from "./requisition-display";
import {
  deliveryLabels,
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
  policy: { scienceRequired?: boolean } | null;
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
    current_stock: string | null;
    stock_observation?: StockObservation;
    stock_observation_at?: string | null;
    stock_observation_time_source?: StockObservationTimeSource;
    urgent: boolean;
    resolution?: { product_id: string } | null;
  }[];
  requisition_observations: { body: string }[];
  requisition_notifications: DeliveryStatus[];
  fulfillment: {
    total: number;
    fulfilled: number;
    lines: {
      id: string;
      attended: boolean;
      deliveries: { id: string; code: string; acceptedQuantity: string }[];
    }[];
  };
  progress: Progress;
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

export function RequisitionDocumentContent({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const revision = useLiveRevision();
  const tabs = useDocumentTabs(can(context, "audit.read"));
  const [progressActionTarget, setProgressActionTarget] =
    useState<HTMLDivElement | null>(null);
  const [fileActionTarget, setFileActionTarget] =
    useState<HTMLDivElement | null>(null);
  const [openingRevision, setOpeningRevision] = useState("initial");
  const [data, setData] = useState<Detail | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(true);
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
    void api<{ data: Detail }>(
      `/api/requisitions/${id}`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result.data);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
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
  }, [id, attempt, revision]);
  async function recordScience() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/requisitions/${id}/science`, {
        mode: "express",
        expectedVersion: data.progress.version,
        materialIdentity: data.progress.materialIdentity,
      });
      setMessage("Ciência expressa registrada com sua identidade.");
      setAttempt((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div className="space-y-3">
        <h1>Requisição e acompanhamento</h1>
        <Notice error={Boolean(error)}>
          {error || "Carregando requisição…"}
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
  const documentState = requisitionDocumentState({
    historical: data.is_historical,
    status: data.status,
    archivedAt: p.archivedAt,
    completedAt: p.completedAt,
    scienceSatisfied: p.scienceSatisfied,
    fulfilled: f.fulfilled,
  });
  return (
    <div className="hca-record-detail space-y-5">
      <DocumentBreadcrumb code={data.code ?? data.protocol} />
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}

      <DocumentHeader
        headingLevel={1}
        progressActionRef={setProgressActionTarget}
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
          data.requisition_items.some((item) => item.urgent) ? (
            <Pill tone="danger">
              {data.requisition_items.filter((item) => item.urgent).length}{" "}
              {data.requisition_items.filter((item) => item.urgent).length === 1
                ? "item urgente"
                : "itens urgentes"}
            </Pill>
          ) : null
        }
        showFiles={false}
        actions={
          <>
            {!data.is_historical &&
            !p.archivedAt &&
            data.status !== "cancelled" ? (
              <>
                {can(context, "ent.create") ? (
                  <Link
                    className={primaryClass}
                    href={`/fichas/ent?requisitionId=${id}`}
                  >
                    Expedir ENT vinculada
                  </Link>
                ) : null}
              </>
            ) : null}
            {!data.is_historical &&
            p.eligible &&
            !p.archivedAt &&
            data.status !== "cancelled" &&
            !p.science.some(
              (row) => row.user_id === context.userId && row.mode === "express",
            ) ? (
              <button
                type="button"
                className={primaryClass}
                disabled={busy}
                onClick={() => void recordScience()}
              >
                Li a requisição e confirmo minha ciência
              </button>
            ) : null}
          </>
        }
        secondaryActions={
          <>
            {!data.is_historical &&
            !p.archivedAt &&
            data.status !== "cancelled" ? (
              <>
                {can(context, "com.create") ? (
                  <Link
                    className={buttonClass}
                    href={`/fichas/com?requisitionId=${id}`}
                  >
                    Abrir COM vinculada
                  </Link>
                ) : null}
              </>
            ) : null}
            {p.completedAt && !p.archivedAt && can(context, "req.archive") ? (
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() => openDecision("archive")}
              >
                Revisar arquivamento manual
              </button>
            ) : null}
            {!data.is_historical &&
            !p.archivedAt &&
            data.status !== "cancelled" &&
            can(context, "req.review") &&
            can(context, "req.create") ? (
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() => openDecision("cancel")}
              >
                Cancelar requisição
              </button>
            ) : null}
            {!data.is_historical && can(context, "req.create") ? (
              <Link
                className={buttonClass}
                href={`/fichas/req?careRecipientId=${data.care_recipient_id}&sourceRequisitionId=${id}`}
              >
                Declarar nova necessidade remanescente
              </Link>
            ) : null}
          </>
        }
        moreTriggerRef={moreTriggerRef}
        id={id}
        type="REQ"
        code={data.code ?? data.protocol}
        protocol={data.protocol}
        status={documentState}
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
      <RequisitionDisplay
        key={id}
        id={id}
        reference={p}
        onRecorded={setOpeningRevision}
      />
      <details className="ui-card">
        <summary>Minhas decisões em preparação</summary>
        <p>
          Consulte ou descarte seus próprios preenchimentos e reconheça
          resultados anteriores. Esta consulta não repete decisões oficiais.
        </p>
        <div className="hca-toolbar">
          {requisitionOperationPurposes.map((purpose) => (
            <button
              key={purpose}
              type="button"
              className={buttonClass}
              onClick={() => openDecision(purpose, true)}
            >
              Consultar preparação: {requisitionDecisionLabels[purpose]}
            </button>
          ))}
        </div>
      </details>
      <DocumentTabs
        type="REQ"
        value={tabs.value}
        onSelect={tabs.select}
        auditAllowed={can(context, "audit.read")}
      >
        <DocumentPanel value="overview">
          <DocumentNextStep
            label="Ciência e atendimento"
            pending={
              !data.is_historical &&
              !p.archivedAt &&
              data.status !== "cancelled" &&
              (f.fulfilled < f.total || !p.scienceSatisfied)
            }
            onOpen={() => tabs.select("workflow")}
          />
          <section
            className="ui-card"
            aria-label="Dimensões independentes da requisição"
          >
            <div className="my-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-(--background) p-3">
                <p className="text-xs text-(--muted)">Atendimento</p>
                <strong>
                  {f.fulfilled}/{f.total} itens atendidos
                </strong>
                <p className="text-xs">
                  {f.total > 0 && f.fulfilled === f.total
                    ? "Completo"
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
          <section className="ui-card">
            <h2 className="font-semibold">Observações</h2>
            {data.requisition_observations.length ? (
              textRows(
                data.requisition_observations.map((row) => row.body),
              ).map((row) => (
                <p key={row.key} className="mt-2 text-sm">
                  {row.value}
                </p>
              ))
            ) : (
              <p className="mt-2 text-sm text-(--muted)">Sem observações.</p>
            )}
          </section>
          <DocumentProgress
            actionTarget={progressActionTarget}
            onAction={() => tabs.select("overview")}
            id={id}
            type="REQ"
            patientId={data.care_recipient_id}
            context={context}
          />
        </DocumentPanel>
        <DocumentPanel value="materials">
          <section className="ui-card">
            <h2 className="font-semibold">Materiais requisitados</h2>
            <p className="mt-2 text-xs text-(--muted)">
              Uma linha é atendida após aceite positivo em ENT vinculada.
              Compras não atendem itens da REQ.
            </p>
            <ul className="mt-4 space-y-3">
              {data.requisition_items.map((item) => {
                const line = f.lines.find((row) => row.id === item.id);
                return (
                  <li
                    className="rounded-lg border border-(--line) p-3"
                    key={item.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm">
                        {item.product_name_snapshot ?? item.custom_name}
                      </strong>
                      <span
                        className={
                          "ui-badge ui-badge-" +
                          (line?.attended ? "success" : "pending")
                        }
                      >
                        {line?.attended ? "Atendido" : "Pendente"}
                      </span>
                      {item.urgent ? (
                        <span className="ui-badge ui-badge-danger">
                          Urgente
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-(--muted)">
                      Estoque da equipe informado:{" "}
                      {formatStockObservation(
                        item.current_stock,
                        item.stock_observation,
                        item.unit_snapshot,
                      )}
                      <span className="block text-xs text-(--muted)">
                        {formatStockObservationTime(
                          item.stock_observation_at,
                          item.stock_observation_time_source,
                        )}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {line?.deliveries.map((delivery) => (
                        <RelatedDocument
                          key={delivery.id}
                          id={delivery.id}
                          type="ENT"
                          label={`${delivery.code} · aceito ${delivery.acceptedQuantity}`}
                        />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          {can(context, "catalog.manage") &&
          can(context, "req.review") &&
          data.requisition_items.some(
            (item) => !item.product_id && !item.resolution,
          ) ? (
            <ResolveExtraItem onOpen={() => openDecision("resolve_extra")} />
          ) : null}
        </DocumentPanel>
        <DocumentPanel value="workflow">
          <section className="ui-card">
            <h2 className="font-semibold">Ciência e responsáveis</h2>
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
                  className="rounded-lg border border-(--line) p-3 text-sm"
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
          </section>
        </DocumentPanel>
        <DocumentPanel value="communications">
          <SettingsSection
            title="Avisos e acompanhamento"
            summary={
              data.requisition_notifications.length +
              " aviso(s) · estados do aplicativo e do provedor são independentes"
            }
          >
            <p className="mt-2 text-xs text-(--muted)">
              Enviado, entregue, lido e ciência são fatos independentes.
            </p>
            <ul className="mt-3 space-y-2">
              {data.requisition_notifications.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-(--line) p-3 text-sm"
                >
                  {row.recipient_label} · {row.channel} ·{" "}
                  {deliveryLabels[row.state] ?? row.state}
                </li>
              ))}
            </ul>
            {!data.requisition_notifications.length ? (
              <p className="mt-3 text-sm">Nenhum aviso disponível.</p>
            ) : null}
          </SettingsSection>
        </DocumentPanel>
        <DocumentPanel value="files">
          <DocumentActions
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
            writable={can(context, "req.create")}
          />
        </DocumentPanel>
        <DocumentPanel value="history">
          <OpeningHistory id={id} refreshKey={openingRevision} />
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
          onSaved={() => {
            setDecision(null);
            setAttempt((value) => value + 1);
            setMessage(
              "Decisão registrada ou recuperada. Consulte os fatos atuais desta requisição.",
            );
          }}
        />
      ) : null}
    </div>
  );
}
