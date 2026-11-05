import { formatQuantity, validQuantity } from "./quantity";
import { formatBrazilDate } from "./receipt";
import type { StockObservation, StockObservationTimeSource } from "@/types/requisition";

export function formatStockObservationTime(at?: string | null, source: StockObservationTimeSource = "client_draft") {
  if (!at || source === "legacy_unknown") return "Horário da informação desconhecido";
  return (source === "client_draft" ? "Registro no rascunho (horário do dispositivo): " : "Informação recebida na emissão: ") + formatBrazilDate(at);
}

export function formatStockObservation(value: string | number | null | undefined, mode?: StockObservation, unit?: string) {
  if (mode === "unknown") return "Não sei informar";
  if (mode === "unfilled") return "Não informado";
  if (mode === "observed") return value == null ? "Valor observado indisponível" : formatQuantity(value, unit) + " (observado)";
  return value == null ? "Não informado no registro legado" : formatQuantity(value, unit) + " · observação legada sem classificação";
}

export function validStockObservation(line: { currentStock: number | null; stockObservation?: StockObservation }, decimals = 6) {
  if (line.stockObservation === "unknown" || line.stockObservation === "unfilled") return line.currentStock === null;
  return line.stockObservation === "observed" && line.currentStock !== null && line.currentStock <= 100000 && validQuantity(String(line.currentStock), decimals, true);
}

export function restoreStockObservation<T extends { currentStock: number | null; stockObservation?: StockObservation }>(line: T) {
  return { ...line, currentStock: Number.isFinite(line.currentStock) ? line.currentStock : null, stockObservation: line.stockObservation ?? (line.currentStock == null ? "unfilled" as const : "legacy_unclassified" as const) };
}
