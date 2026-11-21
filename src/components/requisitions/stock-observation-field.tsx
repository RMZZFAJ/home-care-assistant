"use client";
import { useId } from "react";
import { inputClass } from "@/components/workspace";
import { WizardQuantityInput } from "@/components/forms/wizard-material-tools";
import type { StockObservation } from "@/types/requisition";

export function StockObservationField({ value, mode, suggested, decimals = 6, unit, error, errorKey, onChange, compact = false }: {
  value: string | number | null; mode?: StockObservation; suggested?: string | null; decimals?: number; unit?: string; error?: string;
  errorKey?: string; onChange: (change: { currentStock: string | number | null; stockObservation: StockObservation; stockObservationAt: string }) => void;
  compact?: boolean;
}) {
  const id = useId(), selected = mode ?? (value == null ? "unfilled" : "legacy_unclassified");
  const description = id + "-help" + (error ? " " + id + "-error" : "");
  const useCheckbox = compact && selected !== "legacy_unclassified";
  const stockInput = {
    id: id + "-quantity", "data-field-error": error && selected !== "legacy_unclassified" ? errorKey : undefined,
    type: "text", inputMode: decimals ? "decimal" as const : "numeric" as const, maxLength: 64,
    value: value == null || Number.isNaN(value) ? "" : value, disabled: selected === "unknown",
    "aria-describedby": description, "aria-invalid": error && selected !== "legacy_unclassified" ? true : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const currentStock = event.currentTarget.value || null;
      onChange({ currentStock, stockObservation: currentStock === null ? "unfilled" : "observed", stockObservationAt: new Date().toISOString() });
    },
  };
  return <div className={compact ? "hca-wizard-stock-field" : "space-y-2"}>
    {!useCheckbox ? <>
    <label className="block text-sm font-semibold" htmlFor={id + "-mode"}>Informação do estoque da equipe</label>
    <select id={id + "-mode"} data-field-error={error && selected === "legacy_unclassified" ? errorKey : undefined} className={inputClass} value={selected} aria-describedby={description} aria-invalid={error && selected === "legacy_unclassified" ? true : undefined}
      onChange={event => { const stockObservation = event.target.value as StockObservation; onChange({ stockObservation, currentStock: stockObservation === "observed" ? value : null, stockObservationAt: new Date().toISOString() }); }}>
      {selected === "legacy_unclassified" ? <option value="legacy_unclassified" disabled>Revisar observação do rascunho antigo</option> : null}
      <option value="unfilled">Não informado</option><option value="unknown">Não sei informar</option><option value="observed">Informar estoque atual</option>
    </select>
    </> : null}
    <label className="block text-sm font-semibold" htmlFor={id + "-quantity"}>Estoque atual{unit ? " · " + unit : ""}</label>
    {compact ? <WizardQuantityInput {...stockInput} unit={unit} /> : <input {...stockInput} className={inputClass} />}
    {useCheckbox ? <label className="hca-wizard-unknown-stock">
      <input type="checkbox" checked={selected === "unknown"} onChange={event => onChange({
        currentStock: event.currentTarget.checked ? null : suggested ?? null,
        stockObservation: event.currentTarget.checked ? "unknown" : suggested == null ? "unfilled" : "observed",
        stockObservationAt: new Date().toISOString(),
      })} />
      Não sei informar
    </label> : null}
    <p id={id + "-help"} className="text-xs text-(--muted)">
      {compact
        ? "Confira a quantidade com a equipe. Ao emitir, o valor informado atualiza o estoque. Use 0 se acabou ou marque “Não sei informar” para manter o saldo."
        : "Informe a quantidade com a equipe. Use 0 se o material acabou ou escolha “Não sei informar”."}
    </p>
    {error ? <p id={id + "-error"} className="ui-field-error">{error}</p> : null}
  </div>;
}
