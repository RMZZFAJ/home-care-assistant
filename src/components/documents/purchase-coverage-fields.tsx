"use client";

import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { z } from "zod";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { purchaseAssociation, purchaseCoverageChoice, purchaseCoverageTargets, type PurchaseAssociation, type PurchaseCoverageChoice,
  type PurchaseCoverageTarget } from "@/lib/validation/purchase-coverage";
import { RelatedDocument } from "./related-document";

export type ArrivalPlanningChoices = {
  association?: PurchaseAssociation; coverage?: PurchaseCoverageChoice; coverageRequested?: boolean;
};
const draftCoverage = purchaseAssociation.extend({ quantity: z.string().max(20) });

export function coverageFromForm(fields: FormData, lineId: string) {
  const encoded = fields.get(lineId + ":coverage");
  if (fields.has(lineId + ":coverageRequested") && typeof encoded !== "string")
    throw new Error("Escolha o planejamento anterior e informe a quantidade a cobrir, ou desative a cobertura.");
  return typeof encoded === "string" ? purchaseCoverageChoice.parse(JSON.parse(encoded)) : undefined;
}

export function restoreArrivalPlanning(fields: Record<string, string> | undefined, lineId: string): ArrivalPlanningChoices {
  const encoded = fields?.[lineId + ":coverage"];
  const coverageRequested = fields?.[lineId + ":coverageRequested"] === "true" || Boolean(encoded);
  if (!encoded) return { coverageRequested };
  try {
    const parsed = draftCoverage.safeParse(JSON.parse(encoded));
    return parsed.success ? { coverage: parsed.data, coverageRequested: true } : { coverageRequested };
  } catch {
    return { coverageRequested };
  }
}

function PlanningTargets({ patientId, productId, sourceId, unit, children }: {
  patientId: string; productId: string; sourceId?: string; unit: string;
  children: (targets: PurchaseCoverageTarget[], ready: boolean) => ReactNode;
}) {
  const query = new URLSearchParams({ careRecipientId: patientId, productId });
  if (sourceId) query.set("sourceDocumentId", sourceId);
  const decode = useCallback((value: unknown) => {
    const response = value as { careRecipientId?: string; productId?: string; sourceDocumentId?: string | null; data?: unknown } | null;
    if (response?.careRecipientId !== patientId || response.productId !== productId || response.sourceDocumentId !== (sourceId ?? null)) {
      throw new Error("A resposta não corresponde ao material ou à compra de origem.");
    }
    return purchaseCoverageTargets.parse(response.data).filter(target => target.unit === unit);
  }, [patientId, productId, sourceId, unit]);
  const result = useScopedRead("/api/purchases/arrivals/targets?" + query, "", decode);
  const ready = !result.loading && !result.error;
  return <>
    {children(ready ? result.data ?? [] : [], ready)}
    {result.loading ? <p role="status" className="hca-field-help">Consultando planejamentos…</p> : null}
    {result.error ? <div><p role="alert">{result.error}</p><ActionButton compact onClick={result.refresh}>Consultar planejamentos novamente</ActionButton></div> : null}
  </>;
}

function targetLabel(target: PurchaseCoverageTarget, index: number, primary: boolean) {
  const available = quantity(target.openPlanning).plus(primary ? target.waitingArrival : 0);
  const date = formatBrazilDate(target.createdAt).slice(0, 5);
  return `${target.code} · ${date}${index === 0 && primary ? " · mais recente" : ""} · ${formatQuantity(available.toFixed(), target.unit)} em aberto`;
}

