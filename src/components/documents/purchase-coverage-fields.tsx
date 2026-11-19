"use client";

import { useCallback, useState } from "react";
import { ActionButton, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { purchaseCoverageChoice, purchaseCoverageTargets, type PurchaseAssociation, type PurchaseCoverageChoice,
  type PurchaseCoverageTarget } from "@/lib/validation/purchase-coverage";

export type ArrivalPlanningChoices = { association?: PurchaseAssociation; coverage?: PurchaseCoverageChoice };

export function coverageFromForm(fields: FormData, lineId: string) {
  const encoded = fields.get(lineId + ":coverage");
  return typeof encoded === "string" ? purchaseCoverageChoice.parse(JSON.parse(encoded)) : undefined;
}

function PlanningTargets({ patientId, productId, sourceId, unit, children }: {
  patientId: string; productId: string; sourceId?: string; unit: string;
  children: (targets: PurchaseCoverageTarget[]) => React.ReactNode;
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
  if (result.loading) return <p role="status">Consultando planejamentos…</p>;
  if (result.error) return <div><p role="alert">{result.error}</p><ActionButton compact onClick={result.refresh}>Consultar planejamentos novamente</ActionButton></div>;
  return children(result.data ?? []);
}

function targetLabel(target: PurchaseCoverageTarget, index: number, primary: boolean) {
  const available = quantity(target.openPlanning).plus(primary ? target.waitingArrival : 0);
  const date = formatBrazilDate(target.createdAt).slice(0, 5);
  return `${target.code} · ${date}${index === 0 && primary ? " · mais recente" : ""} · ${formatQuantity(available.toFixed(), target.unit)} em aberto`;
}

export function PurchaseCoverageFields({ patientId, productId, material, unit, source, received, value, onChange }: {
  patientId: string; productId: string; material: string; unit: string;
  source?: { id: string; code: string | null }; received: string;
  value: ArrivalPlanningChoices; onChange: (value: ArrivalPlanningChoices) => void;
}) {
  const sourceId = source?.id ?? value.association?.documentId;
  const [cover, setCover] = useState(Boolean(value.coverage));
  return <div className="hca-arrival-coverage">
    {source ? <p className="hca-arrival-summary"><Icon name="link" />Compra de origem <strong>{source.code}</strong></p> :
      <PlanningTargets patientId={patientId} productId={productId} unit={unit}>{targets =>
        <FormField label={`Qual compra recebeu esse material? · ${material}`}>
          <SelectField value={value.association?.lineId ?? ""} onChange={event => {
            const selected = targets.find(target => target.lineId === event.currentTarget.value);
            setCover(false);
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
            const checked = event.currentTarget.checked;
            setCover(checked);
            onChange({ ...value, coverage: undefined });
          }} />
        <span>Cobrir outro planejamento</span>
      </label>
      {cover ? <PlanningTargets patientId={patientId} productId={productId} sourceId={sourceId} unit={unit}>{targets => <>
        {!targets.length && !value.coverage ? <p>Não há planejamento anterior em aberto para este material.</p> :
          <FormField label={`Planejamento anterior · ${material}`}>
            <SelectField value={value.coverage?.lineId ?? ""} required onChange={event => {
              const selected = targets.find(target => target.lineId === event.currentTarget.value);
              onChange({ ...value, coverage: selected ? { documentId: selected.documentId, lineId: selected.lineId, quantity: "" } : undefined });
            }}>
              <option value="">Selecione a compra anterior</option>
              {value.coverage && !targets.some(target => target.lineId === value.coverage?.lineId) ?
                <option value={value.coverage.lineId}>Planejamento indisponível</option> : null}
              {targets.map((target, index) => <option value={target.lineId} key={target.lineId}>{targetLabel(target, index, false)}</option>)}
            </SelectField>
          </FormField>}
        {value.coverage ? <CoverageQuantity material={material} unit={unit} received={received} choice={value.coverage}
          target={targets.find(target => target.lineId === value.coverage?.lineId)}
          onChange={coverage => onChange({ ...value, coverage })} /> : null}
      </>}</PlanningTargets> : null}
    </div> : null}
    {value.coverage || value.association ? <p className="hca-arrival-summary"><Icon name="stock" />
      A aprovação registra uma única entrada física no estoque familiar.
    </p> : null}
  </div>;
}

function CoverageQuantity({ material, unit, received, choice, target, onChange }: {
  material: string; unit: string; received: string; choice: PurchaseCoverageChoice;
  target?: PurchaseCoverageTarget; onChange: (value: PurchaseCoverageChoice) => void;
}) {
  const usable = validQuantity(choice.quantity, 6);
  const receivedAmount = validQuantity(received, 6) ? quantity(received) : quantity(0);
  const permitted = target ? quantity(target.openPlanning) : null;
  const error = !permitted ? "Escolha um planejamento que ainda esteja em aberto."
    : usable && quantity(choice.quantity).gt(receivedAmount.lt(permitted) ? receivedAmount : permitted)
      ? "A cobertura deve caber na quantidade recebida e no planejamento em aberto." : "";
  return <>
    <FormField label={`Cobertas por esta chegada · ${material}`} error={error || undefined}>
      <TextInput required inputMode="decimal" maxLength={20} value={choice.quantity} onChange={event =>
        onChange({ ...choice, quantity: event.currentTarget.value })} />
    </FormField>
    {usable && target && !error ? <p className="hca-arrival-summary"><Icon name="link" />
      Das {formatQuantity(received, unit)} recebidas, {formatQuantity(choice.quantity, unit)} também cobrem o planejamento da {target.code}.
    </p> : null}
  </>;
}
