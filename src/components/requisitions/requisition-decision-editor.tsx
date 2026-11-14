"use client";
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
  FormField,
  SelectField,
  TextAreaField,
} from "@/components/ui/controls";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
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
  requireRequisitionDecisionConfirmation,
  type RequisitionDecisionReference,
  type RequisitionDecisionPacket,
} from "@/lib/validation/requisition-decisions";
import type {
  ReceiptDraftContent,
  RequisitionOperationPurpose,
} from "@/lib/validation/supply-drafts";

type Reference = {
  document: RequisitionDecisionReference;
  products: RequisitionDecisionProduct[];
};
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
  onSaved: () => void;
}) {
  const [baseline, setBaseline] = useState<ReceiptDraftContent | null>(null),
    [fields, setFields] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<Reference | null>(null),
    [comparison, setComparison] = useState<Reference | null>(null);
  const [needsReference, setNeedsReference] = useState(true),
    [unavailable, setUnavailable] = useState(true);
  const [busy, setBusy] = useState(false),
    [reviewing, setReviewing] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{
    field: string;
    message: string;
  } | null>(null);
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
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "REQ",
    purpose,
    targetDocumentId: id,
    enabled: scopeMatches,
    navigation: navigationForStep(draftFlow("REQ", purpose)!, 0),
    onResume(saved) {
      if (
        !saved.content ||
        !("fields" in saved.content) ||
        saved.content.documentVersion === null
      )
        return false;
      setBaseline(saved.content);
      setFields(saved.content.fields);
      restoredRef.current = true;
      setNeedsReference(true);
      setUnavailable(true);
      setComparison(null);
      setReviewing(false);
      setDirty(false);
      setError("");
      setFieldError(null);
      return true;
    },
    onDiscard() {
      const next = reference
        ? emptyRequisitionDecisionDraft(reference.document, purpose)
        : null;
      setBaseline(next);
      setFields(next?.fields ?? {});
      setNeedsReference(!next);
      setDirty(false);
      setError("");
    },
  });
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
          setFields(content.fields);
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
    if (reviewing) headingRef.current?.focus();
  }, [reviewing]);
  useEffect(() => {
    if (!busy && !privateDraft.busy && !reviewing && returnFocusRef.current) {
      returnFocusRef.current = false;
      (reasonRef.current ?? readRecoveryRef.current ?? readOnlyHeadingRef.current ?? headingRef.current)?.focus();
    }
  }, [busy, privateDraft.busy, reviewing]);
  const content = baseline ? { ...baseline, fields } : null;
  const readOnly =
    !reviewing &&
    (consulting ||
      !scopeMatches ||
      !roleAllows ||
      privateDraft.readDenied ||
      privateDraft.protectedReadPending ||
      !!privateDraft.consumed);
  const available =
    !!reference && requisitionDecisionAvailable(reference.document, purpose);
  const allowed =
    !readOnly &&
    !privateDraft.blocked &&
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
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        await privateDraft.revalidateRead();
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!content || busy || uncertain || reviewing) return;
    const saved = await privateDraft.save(content);
    if (saved) setDirty(false);
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
      const saved = await privateDraft.save(content);
      if (!saved) return;
      setDirty(false);
      setReference(current);
      setNeedsReference(false);
      setUnavailable(false);
      pendingRef.current = {
        ...packet.data,
        draftCommit: { id: saved.id, revision: saved.revision },
      };
      setReviewing(true);
    } catch (cause) {
      setError(errorText(cause));
      returnFocusRef.current = true;
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        await privateDraft.revalidateRead();
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    const packet = pendingRef.current;
    if (!packet || busy || !scopeMatches) return;
    const wasUncertain = uncertain;
    setBusy(true);
    setError("");
    try {
      const operation =
        purpose === "cancel"
          ? "status"
          : purpose === "archive"
            ? "archive"
            : "resolve";
      const response = await api<unknown>(
        `/api/requisitions/${id}/${operation}`,
        {
          ...packet.body,
          ...(purpose === "cancel" ? { status: "cancelled" } : {}),
          expectedVersion: packet.expectedVersion,
          idempotencyKey: packet.idempotencyKey,
          draftCommit: packet.draftCommit,
        },
        undefined,
        purpose === "cancel" ? "PATCH" : "POST",
      );
      requireRequisitionDecisionConfirmation(response, packet, {
        id,
        patientId,
      });
      pendingRef.current = null;
      setUncertain(false);
      setReviewing(false);
      setDirty(false);
      privateDraft.reload();
      onSaved();
    } catch (cause) {
      const rejected =
        !wasUncertain &&
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status);
      setUncertain(!rejected);
      setError(errorText(cause));
      if (rejected) {
        pendingRef.current = null;
        setReviewing(false);
        setNeedsReference(true);
        setUnavailable(true);
        setComparison(null);
        returnFocusRef.current = true;
        if (cause.code === "DRAFT_VERSION_CONFLICT")
          void privateDraft.reportConflict();
      }
    } finally {
      setBusy(false);
    }
  }
  const panel = (
    <CreationDraftPanel
      draft={privateDraft}
      current={content}
      patientName={context.patient?.display_name ?? "Paciente selecionado"}
      disabled={busy || uncertain || reviewing}
      resumeLabel={readOnly ? "Consultar preenchimento salvo" : undefined}
      discardLabel={readOnly ? "Descartar preenchimento privado" : undefined}
      acknowledgeLabel="Reconhecer resultado aplicado"
      onRevalidateRead={() => { returnFocusRef.current = true; void privateDraft.revalidateRead(); }}
      revalidationRef={readRecoveryRef}
    />
  );
  const canSeePrivate =
    scopeMatches &&
    !privateDraft.readDenied &&
    !privateDraft.protectedReadPending;
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
      !privateDraft.blocked
    ) {
      initialFocusRef.current = true;
      reasonRef.current?.focus();
    }
  }, [baseline, readOnly, privateDraft.blocked]);
  return (
    <RecordDrawer
      title={
        reviewing
          ? "Revisar decisão da requisição"
          : requisitionDecisionLabels[purpose]
      }
      busy={busy || privateDraft.busy}
      preventClose={uncertain || !!privateDraft.pending}
      hasUnsavedChanges={dirty}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
      onClose={onClose}
    >
      <div className="hca-form-stack">
        {panel}
        {error ? <Notice error>{error}</Notice> : null}
        {!scopeMatches ? (
          <Notice>
            O paciente selecionado mudou. Feche esta consulta para continuar no
            contexto atual.
          </Notice>
        ) : readOnly ? (
          <>
            <h3 ref={readOnlyHeadingRef} tabIndex={-1}>Seu preenchimento em consulta</h3>
            <Notice>
              Consulta pessoal do preenchimento. Nenhuma decisão oficial é
              executada nesta consulta.
            </Notice>
            {canSeePrivate &&
            privateDraft.base?.state === "active" &&
            !privateDraft.offered ? (
              <DraftContentSummary
                content={privateDraft.base.content}
                kind="REQ"
                purpose={purpose}
              />
            ) : null}
            {!privateDraft.loading &&
            !privateDraft.loadError &&
            !privateDraft.base &&
            !privateDraft.offered &&
            !privateDraft.consumed ? (
              <p>
                Nenhum preenchimento ou resultado privado pendente para esta
                decisão neste perfil.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Notice>
              Salvar guarda apenas seu preenchimento. Arquivar, cancelar ou
              associar um item exige a confirmação própria. Estoque e ciências
              não são alterados ao salvar.
            </Notice>
            <div className="hca-toolbar">
              <ActionButton
                disabled={
                  !content ||
                  busy ||
                  uncertain ||
                  reviewing ||
                  privateDraft.blocked
                }
                onClick={() => void save()}
              >
                Salvar preenchimento privado
              </ActionButton>
              {!reviewing ? (
                <ActionButton
                  disabled={busy || uncertain || privateDraft.blocked}
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
                    privateDraft.blocked ||
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
                    preenchimento permanece privado para consulta ou descarte.
                  </Notice>
                ) : null}
              </section>
            ) : null}
            <h3 ref={headingRef} tabIndex={-1}>
              {reviewing
                ? "Conferir decisão antes de confirmar"
                : "Seu preenchimento pessoal"}
            </h3>
            {!unavailable && reference ? (
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
            {reviewing ? (
              <>
                <p>
                  <strong>{requisitionDecisionLabels[purpose]}</strong>
                </p>
                {canSeePrivate ? (
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
                    O conteúdo privado não está disponível para consulta nesta
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
                          : purpose === "cancel"
                            ? "Confirmar cancelamento"
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
                      : "Justificativa"
                  }
                >
                  <TextAreaField
                    ref={reasonRef}
                    value={fields.reason ?? ""}
                    required
                    minLength={3}
                    maxLength={1000}
                    rows={4}
                    onChange={(event) => setField("reason", event.target.value)}
                  />
                </FormField>
                <ActionButton
                  variant="primary"
                  type="submit"
                  disabled={!allowed || busy || privateDraft.busy}
                >
                  {purpose === "resolve_extra"
                    ? "Revisar associação"
                    : "Revisar decisão"}
                </ActionButton>
              </form>
            )}
          </>
        )}
      </div>
    </RecordDrawer>
  );
}
