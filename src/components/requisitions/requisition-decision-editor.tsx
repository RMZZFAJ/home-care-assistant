"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { z } from "zod";
import {
  ActionButton,
  DefinitionGrid,
  FormField,
  SelectField,
  TextAreaField,
} from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { RequisitionStockCancellationDialog, type RequisitionStockOutcome } from "./requisition-stock-cancellation";
import { DraftContentSummary } from "@/components/forms/creation-draft-panel";
import { useDocumentDecision, DocumentDecisionFailure } from "@/components/documents/use-document-decision";
import { DocumentArchivePolicy } from "@/components/documents/document-archive-policy";
import { DocumentOperationFailureDialog, operationRecoveryLimit, type DocumentOperationFailure } from "@/components/documents/document-operation-failure-dialog";
import type { DocumentDecisionIntention } from "@/lib/validation/document-decisions";
import {
  adoptRequisitionDecisionReference,
  emptyRequisitionDecisionDraft,
  requisitionDecisionAvailable,
  requisitionDecisionLabels,
  type RequisitionDecisionProduct,
} from "@/lib/forms/requisition-decision-draft";
import {
  parseRequisitionDecisionReference,
  requisitionDecisionPacketSchema,
  requireRequisitionDecisionResult,
  type RequisitionDecisionReference,
  type RequisitionDecisionPacket,
  type RequisitionStockChoice,
} from "@/lib/validation/requisition-decisions";
import type {
  ReceiptDraftContent,
  RequisitionOperationPurpose,
} from "@/lib/validation/supply-drafts";

type Reference = {
  document: RequisitionDecisionReference;
  products: RequisitionDecisionProduct[];
};
type CancellationFailure = DocumentOperationFailure & { stockChoice?: RequisitionStockChoice; reviewReference?: boolean };
const cancellationUnconfirmed = "O resultado continua sem confirmação. Confira a mesma tentativa antes de repetir o cancelamento.";
const productResponse = z.object({
  data: z
    .array(
      z
        .object({
          id: z.string().min(1).max(120),
          name: z.string(),
          unit: z.string(),
          active: z.literal(true),
        })
        .passthrough(),
    )
    .max(1000),
});

