"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  ActionButton,
  FormField,
  SelectField,
  TextInput,
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
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import { stockPreparationDisplay } from "@/lib/forms/stock-preparation-display";
import { familyStockMovementSchema } from "@/lib/validation/stock";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatZonedDate } from "@/lib/schedules/time";
import {
  stockPreparationContentSchema,
  stockPreparationCommitSchema,
  stockPreparationPendingSchema,
  parseStockPreparationReference,
  parseStockPreparationConfirmation,
  type StockPreparationFields,
  type StockPreparationReference,
  type StockPreparationCommit,
} from "@/lib/validation/stock-preparations";
import type { ProductStock, StockMovement } from "@/types/stock";

function referenceLabel(source: StockPreparationReference) {
  return source.canReadBalance &&
    source.origin?.recordedAt &&
    source.origin.quantity
    ? `${formatZonedDate(source.origin.recordedAt, "America/Sao_Paulo")} · ${formatQuantity(source.origin.quantity, source.product.unit)}`
    : source.origin
      ? "Movimento original informado"
      : "";
}
export function FamilyStockPreparation({
  context,
  initialValues,
  products,
  movements,
  onClose,
  onCommitted,
  restoreFocusTo,
  restoreFocusFallbackRef,
}: {
  context: WorkspaceContext;
  initialValues: StockPreparationFields;
  products: ProductStock[];
  movements: StockMovement[];
  onClose: () => void;
  onCommitted: (id: string) => void;
  restoreFocusTo: HTMLElement;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
}) {
  const patient = context.patient!,
    patientId = patient.id;
  const canReadFamily = can(context, "stock.family.read"),
    canWrite =
      can(context, "stock.family.manage") &&
      patient.is_active !== false &&
      patient.active !== false;
  const [values, setValues] = useState<StockPreparationFields>(initialValues);
  const [referenceHash, setReferenceHash] = useState<string | null>(null);
  const [source, setSource] = useState<StockPreparationReference | null>(null);
  const canDisplayBalance = canReadFamily && source?.canReadBalance !== false;
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [review, setReview] = useState<StockPreparationCommit | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(""),
    [referenceError, setReferenceError] = useState("");
  const [forbidden, setForbidden] = useState(false),
    [comparing, setComparing] = useState(false);
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const savedBeforeReferenceRef = useRef(false);
  const adoptFirstRef = useRef(true),
    mountedRef = useRef(true),
    packetRef = useRef<StockPreparationCommit | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null),
    readRef = useRef<HTMLButtonElement>(null);
  const hadReviewRef = useRef(false);
  const storageKey = `hca:stock-preparation-confirmation:${context.userId}:${patientId}`;
  const draft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "STOCK",
    purpose: "family_movement",
    targetDocumentId: null,
    targetResourceId: patientId,
    readScopeRevision: canDisplayBalance ? "family_read" : "write_only",
    navigation: navigationForStep("STOCK_FAMILY_MOVEMENT", 0),
    onResume: (row) => {
      const c = stockPreparationContentSchema.safeParse(row.content);
      if (!c.success) return false;
      adoptFirstRef.current = false;
      setValues(c.data.movement);
      setReferenceHash(c.data.referenceHash);
      setReview(null);
      setError("");
      setReferenceAttempt((n) => n + 1);
      return true;
    },
    onDiscard: onClose,
  });
  const displayDraft = stockPreparationDisplay(draft, canDisplayBalance);
  const visibleMovement = { ...values };
  if (!canDisplayBalance) {
    delete visibleMovement.observedBalance;
    delete visibleMovement.referenceLabel;
  }
  const content = { movement: visibleMovement, referenceHash };
  const saved = displayDraft.base?.content ?? {
    movement: initialValues,
    referenceHash: null,
  };
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);
  const protectedView =
    forbidden ||
    draft.readDenied ||
    draft.protectedReadPending ||
    (uncertain && (draft.loading || Boolean(draft.loadError)));
  const stale =
    !source ||
    source.referenceHash !== referenceHash ||
    Boolean(referenceError);
  const productId = values.productId ?? "",
    referenceId = values.referenceId ?? "";
  const referenceUrl =
    "/api/stock/preparations/reference?" +
    new URLSearchParams({
      careRecipientId: patientId,
      productId,
      ...(referenceId ? { referenceId } : {}),
    });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(storageKey),
          parsed = raw
            ? stockPreparationPendingSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          parsed?.success &&
          parsed.data.packet.careRecipientId === patientId
        ) {
          adoptFirstRef.current = false;
          setValues(parsed.data.content.movement);
          setReferenceHash(parsed.data.content.referenceHash);
          packetRef.current = parsed.data.packet;
          setReview(parsed.data.packet);
          setUncertain(true);
        }
      } catch {
        /* An optional damaged copy never authorizes a movement. */
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey, patientId]);
  useEffect(() => {
    if (
      draft.loading ||
      draft.offered ||
      draft.pending ||
      uncertain ||
      !productId
    )
      return;
    const controller = new AbortController();
    void api<{ data: unknown }>(referenceUrl, undefined, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        const current = parseStockPreparationReference(
          r.data,
          patientId,
          productId,
          referenceId,
        );
        setSource(current);
        setReferenceError("");
        setForbidden(false);
        if (adoptFirstRef.current && !savedBeforeReferenceRef.current) {
          adoptFirstRef.current = false;
          setReferenceHash(current.referenceHash);
          setValues((v) => ({
            ...v,
            productLabel: current.product.name,
            unit: current.product.unit,
            observedBalance: current.balance ?? "",
            referenceLabel: referenceLabel(current),
          }));
        }
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setReferenceError(
          e instanceof Error
            ? e.message
            : "Não foi possível consultar a referência do estoque.",
        );
        setForbidden(
          e instanceof ApiError && [401, 403, 404].includes(e.status),
        );
      });
    return () => controller.abort();
  }, [
    draft.loading,
    draft.offered,
    draft.pending,
    uncertain,
    productId,
    referenceId,
    values.action,
    referenceAttempt,
    referenceUrl,
    patientId,
  ]);
  useEffect(() => {
    if (protectedView) readRef.current?.focus();
    else if (review) reviewRef.current?.focus();
    else if (hadReviewRef.current) reasonRef.current?.focus();
    hadReviewRef.current = Boolean(review);
  }, [review, protectedView]);
  useEffect(() => {
    if (busy || draft.blocked || !Object.keys(fieldErrors).length) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [busy, draft.blocked, fieldErrors]);
  function change(next: Partial<StockPreparationFields>, newReference = false) {
    setValues((v) => ({
      ...v,
      ...next,
      ...(newReference ? { observedBalance: "" } : {}),
    }));
    setFieldErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !(key in next)),
      ),
    );
    setError("");
    if (newReference) {
      adoptFirstRef.current = true;
      savedBeforeReferenceRef.current = false;
      setSource(null);
      setReferenceHash(null);
      setReferenceAttempt((n) => n + 1);
    }
  }
  async function queryReference() {
    try {
      const r = await api<{ data: unknown }>(referenceUrl),
        current = parseStockPreparationReference(
          r.data,
          patientId,
          productId,
          referenceId,
        );
      if (mountedRef.current) {
        setSource(current);
        setReferenceError("");
        setForbidden(false);
      }
      return current;
    } catch (e) {
      if (mountedRef.current) {
        setReferenceError(
          e instanceof Error
            ? e.message
            : "Não foi possível conferir a referência.",
        );
        if (e instanceof ApiError && [401, 403, 404].includes(e.status))
          setForbidden(true);
      }
      throw e;
    }
  }
  async function compare() {
    setBusy(true);
    setError("");
    try {
      await queryReference();
      if (mountedRef.current) setComparing(true);
    } catch {
      /* Preserve fields and show the reference-specific error. */
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (busy || draft.blocked || !canWrite || protectedView || uncertain)
      return;
    setBusy(true);
    setError("");
    try {
      const idempotencyKey = crypto.randomUUID();
      const parsedCommand = familyStockMovementSchema.safeParse({
        careRecipientId: patientId,
        productId,
        action: values.action,
        quantity: values.quantity,
        reason: values.reason,
        idempotencyKey,
        ...(referenceId ? { referenceId } : {}),
      });
      if (!parsedCommand.success) {
        const labels: Record<string, string> = {
          productId: "Escolha um material disponível.",
          quantity:
            "Informe uma quantidade positiva de até um bilhão, com até seis casas decimais.",
          reason: "Informe um motivo com 3 a 1.000 caracteres.",
          referenceId: "Escolha o movimento original da compensação.",
          action: "Escolha a operação.",
        };
        const fields = Object.fromEntries(
          parsedCommand.error.issues.map((issue) => {
            const key = String(issue.path[0]);
            return [key, labels[key] ?? "Confira este campo."];
          }),
        );
        setFieldErrors(fields);
        setError(
          "Confira os campos indicados. Seu preenchimento foi preservado.",
        );
        const first = Object.keys(fields).find((key) => key in labels);
        if (first)
          event.currentTarget
            .querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus();
        return;
      }
      const command = parsedCommand.data;
      setFieldErrors({});
      const current = await queryReference();
      if (!mountedRef.current) return;
      if (
        quantity(command.quantity).decimalPlaces() > current.product.decimals
      ) {
        setFieldErrors({
          quantity:
            current.product.decimals === 0
              ? "Este material exige uma quantidade inteira."
              : `Este material permite até ${current.product.decimals} casas decimais.`,
        });
        setError(
          "Confira a quantidade indicada. Seu preenchimento foi preservado.",
        );
        return;
      }
      if (current.referenceHash !== referenceHash) {
        setComparing(true);
        setError(
          "A referência mudou. Compare a situação atual e adote-a antes de revisar novamente. Seu preenchimento foi preservado.",
        );
        return;
      }
      const saved = await draft.save(content);
      if (!saved || !mountedRef.current) return;
      const packet = stockPreparationCommitSchema.parse({
        careRecipientId: patientId,
        draftCommit: { id: saved.id, revision: saved.revision },
        idempotencyKey,
        referenceHash,
        command,
      });
      packetRef.current = packet;
      setReview(packet);
      setComparing(false);
    } catch (e) {
      if (mountedRef.current) {
        setError(
          e instanceof ApiError
            ? e.message
            : "Confira o material, a quantidade, o motivo e a referência. O preenchimento foi preservado.",
        );
        reasonRef.current?.focus();
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  async function confirm() {
    const packet = packetRef.current;
    if (!packet || busy) return;
    const recovering = uncertain;
    setBusy(true);
    setError("");
    try {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ packet, content }));
      } catch {
        /* Exact packet remains in memory. */
      }
      const result = await api<{ data: unknown }>(
        "/api/stock/preparations/commit",
        packet,
      );
      const receipt = parseStockPreparationConfirmation(
        result.data,
        patientId,
        context.userId,
        packet,
      );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* The personal server receipt remains authoritative. */
      }
      if (!mountedRef.current) return;
      packetRef.current = null;
      setUncertain(false);
      onCommitted(receipt.resourceId);
    } catch (e) {
      if (!mountedRef.current) return;
      const rejected =
        !recovering &&
        e instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(e.status);
      setUncertain(!rejected);
      setError(
        recovering
          ? "Não foi possível recuperar a confirmação. Preserve a mesma tentativa; o primeiro resultado continua incerto."
          : e instanceof Error
            ? e.message
            : "Resultado ainda não confirmado.",
      );
      if (rejected) {
        packetRef.current = null;
        setReview(null);
        setComparing(true);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Optional only. */
        }
        if (e instanceof ApiError && [401, 403, 404].includes(e.status))
          setForbidden(true);
        if (e instanceof ApiError && e.status === 409)
          await draft.reportConflict();
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  const originals = movements.filter(
    (m) =>
      m.reference_type === "family_manual" &&
      (!productId || m.product_id === productId) &&
      (values.action === "correction_in"
        ? m.source_location === "FAMILY" && !m.destination_location
        : m.destination_location === "FAMILY" && !m.source_location),
  );
  return (
    <RecordDrawer
      title={
        review
          ? "Confirmar movimentação familiar"
          : "Movimentar estoque familiar"
      }
      busy={busy || draft.busy}
      preventClose={uncertain || Boolean(draft.pending)}
      hasUnsavedChanges={dirty}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
      onClose={onClose}
    >
      <div className="hca-form-stack">
        <CreationDraftPanel
          draft={displayDraft}
          current={protectedView ? null : content}
          patientName={patient.display_name}
          disabled={busy || uncertain || Boolean(review)}
        />
        {protectedView ? (
          <Notice error>
            {referenceError ||
              "Revalide o acesso antes de exibir o preenchimento."}
            <ActionButton
              ref={readRef}
              disabled={busy}
              onClick={() => {
                draft.reload();
                setReferenceAttempt((n) => n + 1);
              }}
            >
              Revalidar acesso à movimentação
            </ActionButton>
          </Notice>
        ) : (
          <>
            {error ? <Notice error>{error}</Notice> : null}
            {referenceError ? <Notice error>{referenceError}</Notice> : null}
            {!canWrite ? (
              <Notice>
                Você pode consultar seu preenchimento e o resultado preservado.
                Novas movimentações exigem autorização atual.
              </Notice>
            ) : null}
            {review ? (
              <section
                className="hca-form-stack"
                aria-label="Revisão da movimentação familiar"
              >
                <h3 ref={reviewRef} tabIndex={-1}>
                  Confira o movimento e sua referência
                </h3>
                <DraftContentSummary
                  kind="STOCK"
                  purpose="family_movement"
                  content={content}
                />
                {referenceId ? (
                  <details className="wrap-anywhere">
                    <summary>Movimento histórico compensado</summary>
                    <p>{referenceId}</p>
                    {source?.origin?.recordedAt &&
                    canDisplayBalance &&
                    source.canReadBalance ? (
                      <>
                        <p>
                          {formatZonedDate(
                            source.origin.recordedAt,
                            "America/Sao_Paulo",
                          )}{" "}
                          ·{" "}
                          {formatQuantity(
                            source.origin.quantity,
                            source.product.unit,
                          )}
                        </p>
                        <p className="whitespace-pre-wrap">
                          {source.origin.reason}
                        </p>
                      </>
                    ) : null}
                  </details>
                ) : null}
                <p>
                  Apenas o saldo familiar deste material será atualizado. O
                  movimento original permanece no histórico; não há
                  transferência nem consumo inferido.
                </p>
                {uncertain ? (
                  <Notice>
                    Resultado ainda não confirmado. Campos e chave estão
                    congelados até recuperar a mesma tentativa.
                  </Notice>
                ) : null}
                <div className="hca-toolbar">
                  <ActionButton
                    disabled={busy || uncertain}
                    onClick={() => {
                      packetRef.current = null;
                      setReview(null);
                      reasonRef.current?.focus();
                    }}
                  >
                    Voltar
                  </ActionButton>
                  <ActionButton
                    variant="primary"
                    disabled={busy || (!uncertain && !canWrite)}
                    onClick={() => void confirm()}
                  >
                    {busy
                      ? "Confirmando…"
                      : uncertain
                        ? "Recuperar tentativa"
                        : "Confirmar"}
                  </ActionButton>
                </div>
              </section>
            ) : null}
            <form
              ref={formRef}
              hidden={Boolean(review)}
              onSubmit={(event) => void prepare(event)}
              className="hca-form-stack"
            >
              <fieldset
                disabled={busy || draft.blocked || uncertain || !canWrite}
                className="hca-form-grid"
              >
                <FormField label="Operação" error={fieldErrors.action}>
                  <SelectField
                    name="action"
                    value={values.action ?? "inbound"}
                    onChange={(e) =>
                      change(
                        {
                          action: e.target
                            .value as StockPreparationFields["action"],
                          referenceId: "",
                          referenceLabel: "",
                        },
                        true,
                      )
                    }
                  >
                    <option value="inbound">Entrada avulsa</option>
                    <option value="outbound">Retirada</option>
                    <option value="correction_in">
                      Correção compensatória de entrada
                    </option>
                    <option value="correction_out">
                      Correção compensatória de saída
                    </option>
                  </SelectField>
                </FormField>
                <FormField label="Produto" error={fieldErrors.productId}>
                  <SelectField
                    name="productId"
                    required
                    value={productId}
                    onChange={(e) => {
                      const p = products.find(
                        (p) => p.productId === e.target.value,
                      );
                      change(
                        {
                          productId: e.target.value,
                          productLabel: p?.name ?? "",
                          unit: p?.unit ?? "",
                          referenceId: "",
                          referenceLabel: "",
                        },
                        true,
                      );
                    }}
                  >
                    <option value="">Selecione</option>
                    {products
                      .filter(
                        (p) =>
                          p.active ||
                          (values.action?.startsWith("correction") &&
                            p.productId === productId &&
                            referenceId),
                      )
                      .map((p) => (
                        <option key={p.productId} value={p.productId}>
                          {p.name} · {p.unit}
                          {p.active
                            ? ""
                            : " · Inativo, somente compensação referenciada"}
                        </option>
                      ))}
                  </SelectField>
                </FormField>
                <FormField
                  label="Quantidade"
                  error={fieldErrors.quantity}
                  helpText={
                    values.unit
                      ? `Quantidade em ${values.unit}.`
                      : "Escolha o material para conferir a unidade."
                  }
                >
                  <TextInput
                    name="quantity"
                    inputMode="decimal"
                    required
                    value={values.quantity ?? ""}
                    onChange={(e) => change({ quantity: e.target.value })}
                  />
                </FormField>
                {values.action?.startsWith("correction") ? (
                  <FormField
                    label="Movimento original a compensar"
                    error={fieldErrors.referenceId}
                  >
                    <SelectField
                      name="referenceId"
                      required
                      value={referenceId}
                      onChange={(e) => {
                        const m = originals.find(
                            (m) => m.id === e.target.value,
                          ),
                          p = products.find(
                            (p) => p.productId === m?.product_id,
                          );
                        change(
                          {
                            referenceId: e.target.value,
                            referenceLabel: m
                              ? `${formatZonedDate(m.created_at, "America/Sao_Paulo")} · ${formatQuantity(m.quantity)}`
                              : "",
                            ...(m
                              ? {
                                  productId: m.product_id,
                                  productLabel: p?.name ?? "",
                                  unit: p?.unit ?? "",
                                }
                              : {}),
                          },
                          true,
                        );
                      }}
                    >
                      <option value="">
                        Selecione uma movimentação do histórico
                      </option>
                      {referenceId &&
                      !originals.some((m) => m.id === referenceId) ? (
                        <option value={referenceId}>
                          {values.referenceLabel || referenceId} · referência
                          preservada
                        </option>
                      ) : null}
                      {originals.map((m) => (
                        <option key={m.id} value={m.id}>
                          {products.find((p) => p.productId === m.product_id)
                            ?.name ?? m.product_id}{" "}
                          · {formatZonedDate(m.created_at, "America/Sao_Paulo")}{" "}
                          · {formatQuantity(m.quantity)}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                ) : null}
                <FormField label="Motivo" error={fieldErrors.reason}>
                  <TextAreaField
                    ref={reasonRef}
                    name="reason"
                    minLength={3}
                    maxLength={1000}
                    required
                    rows={3}
                    value={values.reason ?? ""}
                    onChange={(e) => change({ reason: e.target.value })}
                  />
                </FormField>
              </fieldset>
              {source ? (
                <p className="hca-field-hint">
                  {canDisplayBalance && source.canReadBalance ? (
                    <>
                      Saldo familiar consultado:{" "}
                      {formatQuantity(source.balance, source.product.unit)}.
                    </>
                  ) : (
                    "Saldo familiar restrito à sua autorização. Você pode registrar a operação permitida."
                  )}
                  {!source.product.active
                    ? " Material inativo: somente compensação histórica válida."
                    : ""}
                </p>
              ) : null}
              {productId && !draft.offered && !draft.consumed ? (
                <ActionButton
                  disabled={busy || uncertain || draft.busy}
                  onClick={() => void compare()}
                >
                  Comparar referência atual
                </ActionButton>
              ) : null}
              {comparing && source ? (
                <section
                  className="hca-form-stack"
                  aria-label="Comparação da referência de estoque"
                >
                  <p>
                    Preservado: {values.productLabel || productId} ·{" "}
                    {values.unit || "unidade não preservada"} · saldo{" "}
                    {canDisplayBalance
                      ? (values.observedBalance ?? "não preservado")
                      : "restrito à sua autorização"}
                    .
                  </p>
                  <p>
                    Atual: {source.product.name} · {source.product.unit} · saldo{" "}
                    {canDisplayBalance && source.canReadBalance
                      ? formatQuantity(source.balance)
                      : "restrito à sua autorização"}{" "}
                    · {source.product.active ? "Ativo" : "Inativo"}.
                  </p>
                  {canDisplayBalance &&
                  source.canReadBalance &&
                  source.origin ? (
                    <p>
                      Movimento original: {source.origin.id} ·{" "}
                      {formatQuantity(source.origin.quantity)} ·{" "}
                      {source.origin.sourceLocation === "FAMILY"
                        ? "Retirada"
                        : "Entrada"}
                      .
                    </p>
                  ) : null}
                  <ActionButton
                    disabled={busy || uncertain || !canWrite}
                    onClick={() => {
                      setReferenceHash(source.referenceHash);
                      setValues((v) => ({
                        ...v,
                        productLabel: source.product.name,
                        unit: source.product.unit,
                        observedBalance: source.balance ?? "",
                        referenceLabel: referenceLabel(source),
                      }));
                      setComparing(false);
                      setError("");
                      reasonRef.current?.focus();
                    }}
                  >
                    Usar referência atual
                  </ActionButton>
                </section>
              ) : null}
              {stale && productId ? (
                <Notice>
                  Confira a referência atual antes de confirmar. Seu motivo e
                  sua quantidade permanecem preservados.
                </Notice>
              ) : null}
              <div className="hca-toolbar">
                <ActionButton
                  disabled={busy || draft.blocked || !canWrite || uncertain}
                  onClick={() => {
                    savedBeforeReferenceRef.current = true;
                    void draft.save(content);
                  }}
                >
                  Salvar rascunho
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={
                    busy || draft.blocked || !canWrite || uncertain || stale
                  }
                >
                  Revisar movimentação
                </ActionButton>
              </div>
            </form>
          </>
        )}
      </div>
    </RecordDrawer>
  );
}
