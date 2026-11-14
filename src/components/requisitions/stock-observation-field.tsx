"use client";
import { useId } from "react";
import { inputClass } from "@/components/workspace";
import type { StockObservation } from "@/types/requisition";
import { formatStockObservationTime } from "@/lib/stock-observation";

export function StockObservationField({ value, mode, at, decimals = 6, unit, error, errorKey, onChange }: {
  value: string | number | null; mode?: StockObservation; at?: string | null; decimals?: number; unit?: string; error?: string;
  errorKey?: string; onChange: (change: { currentStock: string | number | null; stockObservation: StockObservation; stockObservationAt: string }) => void;
}) {
  const id = useId(), selected = mode ?? (value == null ? "unfilled" : "legacy_unclassified");
  const description = id + "-help" + (error ? " " + id + "-error" : "");
  return <div className="space-y-2">
    <label className="block text-sm font-semibold" htmlFor={id + "-mode"}>Informação do estoque da equipe</label>
    <select id={id + "-mode"} data-field-error={error && selected === "legacy_unclassified" ? errorKey : undefined} className={inputClass} value={selected} aria-describedby={description} aria-invalid={error && selected === "legacy_unclassified" ? true : undefined}
      onChange={event => { const stockObservation = event.target.value as StockObservation; onChange({ stockObservation, currentStock: stockObservation === "observed" ? value : null, stockObservationAt: new Date().toISOString() }); }}>
      {selected === "legacy_unclassified" ? <option value="legacy_unclassified" disabled>Revisar observação do rascunho antigo</option> : null}
      <option value="unfilled">Não informado</option><option value="unknown">Não sei informar</option><option value="observed">Observei e vou informar</option>
    </select>
    <label className="block text-sm font-semibold" htmlFor={id + "-quantity"}>Estoque observado com a equipe{unit ? " · " + unit : ""}</label>
    <input id={id + "-quantity"} data-field-error={error && selected !== "legacy_unclassified" ? errorKey : undefined} className={inputClass} type="text" inputMode={decimals ? "decimal" : "numeric"} maxLength={64}
      value={value == null || Number.isNaN(value) ? "" : value} disabled={selected === "unknown"} aria-describedby={description} aria-invalid={error && selected !== "legacy_unclassified" ? true : undefined}
      onChange={event => onChange({ ...(event.target.value === "" ? { currentStock: null, stockObservation: "unfilled" as const } : { currentStock: event.target.value, stockObservation: "observed" as const }), stockObservationAt: new Date().toISOString() })} />
    <p id={id + "-help"} className="text-xs text-(--muted)">Vazio significa não informado. Digite 0 somente se observou zero; o saldo calculado não preenche esta observação. Faixa: 0 a 100000. {decimals ? `Até ${decimals} casas decimais.` : "Somente unidades inteiras."}</p>
    <p className="text-xs text-(--muted)">{formatStockObservationTime(at)}</p>
    {error ? <p id={id + "-error"} className="ui-field-error">{error}</p> : null}
  </div>;
}
