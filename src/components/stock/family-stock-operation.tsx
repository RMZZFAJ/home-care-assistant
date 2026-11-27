"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, FormField, Pill, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { ApiError, api } from "@/lib/client/api";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { stockOperationAction, stockOperationInput, stockOperationReceipt, stockOperationReference,
  type StockOperationInput, type StockOperationReceipt, type StockOperationReference } from "@/lib/validation/stock-operation";
import type { ProductStock, StockMovement } from "@/types/stock";
import type { WorkspaceContext } from "@/types/workspace";

const endpoint = "/api/stock/operations";
const labels = {
  inbound: "Entrada avulsa",
  outbound: "Retirada",
  correction_in: "Correção de uma retirada",
  correction_out: "Correção de uma entrada",
};
type Line = { rowId: number; productId: string; quantity: string; referenceId?: string };
type Action = StockOperationInput["action"];

function stockAttemptKey(userId: string, patientId: string) {
  return `hca:stock-operation:${userId}:${patientId}`;
}

export function readFamilyStockAttempt(userId: string, patientId: string) {
  try {
    const saved = stockOperationInput.safeParse(JSON.parse(sessionStorage.getItem(stockAttemptKey(userId, patientId)) ?? "null"));
    return saved.success && saved.data.careRecipientId === patientId ? saved.data : null;
  } catch { return null; }
}

export function storeFamilyStockAttempt(userId: string, patientId: string, packet: StockOperationInput | null) {
  try {
    const key = stockAttemptKey(userId, patientId);
    if (packet) sessionStorage.setItem(key, JSON.stringify(packet));
    else sessionStorage.removeItem(key);
  } catch { /* The open workspace still retains the submitted intention. */ }
}