export function PurchaseCoverageFields({ patientId, productId, material, unit, source, received, value, onChange,
  formLineId, directCredit = false }: {
  patientId: string; productId: string; material: string; unit: string;
  source?: { id: string; code: string | null }; received: string;
  value: ArrivalPlanningChoices; onChange: (value: ArrivalPlanningChoices) => void;
  formLineId?: string; directCredit?: boolean;
}) {
  const sourceId = source?.id ?? value.association?.documentId;
  const cover = Boolean(value.coverage || value.coverageRequested);
  const amount = validQuantity(received, 6) ? formatQuantity(received, unit) : null;
  return <div className="hca-arrival-coverage">
    {source ? <p className="hca-arrival-summary hca-arrival-origin"><Icon name="link" />Compra de origem
      <RelatedDocument type="COM" id={source.id} label={source.code ?? "Consultar compra"} compact /></p> :
      <PlanningTargets patientId={patientId} productId={productId} unit={unit}>{targets =>
        <FormField label={`Qual compra recebeu esse material? · ${material}`}>
          <SelectField value={value.association?.lineId ?? ""} onChange={event => {
            const selected = targets.find(target => target.lineId === event.currentTarget.value);
            onChange(selected ? { association: { documentId: selected.documentId, lineId: selected.lineId } } : {});
          }}>
            <option value="">Manter sem compra vinculada</option>
            {value.association && !targets.some(target => target.lineId === value.association?.lineId) ?
              <option value={value.association.lineId}>Compra anterior indisponível</option> : null}
            {targets.map((target, index) => <option value={target.lineId} key={target.lineId}>{targetLabel(target, index, true)}</option>)}
          </SelectField>
        </FormField>}</PlanningTargets>}
    {sourceId ? <div className="hca-arrival-coverage-choice">
      <label className="hca-purchase-switch">
        <input type="checkbox" role="switch" aria-label={`Cobrir outro planejamento · ${material}`}
          checked={cover} onChange={event => {
            onChange({ ...value, coverageRequested: event.currentTarget.checked, coverage: undefined });
          }} />
        <span>Cobrir outro planejamento</span>
      </label>
      {cover ? <PlanningTargets patientId={patientId} productId={productId} sourceId={sourceId} unit={unit}>{(targets, ready) => {
        const target = targets.find(item => item.lineId === value.coverage?.lineId);
        const helpText = ready && !targets.length ? "Não há planejamento anterior em aberto. Desative a cobertura para registrar a chegada."
          : ready && value.coverage && !target ? "O planejamento escolhido está indisponível. Confira a seleção antes de continuar." : undefined;
        return <>
          <FormField label={`Planejamento anterior · ${material}`} helpText={helpText}>
            <SelectField value={target?.lineId ?? ""} required onChange={event => {
              const selected = targets.find(target => target.lineId === event.currentTarget.value);
              onChange({ ...value, coverageRequested: true, coverage: selected ? { documentId: selected.documentId, lineId: selected.lineId, quantity: "" } : undefined });
            }}>
              <option value="">Selecione a compra anterior</option>
              {targets.map((target, index) => <option value={target.lineId} key={target.lineId}>{targetLabel(target, index, false)}</option>)}
            </SelectField>
          </FormField>
          {value.coverage ? <CoverageQuantity material={material} unit={unit} received={received} choice={value.coverage}
            target={target} onChange={coverage => onChange({ ...value, coverage })} /> : null}
        </>;
      }}</PlanningTargets> : null}
    </div> : null}
    {amount && (source || value.association) ? <p className="hca-arrival-summary"><Icon name="stock" />
      {directCredit ? `Esta confirmação registra ${amount} uma única vez no estoque familiar.`
        : `Após aprovação, entram ${amount} uma única vez no estoque familiar.`}
    </p> : null}
    {formLineId && cover ? <input type="hidden" name={formLineId + ":coverageRequested"} value="true" /> : null}
    {formLineId && value.coverage ? <input type="hidden" name={formLineId + ":coverage"} value={JSON.stringify(value.coverage)} /> : null}
  </div>;
}

function CoverageQuantity({ material, unit, received, choice, target, onChange }: {
  material: string; unit: string; received: string; choice: PurchaseCoverageChoice;
  target?: PurchaseCoverageTarget; onChange: (value: PurchaseCoverageChoice) => void;
}) {
  const usable = validQuantity(choice.quantity, 6);
  const receivedAmount = validQuantity(received, 6) ? quantity(received) : quantity(0);
  const permitted = target ? quantity(target.openPlanning) : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const error = !permitted ? "Escolha um planejamento que ainda esteja em aberto."
    : choice.quantity && !usable ? "Informe uma quantidade válida para a cobertura."
    : usable && quantity(choice.quantity).gt(receivedAmount.lt(permitted) ? receivedAmount : permitted)
      ? "A cobertura deve caber na quantidade recebida e no planejamento em aberto." : "";
  useLayoutEffect(() => { inputRef.current?.setCustomValidity(error); }, [error]);
  return <>
    <FormField label={`Cobertas por esta chegada · ${material}`} error={error || undefined}>
      <span className="hca-purchase-quantity">
        <TextInput ref={inputRef} required inputMode="decimal" maxLength={20} value={choice.quantity} onChange={event =>
          onChange({ ...choice, quantity: event.currentTarget.value })} />
        <span aria-hidden="true">{unit}</span>
      </span>
    </FormField>
    {usable && target && !error ? <p className="hca-arrival-summary"><Icon name="link" />
      Das {formatQuantity(received, unit)} recebidas, {formatQuantity(choice.quantity, unit)} também cobrem o planejamento da {target.code}.
    </p> : null}
  </>;
}
