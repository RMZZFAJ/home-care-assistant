"use client";
import { useId } from "react";
import { inputClass } from "@/components/workspace";
import type { StockObservation } from "@/types/requisition";
import { formatStockObservationTime } from "@/lib/stock-observation";

export function StockObservationField({ value, mode, at, suggested, decimals = 6, unit, error, errorKey, onChange, compact = false }: {
  value: string | number | null; mode?: StockObservation; at?: string | null; suggested?: string | null; decimals?: number; unit?: string; error?: string;
  errorKey?: string; onChange: (change: { currentStock: string | number | null; stockObservation: StockObservation; stockObservationAt: string }) => void;
  compact?: boolean;
}) {
  const id = useId(), selected = mode ?? (value == null ? "unfilled" : "legacy_unclassified");
  const description = id + "-help" + (error ? " " + id + "-error" : "");
  const useCheckbox = compact && selected !== "legacy_unclassified";
  return <div className={compact ? "hca-wizard-stock-field" : "space-y-2"}>
    {!useCheckbox ? <>
    <label className="block text-sm font-semibold" htmlFor={id + "-mode"}>Informação do estoque da equipe</label>
    <select id={id + "-mode"} data-field-error={error && selected === "legacy_unclassified" ? errorKey : undefined} className={inputClass} value={selected} aria-describedby={description} aria-invalid={error && selected === "legacy_unclassified" ? true : undefined}
      onChange={event => { const stockObservation = event.target.value as StockObservation; onChange({ stockObservation, currentStock: stockObservation === "observed" ? value : null, stockObservationAt: new Date().toISOString() }); }}>
      {selected === "legacy_unclassified" ? <option value="legacy_unclassified" disabled>Revisar observação do rascunho antigo</option> : null}
      <option value="unfilled">Não informado</option><option value="unknown">Não sei informar</option><option value="observed">Observei e vou informar</option>
    </select>
    </> : null}
    <label className="block text-sm font-semibold" htmlFor={id + "-quantity"}>Estoque observado com a equipe{unit ? " · " + unit : ""}</label>
    <div className={compact ? "hca-wizard-stock-input" : undefined}>
    <input id={id + "-quantity"} data-field-error={error && selected !== "legacy_unclassified" ? errorKey : undefined} className={inputClass} type="text" inputMode={decimals ? "decimal" : "numeric"} maxLength={64}
      value={value == null || Number.isNaN(value) ? "" : value} disabled={selected === "unknown"} aria-describedby={description} aria-invalid={error && selected !== "legacy_unclassified" ? true : undefined}
      onChange={event => onChange({ ...(event.target.value === "" ? { currentStock: null, stockObservation: "unfilled" as const } : { currentStock: event.target.value, stockObservation: "observed" as const }), stockObservationAt: new Date().toISOString() })} />
    {compact && unit ? <span aria-hidden="true">{unit}</span> : null}
    </div>
    {useCheckbox ? <label className="hca-wizard-unknown-stock">
      <input type="checkbox" checked={selected === "unknown"} onChange={event => onChange({
        currentStock: null, stockObservation: event.currentTarget.checked ? "unknown" : "unfilled",
        stockObservationAt: new Date().toISOString(),
      })} />
      Não sei informar
    </label> : null}
    <p id={id + "-help"} className="text-xs text-(--muted)">
      {suggested == null
        ? "Vazio significa não informado. Digite 0 somente se observou zero."
        : value == null ? `Saldo de referência da equipe: ${suggested}. Informe o que você observou.`
          : "Confira a quantidade sugerida pelo saldo da equipe e ajuste conforme a contagem."}{" "}
      Faixa de 0 a 100000. {decimals ? `Até ${decimals} casas decimais.` : "Somente unidades inteiras."}
    </p>
    <p className="text-xs text-(--muted)">{formatStockObservationTime(at)}</p>
    {error ? <p id={id + "-error"} className="ui-field-error">{error}</p> : null}
  </div>;
}