export function RequisitionDecisionEditor({
  id,
  patientId,
  context,
  purpose,
  consulting = false,
  restoreFocusTo,
  restoreFocusFallbackRef,
  onClose,
  onSaved,
}: {
  id: string;
  patientId: string;
  context: WorkspaceContext;
  purpose: RequisitionOperationPurpose;
  consulting?: boolean;
  restoreFocusTo: HTMLElement | null;
  restoreFocusFallbackRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSaved: (stockOutcome?: RequisitionStockOutcome) => void;
}) {
  const isCancellation = purpose === "cancel";
  const [baseline, setBaseline] = useState<ReceiptDraftContent | null>(null),
    [fields, setFields] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<Reference | null>(null),
    [comparison, setComparison] = useState<Reference | null>(null);
  const [needsReference, setNeedsReference] = useState(true),
    [unavailable, setUnavailable] = useState(true);
  const [busy, setBusy] = useState(false),
    [reviewing, setReviewing] = useState(false),
    [choosingStock, setChoosingStock] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{
    field: string;
    message: string;
  } | null>(null);
  const [cancellationFailure, setCancellationFailure] = useState<CancellationFailure | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const restoredRef = useRef(false),
    returnFocusRef = useRef(false),
    headingRef = useRef<HTMLHeadingElement>(null),
    reasonRef = useRef<HTMLTextAreaElement>(null),
    itemRef = useRef<HTMLSelectElement>(null),
    productRef = useRef<HTMLSelectElement>(null),
    readRecoveryRef = useRef<HTMLButtonElement>(null),
    readOnlyHeadingRef = useRef<HTMLHeadingElement>(null),
    initialFocusRef = useRef(false),
    pendingRef = useRef<RequisitionDecisionPacket | null>(null);
  const scopeMatches = context.patient?.id === patientId;
  const roleAllows =
    purpose === "archive"
      ? can(context, "req.archive")
      : can(context, "req.review") &&
        (purpose !== "cancel" || can(context, "req.create")) &&
        (purpose !== "resolve_extra" || can(context, "catalog.manage"));
  const decision = useDocumentDecision({ userId: context.userId, documentId: id, domain: "requisition", action: purpose });
  const uncertain = decision.uncertain || cancellationFailure?.outcome === "uncertain";
  const recoveryExhausted = recoveryAttempts >= operationRecoveryLimit;
  const activeFailure: CancellationFailure | null = cancellationFailure ?? (purpose === "cancel" && decision.uncertain && decision.recoveryMessage
    ? { outcome: "uncertain", description: cancellationUnconfirmed } : null);
  useOperationActivity(!reference && !error && !consulting && scopeMatches, { title: "Consultando a requisição", detail: "Estamos conferindo a referência autorizada para este preenchimento." });
  const readReference = useCallback(
    async (
      signal?: AbortSignal,
      minimumVersion?: number,
    ): Promise<Reference> => {
      const [document, catalogue] = await Promise.all([
        api<unknown>(
          `/api/requisitions/${id}/decision-context`,
          undefined,
          signal,
        ),
        purpose === "resolve_extra"
          ? api<unknown>(
              `/api/catalog?careRecipientId=${patientId}`,
              undefined,
              signal,
            )
          : Promise.resolve({ data: [] }),
      ]);
      const parsed = productResponse.safeParse(catalogue);
      if (
        !parsed.success ||
        new Set(parsed.data.data.map((product) => product.id)).size !==
          parsed.data.data.length
      )
        throw new Error(
          "Não foi possível conferir o catálogo atual. Consulte novamente; sua escolha foi preservada.",
        );
      return {
        document: parseRequisitionDecisionReference(document, {
          id,
          patientId,
          minimumVersion,
        }),
        products: parsed.data.data,
      };
    },
    [id, patientId, purpose],
  );
  useEffect(() => {
    if (consulting || !scopeMatches) return;
    const controller = new AbortController();
    void readReference(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setReference(next);
        if (!restoredRef.current) {
          const content = emptyRequisitionDecisionDraft(next.document, purpose);
          setBaseline(content);
          setFields(previous => ({ ...content.fields, ...previous }));
          setNeedsReference(false);
          setUnavailable(false);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar a requisição.",
          );
      });
    return () => controller.abort();
  }, [purpose, consulting, scopeMatches, readReference]);
  useEffect(() => {
    if (reviewing && !choosingStock) headingRef.current?.focus();
  }, [reviewing, choosingStock]);
  useEffect(() => {
    if (!busy && !reviewing && returnFocusRef.current) {
      returnFocusRef.current = false;
      (reasonRef.current ?? readRecoveryRef.current ?? readOnlyHeadingRef.current ?? headingRef.current)?.focus();
    }
  }, [busy, reviewing]);
  const content = baseline ? { ...baseline, fields } : null;
  const readOnly = !reviewing && (consulting || !scopeMatches || !roleAllows || !can(context, "req.read"));
  const available =
    !!reference && requisitionDecisionAvailable(reference.document, purpose);
  const allowed =
    !readOnly &&
    !needsReference &&
    !unavailable &&
    available;
  const errorText = (cause: unknown) =>
    cause instanceof Error
      ? cause.message
      : "Não foi possível concluir. Seus campos foram preservados.";
  function setField(name: string, value: string) {
    setFields((previous) => ({ ...previous, [name]: value }));
    setFieldError((previous) => (previous?.field === name ? null : previous));
    setDirty(true);
  }
  async function compare() {
    if (busy || uncertain) return;
    setBusy(true);
    setNeedsReference(true);
    setUnavailable(true);
    setComparison(null);
    setError("");
    try {
      setComparison(await readReference(undefined, baseline?.documentVersion));
    } catch (cause) {
      setError(errorText(cause));
      returnFocusRef.current = true;
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (!content || !allowed || busy || uncertain) return;
    if (purpose === "resolve_extra" && (!fields.itemId || !fields.productId)) {
      const field = fields.itemId ? "productId" : "itemId";
      setFieldError({
        field,
        message:
          field === "itemId"
            ? "Selecione o item extra desta requisição."
            : "Selecione o produto após conferir nome e unidade.",
      });
      (field === "itemId" ? itemRef : productRef).current?.focus();
      return;
    }
    const packet = requisitionDecisionPacketSchema.safeParse({
      action: purpose,
      body: {
        reason: fields.reason ?? "",
        ...(purpose === "resolve_extra"
          ? { itemId: fields.itemId, productId: fields.productId }
          : {}),
      },
      expectedVersion: content.documentVersion,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!packet.success) {
      setFieldError({
        field: "reason",
        message: packet.error.issues[0]?.message ?? "Confira a justificativa.",
      });
      reasonRef.current?.focus();
      return;
    }
    setBusy(true);
    setFieldError(null);
    setError("");
    setNeedsReference(true);
    setUnavailable(true);
    try {
      const current = await readReference(undefined, content.documentVersion);
      if (
        current.document.referenceHash !== fields.referenceHash ||
        current.document.documentVersion !== content.documentVersion ||
        !requisitionDecisionAvailable(current.document, purpose)
      ) {
        setComparison(current);
        setNeedsReference(true);
        setUnavailable(true);
        throw new Error(
          "A referência da requisição mudou. Compare e adote o estado atual antes de revisar; seus campos foram preservados.",
        );
      }
      if (
        purpose === "resolve_extra" &&
        (!current.document.items.some(
          (item) => item.id === fields.itemId && item.extra && !item.resolved,
        ) ||
          !current.products.some(
            (product) =>
              product.id === fields.productId &&
              product.name === fields.productLabel &&
              product.unit === fields.productUnit,
          ))
      ) {
        setComparison(current);
        setNeedsReference(true);
        setUnavailable(true);
        throw new Error(
          "A escolha precisa de nova conferência. Substitua explicitamente o item ou o produto indisponível.",
        );
      }
      setReference(current);
      setNeedsReference(false);
      setUnavailable(false);
      pendingRef.current = packet.data;
      setReviewing(true);
      if (isCancellation) {
        if (current.document.stockCancellation) setChoosingStock(true);
        else await confirm();
      }
    } catch (cause) {
      setError(errorText(cause));
      returnFocusRef.current = true;
    } finally {
      setBusy(false);
    }
  }
  function verifyDecision(row: Record<string, unknown>, intention: DocumentDecisionIntention) {
    requireRequisitionDecisionResult(row, { action: purpose, body: requisitionDecisionPacketSchema.shape.body.parse(intention.body) }, { id, patientId });
  }
  const stockComparison = purpose === "cancel" ? reference?.document.stockCancellation : undefined;
  async function confirm(stockChoice?: RequisitionStockChoice, recovering = false) {
    if (busy || !scopeMatches || (recovering && recoveryExhausted)) return;
    const packet = pendingRef.current;
    if (!packet && !uncertain) return;
    if (!uncertain && stockComparison && !stockChoice) {
      setChoosingStock(true);
      return;
    }
    setChoosingStock(false);
    setBusy(true); setError("");
    setCancellationFailure(null);
    if (recovering) setRecoveryAttempts(count => count + 1);
    try {
      const outcome = uncertain ? await decision.checkPrevious(verifyDecision) : await decision.execute({
        domain: "requisition", action: purpose, body: {
          ...packet!.body,
          ...(stockChoice && stockComparison ? { stockChoice, stockReference: stockComparison.reference } : {}),
        },
        expectedVersion: packet!.expectedVersion, referenceHash: fields.referenceHash,
      }, verifyDecision);
      if (!outcome) {
        if (purpose === "cancel" && uncertain) setCancellationFailure({ outcome: "uncertain", description: cancellationUnconfirmed, stockChoice });
        return;
      }
      if (purpose === "cancel" && outcome.state === "not_applied") {
        setCancellationFailure({ outcome: "rejected", description: "A conferência confirmou que nada foi alterado nesta tentativa.",
          stockChoice, reviewReference: !packet || Boolean(stockComparison && !stockChoice) });
        return;
      }
      pendingRef.current = null; setReviewing(false);
      if (outcome.state === "applied") {
        setDirty(false);
        const chosen = outcome.result.stockChoice;
        if (chosen === "keep" || chosen === "reverse") {
          const lines = stockComparison?.reference === outcome.intention.body.stockReference &&
            can(context, "stock.team.read") ? stockComparison?.lines ?? [] : [];
          onSaved({ choice: chosen, lines });
        } else onSaved();
      }
      else setError("A conferência confirmou que nada foi alterado. Seus campos continuam nesta tela. Se o erro persistir, procure a supervisão.");
    } catch (cause) {
      if (purpose === "cancel") {
        const rejected = cause instanceof DocumentDecisionFailure && cause.outcome === "not_applied";
        const source = cause instanceof DocumentDecisionFailure ? cause.cause : cause;
        setCancellationFailure({ outcome: rejected ? "rejected" : "uncertain", cause: source, stockChoice,
          description: rejected ? "A conferência confirmou que nada foi alterado nesta tentativa." : cancellationUnconfirmed,
          reviewReference: rejected && source instanceof ApiError && [401, 403, 409].includes(source.status) });
        return;
      }
      setError(errorText(cause));
      if (cause instanceof DocumentDecisionFailure && cause.outcome === "not_applied") { pendingRef.current = null; setReviewing(false); returnFocusRef.current = true; }
    }
    finally { setBusy(false); }
  }
  const selectedItem =
      !unavailable &&
      reference?.document.items.find(
        (item) => item.id === fields.itemId && item.extra && !item.resolved,
      ),
    selectedProduct =
      !unavailable &&
      reference?.products.find((product) => product.id === fields.productId);
  useEffect(() => {
    if (
      !initialFocusRef.current &&
      baseline &&
      !readOnly &&
      !busy
    ) {
      initialFocusRef.current = true;
      reasonRef.current?.focus();
    }
  }, [baseline, readOnly, busy]);
  function refreshCancellationReview() {
    pendingRef.current = null;
    setCancellationFailure(null);
    setReviewing(false);
    void compare();
  }
  if (choosingStock && scopeMatches && stockComparison && reference) return (
    <RequisitionStockCancellationDialog
      code={reference.document.code}
      comparison={stockComparison}
      onClose={() => {
        pendingRef.current = null;
        returnFocusRef.current = true;
        setReviewing(false);
        setChoosingStock(false);
      }}
      onConfirm={(choice) => void confirm(choice)}
    />
  );
  return (
    <RecordDrawer
      exitDialog
      modal={isCancellation}
      keyboardScrollable={isCancellation}
      popupClassName={isCancellation ? "hca-wizard-dialog hca-cancellation-review" : undefined}
      kicker={isCancellation && reference ? `${reference.document.code} · ${context.patient?.display_name ?? "Paciente identificado na ficha"}` : undefined}
      subtitle={isCancellation ? "Confira os efeitos desta decisão antes de confirmar." : undefined}
      title={
        isCancellation ? "Revisar e cancelar" : reviewing
          ? "Revisar decisão da requisição"
          : requisitionDecisionLabels[purpose]
      }
      busy={busy || decision.busy}
      hasUnsavedChanges={dirty}
      uncertainOutcome={uncertain || decision.uncertain}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
      onClose={onClose}
      footer={isCancellation ? requestClose => <>
        <ActionButton variant="quiet" disabled={busy || decision.busy} onClick={requestClose}><Icon name="back" />Voltar à ficha</ActionButton>
        {!readOnly && !uncertain ? <ActionButton variant="danger" disabled={!allowed || busy || decision.busy} onClick={() => void review()}>
          <Icon name="close" />Confirmar cancelamento
        </ActionButton> : null}
      </> : undefined}
      recovery={requestClose => scopeMatches && activeFailure && !busy && !decision.busy ? <DocumentOperationFailureDialog
        {...activeFailure} title="Não foi possível cancelar a requisição" operation="Cancelar requisição"
        fallbackCode="CANCELAMENTO_SEM_CONFIRMACAO" attempts={recoveryAttempts} closeLabel="Voltar à ficha" onClose={requestClose}
        action={activeFailure.reviewReference ? { label: "Consultar versão atual", onClick: refreshCancellationReview }
          : !recoveryExhausted && (uncertain || allowed) ? { label: uncertain ? "Conferir resultado" : "Tentar novamente",
            onClick: () => void confirm(activeFailure.stockChoice, true) } : undefined}
        exhaustedMessage={recoveryExhausted ? "Copie os detalhes para a supervisão e volte à ficha." : undefined} /> : null}
    >
      <div className="hca-form-stack">
        {!activeFailure && decision.recoveryMessage ? <Notice>{decision.recoveryMessage}</Notice> : null}
        {!activeFailure && (error || decision.error) ? <Notice error>{error || decision.error}</Notice> : null}
        {!scopeMatches ? (
          <Notice>
            O paciente selecionado mudou. Feche esta consulta para continuar no
            contexto atual.
          </Notice>
        ) : readOnly ? <Notice>Esta ação não está disponível neste estado ou perfil. Feche para continuar a consulta da ficha.</Notice> : (
          <>

            <div className="hca-toolbar">

              {!reviewing ? (
                <ActionButton
                  disabled={busy || uncertain}
                  onClick={() => void compare()}
                >
                  Comparar referência atual
                </ActionButton>
              ) : null}
            </div>
            {comparison ? (
              <section
                className="ui-card hca-form-stack"
                aria-label="Comparação da referência da requisição"
              >
                <h3>Referência preservada e atual</h3>
                <p>
                  Versão preservada{" "}
                  {baseline?.documentVersion ?? "Não consultada"}; atual{" "}
                  {comparison.document.documentVersion}. Estado atual:{" "}
                  {comparison.document.historical
                    ? "Registro histórico; não representa pendência operacional atual"
                    : comparison.document.status === "cancelled"
                      ? "Cancelada"
                      : comparison.document.archivedAt
                        ? "Arquivada"
                        : comparison.document.completedAt
                          ? "Atendimento concluído"
                          : "Em acompanhamento"}
                  .
                </p>
                {content ? (
                  <DraftContentSummary
                    content={content}
                    kind="REQ"
                    purpose={purpose}
                  />
                ) : null}
                <ActionButton
                  disabled={
                    busy ||
                    !requisitionDecisionAvailable(comparison.document, purpose)
                  }
                  onClick={() => {
                    const next = content
                      ? adoptRequisitionDecisionReference(
                          content,
                          comparison.document,
                          comparison.products,
                        )
                      : emptyRequisitionDecisionDraft(
                          comparison.document,
                          purpose,
                        );
                    setBaseline(next);
                    setFields(next.fields);
                    setReference(comparison);
                    setComparison(null);
                    setNeedsReference(false);
                    setUnavailable(false);
                    setDirty(true);
                    setError("");
                    requestAnimationFrame(() => reasonRef.current?.focus());
                  }}
                >
                  Adotar estado atual e revisar meus campos
                </ActionButton>
                {!requisitionDecisionAvailable(comparison.document, purpose) ? (
                  <Notice>
                    Esta decisão não está disponível no estado atual. Seu
                    preenchimento permanece nesta tela; sair o descarta.
                  </Notice>
                ) : null}
              </section>
            ) : null}
            {isCancellation && reference && !unavailable ? <>
              <DefinitionGrid items={[
                { label: "Ficha", value: reference.document.code },
                { label: "Paciente", value: context.patient?.display_name ?? "Paciente identificado na ficha" },
                { label: "Responsável pela ação", value: context.fullName },
                { label: "Referência", value: `Versão ${reference.document.documentVersion}` },
              ]} />
              <ul className="hca-cancellation-checklist">
                <li><Icon name="check-circle" /><div><strong>Vínculos e histórico</strong><p>Os registros anteriores serão preservados.</p></div></li>
                <li><Icon name="file" /><div><strong>Atendimento registrado</strong><p>{reference.document.fulfillment.fulfilled} de {reference.document.fulfillment.total} materiais atendidos.</p></div></li>
              </ul>
              {stockComparison ? <p className="hca-field-help">Na confirmação, você escolhe se mantém ou reverte o ajuste de estoque da emissão.</p> : null}
            </> : null}
            {!isCancellation ? <h3 ref={headingRef} tabIndex={-1}>
              {reviewing
                ? "Conferir decisão antes de confirmar"
                : "Preencher decisão"}
            </h3> : null}
            {!isCancellation && !unavailable && reference ? (
              <p>
                {reference.document.code} · versão{" "}
                {reference.document.documentVersion}.{" "}
                {reference.document.historical ? (
                  "Registro histórico: a identificação preserva o conteúdo original e não cria uma nova necessidade operacional."
                ) : (
                  <>
                    Atendimento: {reference.document.fulfillment.fulfilled}/
                    {reference.document.fulfillment.total} itens.
                  </>
                )}
              </p>
            ) : null}
            {!isCancellation && reviewing ? (
              <>
                <p>
                  <strong>{requisitionDecisionLabels[purpose]}</strong>
                </p>
                {scopeMatches ? (
                  <>
                    <p className="whitespace-pre-wrap wrap-break-word">
                      Sua justificativa: {fields.reason}
                    </p>
                    {purpose === "resolve_extra" ? (
                      <p>
                        {fields.itemLabel} → {fields.productLabel} ·{" "}
                        {fields.productUnit}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <Notice>
                    O preenchimento não está disponível para consulta nesta
                    sessão.
                  </Notice>
                )}
                {uncertain ? (
                  <Notice>
                    O resultado não foi confirmado. Recupere a mesma tentativa
                    antes de preparar outra decisão.
                  </Notice>
                ) : null}
                <div className="hca-toolbar">
                  {!uncertain ? (
                    <ActionButton
                      disabled={busy}
                      onClick={() => {
                        pendingRef.current = null;
                        setReviewing(false);
                        requestAnimationFrame(() => reasonRef.current?.focus());
                      }}
                    >
                      Voltar aos meus campos
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    variant="primary"
                    disabled={busy || !scopeMatches}
                    onClick={() => void confirm()}
                  >
                    {busy
                      ? "Consultando resultado…"
                      : uncertain
                        ? "Recuperar mesma decisão"
                        : purpose === "archive"
                          ? "Confirmar arquivamento"
                          : "Confirmar associação"}
                  </ActionButton>
                </div>
              </>
            ) : (
              <form
                className="hca-form-stack"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void review();
                }}
              >
                {purpose === "resolve_extra" ? (
                  <>
                    <FormField
                      label="Item extra"
                      error={
                        fieldError?.field === "itemId"
                          ? fieldError.message
                          : undefined
                      }
                    >
                      <SelectField
                        ref={itemRef}
                        aria-label="Item extra"
                        value={fields.itemId ?? ""}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          const item = reference?.document.items.find(
                            (item) => item.id === value,
                          );
                          setFields((previous) => ({
                            ...previous,
                            itemId: value,
                            itemLabel: item?.name ?? "",
                          }));
                          setDirty(true);
                          setFieldError(null);
                        }}
                        required
                        disabled={unavailable}
                      >
                        <option value="">Selecione o item extra</option>
                        {fields.itemId && !selectedItem ? (
                          <option value={fields.itemId}>
                            {fields.itemLabel || "Escolha preservada"} ·
                            indisponível
                          </option>
                        ) : null}
                        {!unavailable
                          ? reference?.document.items
                              .filter((item) => item.extra && !item.resolved)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name ?? "Item extra"}
                                </option>
                              ))
                          : null}
                      </SelectField>
                    </FormField>
                    <FormField
                      label="Produto correspondente"
                      error={
                        fieldError?.field === "productId"
                          ? fieldError.message
                          : undefined
                      }
                    >
                      <SelectField
                        ref={productRef}
                        aria-label="Produto correspondente"
                        value={fields.productId ?? ""}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          const product = reference?.products.find(
                            (product) => product.id === value,
                          );
                          setFields((previous) => ({
                            ...previous,
                            productId: value,
                            productLabel: product?.name ?? "",
                            productUnit: product?.unit ?? "",
                          }));
                          setDirty(true);
                          setFieldError(null);
                        }}
                        required
                        disabled={unavailable}
                      >
                        <option value="">
                          Selecione após conferir nome e unidade
                        </option>
                        {fields.productId && !selectedProduct ? (
                          <option value={fields.productId}>
                            {fields.productLabel || "Escolha preservada"} ·
                            indisponível
                          </option>
                        ) : null}
                        {!unavailable
                          ? reference?.products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} · {product.unit}
                              </option>
                            ))
                          : null}
                      </SelectField>
                    </FormField>
                    <a
                      href="/admin?section=catalog"
                      target="_blank"
                      rel="noopener"
                      className="hca-control"
                    >
                      Cadastrar produto
                    </a>
                  </>
                ) : null}
                <FormField
                  error={
                    fieldError?.field === "reason"
                      ? fieldError.message
                      : undefined
                  }
                  label={
                    purpose === "resolve_extra"
                      ? "Justificativa da associação"
                      : isCancellation ? "Motivo do cancelamento" : "Justificativa"
                  }
                >
                  <TextAreaField
                    ref={reasonRef}
                    disabled={!baseline || busy || uncertain}
                    value={fields.reason ?? ""}
                    required
                    minLength={3}
                    maxLength={1000}
                    rows={4}
                    onChange={(event) => setField("reason", event.target.value)}
                  />
                </FormField>
                {purpose === "cancel" && reference && !unavailable && !uncertain ?
                  <DocumentArchivePolicy id={id} patientId={patientId} version={reference.document.documentVersion} /> : null}
                {!isCancellation ? <ActionButton
                  variant="primary"
                  type="submit"
                  disabled={!allowed || busy}
                >
                  {purpose === "resolve_extra"
                    ? "Revisar associação"
                    : "Revisar decisão"}
                </ActionButton> : null}
              </form>
            )}
          </>
        )}
      </div>
    </RecordDrawer>
  );
}