export function FamilyStockOperation({
  context, initial, products, movements, opener, fallbackRef, canWrite, pending, onPending, onClose, onCommitted,
}: {
  context: WorkspaceContext;
  initial: { action: Action; productId: string; referenceId: string };
  products: Pick<ProductStock, "productId" | "name" | "unit" | "active" | "family">[];
  movements: StockMovement[];
  opener: HTMLElement;
  fallbackRef: RefObject<HTMLElement | null>;
  canWrite: boolean;
  pending: StockOperationInput | null;
  onPending: (packet: StockOperationInput | null) => void;
  onClose: () => void;
  onCommitted: (receipt: StockOperationReceipt, recovered: boolean) => void;
}) {
  const patient = context.patient!;
  const [action, setAction] = useState<Action>(pending?.action ?? initial.action);
  const [lines, setLines] = useState<Line[]>(() => (pending?.lines ?? [{
    productId: initial.productId,
    quantity: "",
    referenceId: initial.referenceId || undefined,
  }]).map((line, rowId) => ({ ...line, rowId })));
  const nextRowRef = useRef(lines.length);
  const [reason, setReason] = useState(pending?.reason ?? "");
  const [review, setReview] = useState<StockOperationReference | null>(null);
  const [previous, setPrevious] = useState<StockOperationReference | null>(null);
  const [needsAdoption, setNeedsAdoption] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(Boolean(pending));
  const [noReceipt, setNoReceipt] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [failure, setFailure] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const inflightRef = useRef(false);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();
  const correction = action.startsWith("correction_");
  const isInbound = action === "inbound" || action === "correction_in";
  const selectedProducts = new Set(lines.map(line => line.productId));
  const hasInvalidLines = review?.materials.some(material => {
    const selected = lines.find(line => line.productId === material.productId);
    if (!selected) return true;
    const amount = quantity(selected.quantity);
    return (!correction && !material.active) || amount.decimalPlaces() > material.quantityDecimals ||
      (!isInbound && material.quantity !== null && quantity(material.quantity).lt(amount));
  }) ?? false;
  const canConfirm = !needsAdoption && !hasInvalidLines;
  useOperationActivity(busy, {
    title: uncertain ? "Conferindo a movimentação" : review ? "Registrando movimentação" : "Consultando saldos",
  });
  useEffect(() => {
    if (!busy && review && !uncertain && !failure) reviewHeadingRef.current?.focus();
  }, [busy, review, uncertain, failure]);

  function updateLine(index: number, update: Partial<Line>) {
    setDirty(true);
    setError("");
    setLines(current => current.map((line, position) => position === index ? { ...line, ...update } : line));
  }
  async function loadReference(productsToReview: string[]) {
    const query = new URLSearchParams({ careRecipientId: patient.id });
    productsToReview.forEach(productId => query.append("productId", productId));
    const data = stockOperationReference.parse((await api<{ data: unknown }>(endpoint + "?" + query)).data);
    if (data.patientId !== patient.id || data.materials.length !== productsToReview.length ||
      data.materials.some(material => !productsToReview.includes(material.productId)))
      throw new Error("A consulta não corresponde aos materiais desta movimentação.");
    return data;
  }
  function packetFor(referenceHash: string, idempotencyKey = crypto.randomUUID()) {
    const items = lines.map(({ productId, quantity, referenceId }) => ({ productId, quantity, referenceId }));
    return stockOperationInput.safeParse({ careRecipientId: patient.id, action, lines: items, reason, referenceHash, idempotencyKey });
  }
  async function prepareReview() {
    if (!canWrite || inflightRef.current) return;
    const packet = packetFor("0".repeat(64));
    if (!packet.success) {
      setError(packet.error.issues[0]?.message ?? "Confira os materiais, as quantidades e o motivo.");
      return;
    }
    inflightRef.current = true;
    setBusy(true); setError("");
    try {
      const next = await loadReference(packet.data.lines.map(line => line.productId));
      const invalidPrecision = next.materials.some(material => {
        const line = packet.data.lines.find(item => item.productId === material.productId);
        return line && quantity(line.quantity).decimalPlaces() > material.quantityDecimals;
      });
      if (invalidPrecision) throw new Error("Use a precisão da unidade de cada material.");
      setReview(next);
      setPrevious(null);
      setNeedsAdoption(false);
    } catch (cause) {
      setFailure(cause);
    } finally { inflightRef.current = false; setBusy(false); }
  }
  function finish(raw: unknown, packet: StockOperationInput, recovered: boolean) {
    const result = stockOperationReceipt.parse(raw);
    if (result.patientId !== patient.id || result.key !== packet.idempotencyKey || result.movementIds.length !== packet.lines.length)
      throw new Error("A confirmação não corresponde a esta movimentação.");
    onPending(null);
    onCommitted(result, recovered);
  }
  async function send(lookup = false) {
    if (inflightRef.current || (!lookup && !canWrite) || (!pending && (!review || !canConfirm))) return;
    const prepared = review ? packetFor(review.referenceHash) : null;
    const packet = pending ?? (prepared?.success ? prepared.data : null);
    if (!packet) return;
    inflightRef.current = true;
    setBusy(true); setError(""); setFailure(null);
    if (!lookup) onPending(packet);
    try {
      if (lookup) {
        const params = new URLSearchParams({ careRecipientId: patient.id, attemptKey: packet.idempotencyKey });
        const { data } = await api<{ data: unknown }>(endpoint + "?" + params);
        if (data === null) { setNoReceipt(true); return; }
        finish(data, packet, true);
      } else {
        finish((await api<{ data: unknown }>(endpoint, packet)).data, packet, false);
      }
    } catch (cause) {
      if (!lookup && cause instanceof ApiError && cause.status === 409 && cause.code === "VERSION_CONFLICT") {
        onPending(null); setUncertain(false); setNoReceipt(false);
        try {
          const updated = await loadReference(packet.lines.map(line => line.productId));
          setPrevious(review);
          setReview(updated);
          setNeedsAdoption(true);
        } catch (reason) { setReview(null); setFailure(reason); }
      } else {
        const confirmedRejection = !lookup && !uncertain && cause instanceof ApiError && cause.status > 0 && cause.status < 500;
        if (confirmedRejection) onPending(null);
        setUncertain(!confirmedRejection);
        setFailure(cause);
      }
    } finally {
      inflightRef.current = false;
      setBusy(false);
      setAttempts(value => value + 1);
    }
  }

  const reviewing = Boolean(review);
  const mayResend = canWrite && noReceipt;
  return <>
    <RecordDrawer title={reviewing ? "Confirmar movimentação familiar" : "Movimentar estoque familiar"}
      kicker="Estoque da família" subtitle={patient.display_name} onClose={onClose} busy={busy}
      headingIcon="stock" popupClassName="hca-stock-operation-sheet" keyboardScrollable
      restoreFocusTo={opener} restoreFocusFallbackRef={fallbackRef} exitDialog
      hasUnsavedChanges={dirty} uncertainOutcome={uncertain} trackChanges={false}
      footer={requestClose => <>
        <ActionButton onClick={reviewing && !uncertain ? () => { setReview(null); setPrevious(null); setNeedsAdoption(false); setError(""); } : requestClose} disabled={busy}>
          {reviewing && !uncertain ? "Editar" : "Fechar"}
        </ActionButton>
        <ActionButton variant="primary" disabled={busy || reviewing && !uncertain && !canConfirm}
          {...(reviewing || uncertain ? { onClick: () => void send(uncertain && !mayResend) } : { type: "submit", form: formId })}>
          {uncertain ? mayResend ? "Tentar a mesma movimentação" : "Conferir resultado" : reviewing ? "Confirmar" : "Revisar movimentação"}
        </ActionButton>
      </>}>
      {error ? <p role="alert" className="ui-notice ui-notice-error">{error}</p> : null}
      {uncertain ? <div className="hca-form-stack">
        <p className="ui-notice">{noReceipt ? mayResend
          ? "A consulta ainda não encontrou a confirmação. Você pode reenviar a mesma tentativa sem duplicar as movimentações."
          : "A consulta ainda não encontrou a confirmação. Seu vínculo atual permite conferir o resultado."
          : "Confira o resultado da tentativa enviada antes de iniciar outra movimentação."}</p>
        <p>{labels[action]} · {lines.length} {lines.length === 1 ? "material" : "materiais"}</p>
      </div> : reviewing && review ? <section className="hca-form-stack" aria-label="Revisão da movimentação familiar">
        <h3 ref={reviewHeadingRef} tabIndex={-1}>Confira o movimento e sua referência</h3>
        <p><strong>{labels[action]}</strong></p>
        {needsAdoption ? <div className="hca-attention hca-family-stock-reference">
          <div role="alert"><p><strong>O saldo foi atualizado</strong></p>
            <p>Confira a comparação abaixo e use os saldos atualizados para confirmar o movimento.</p>
          </div>
          <ActionButton onClick={() => { setNeedsAdoption(false); reviewHeadingRef.current?.focus(); }}>
            Usar saldo atualizado
          </ActionButton>
        </div> : null}
        {review.materials.map(material => {
          const line = lines.find(row => row.productId === material.productId)!;
          const delta = quantity(line.quantity).times(isInbound ? 1 : -1);
          const prior = previous?.materials.find(row => row.productId === material.productId);
          const available = material.quantity === null ? "Acesso restrito" : formatQuantity(material.quantity, material.unit);
          const after = material.quantity === null ? "Acesso restrito" : formatQuantity(quantity(material.quantity).plus(delta).toFixed(), material.unit);
          const original = correction ? movements.find(movement =>
            movement.id === line.referenceId && movement.product_id === line.productId &&
            movement.reference_type === "family_manual" &&
            (isInbound ? movement.source_location === "FAMILY" : movement.destination_location === "FAMILY")
          ) : undefined;
          return <article key={material.productId} className="hca-family-stock-review-item">
            <div className="hca-family-stock-review-heading">
              <span className="hca-modal-heading-icon"><Icon name="stock" width={18} height={18} /></span>
              <div><h4>{material.name}</h4><p>{isInbound ? "Entrada" : "Saída"} · {formatQuantity(line.quantity, material.unit)}</p></div>
            </div>
            {prior?.quantity != null ? <p>Saldo na referência anterior <strong>{formatQuantity(prior.quantity, prior.unit)}</strong></p> : null}
            <dl className="hca-family-stock-effect">
              <div><dt>Disponível</dt><dd>{available}</dd><Icon name="chevron" width={17} height={17} /></div>
              <div><dt>Após registrar</dt><dd>{after}</dd></div>
            </dl>
            {correction && line.referenceId ? <details className="wrap-anywhere">
              <summary>Movimento histórico compensado</summary>
              <p>{line.referenceId}</p>
              {original ? <>
                <p>{formatBrazilDate(original.created_at)} · {formatQuantity(original.quantity, material.unit)}</p>
                <p className="whitespace-pre-wrap">{original.justification}</p>
              </> : null}
            </details> : null}
          </article>;
        })}
        <section className="hca-family-stock-review-reason"><h4>Motivo</h4><p>{reason}</p></section>
        {hasInvalidLines ? <p role="status" className="ui-notice">Revise os materiais inativos, a precisão das unidades e as quantidades acima do saldo disponível.</p> : null}
      </section> : <form id={formId} className="hca-form-stack" onSubmit={event => { event.preventDefault(); void prepareReview(); }}>
        <div className="hca-family-stock-custody"><Icon name="home" /> Estoque da família <Pill>Lançamento manual</Pill></div>
        <FormField label="Operação" required><SelectField value={action} onChange={event => {
          const next = stockOperationAction.parse(event.currentTarget.value);
          setAction(next); setDirty(true);
          setLines(current => current.map(line => ({ ...line, referenceId: undefined })));
        }}>
          {stockOperationAction.options.map(value => <option key={value} value={value}>{labels[value]}</option>)}
        </SelectField></FormField>
        {lines.map((line, index) => {
          const label = index === 0 ? "" : " " + (index + 1);
          const references = correction ? movements.filter(movement => movement.product_id === line.productId &&
            movement.reference_type === "family_manual" &&
            (action === "correction_in" ? movement.source_location === "FAMILY" : movement.destination_location === "FAMILY")) : [];
          const material = products.find(product => product.productId === line.productId);
          return <article key={line.rowId} className="ui-card hca-form-stack">
            <FormField label={"Produto" + label} required><SelectField name="productId" required value={line.productId} onChange={event => {
              updateLine(index, { productId: event.currentTarget.value, referenceId: undefined });
            }}>
              <option value="">Selecione um material</option>
              {products.filter(product => (correction || product.active) &&
                (product.productId === line.productId || !selectedProducts.has(product.productId))).map(product =>
                <option key={product.productId} value={product.productId}>{product.name}{product.active ? "" : " · Inativo"}</option>)}
            </SelectField></FormField>
            {material?.family ? <p className="hca-family-stock-available">Disponível: {formatQuantity(material.family.confirmed, material.unit)}</p> : null}
            <FormField label={"Quantidade" + label} helpText={material?.unit}>
              <TextInput required inputMode="decimal" value={line.quantity} onChange={event => updateLine(index, { quantity: event.currentTarget.value })} />
            </FormField>
            {correction ? <FormField label={"Movimento original a compensar" + label} required>
              {references.length === 0 ? <TextInput name="referenceId" required value={line.referenceId ?? ""} onChange={event => {
                updateLine(index, { referenceId: event.currentTarget.value });
              }} /> : <SelectField name="referenceId" required value={line.referenceId ?? ""} onChange={event => updateLine(index, { referenceId: event.currentTarget.value })}>
                <option value="">Selecione o movimento original</option>
                {references.map(movement => <option key={movement.id} value={movement.id}>{formatBrazilDate(movement.created_at)} · {formatQuantity(movement.quantity, material?.unit)}</option>)}
                {line.referenceId && !references.some(movement => movement.id === line.referenceId) ? <option value={line.referenceId}>Referência selecionada · {line.referenceId}</option> : null}
              </SelectField>}
            </FormField> : null}
            {lines.length > 1 ? <ActionButton variant="quiet" onClick={() => { setDirty(true); setLines(current => current.filter((_, position) => position !== index)); }}>
              <Icon name="trash" /> Remover material {index + 1}
            </ActionButton> : null}
          </article>;
        })}
        <ActionButton onClick={() => {
          const rowId = nextRowRef.current++;
          setDirty(true);
          setLines(current => [...current, { rowId, productId: "", quantity: "" }]);
        }}
          disabled={lines.length >= 50 || lines.length >= products.length}><Icon name="plus" /> Adicionar material</ActionButton>
        <FormField label="Motivo"><TextAreaField rows={3} minLength={3} maxLength={1000} required value={reason}
          onChange={event => { setDirty(true); setReason(event.currentTarget.value); }} /></FormField>
      </form>}
    </RecordDrawer>
    {failure ? <DocumentOperationFailureDialog
      title={uncertain ? "Movimentação ainda não confirmada" : "Não foi possível concluir a movimentação"}
      description={uncertain ? "Confira a mesma tentativa antes de iniciar outra movimentação." : "Confira os campos e tente novamente."}
      outcome={uncertain ? "uncertain" : "rejected"} cause={failure}
      operation="Movimentação familiar" fallbackCode="MOVIMENTACAO_FAMILIAR" attempts={attempts}
      onClose={() => setFailure(null)} closeLabel="Voltar à movimentação"
      action={attempts < operationRecoveryLimit ? { label: uncertain ? "Conferir resultado" : "Tentar novamente", onClick: () => {
        setFailure(null);
        if (uncertain || reviewing) void send(uncertain);
        else void prepareReview();
      } } : undefined}
      exhaustedMessage={attempts >= operationRecoveryLimit ? "Envie os detalhes ao responsável pelo sistema para verificar o resultado." : undefined} /> : null}
  </>;
}
