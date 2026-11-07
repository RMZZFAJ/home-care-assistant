import { formatQuantity, quantity, validQuantity } from "./quantity";
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

export function validStockObservation(line: { currentStock: string | number | null; stockObservation?: StockObservation }, decimals = 6) {
  if (line.stockObservation === "unknown" || line.stockObservation === "unfilled") return line.currentStock === null;
  if (line.stockObservation !== "observed" || line.currentStock === null) return false;
  const raw = String(line.currentStock);
  if (raw.length > 64 || !/^\d+(?:[.,]\d+)?$/.test(raw)) return false;
  return quantity(raw).lte(100000) && validQuantity(quantity(raw).toFixed(), decimals, true);
}

export function restoreStockObservation<T extends { currentStock: string | number | null; stockObservation?: StockObservation }>(line: T) {
  const value = typeof line.currentStock === "string" || typeof line.currentStock === "number" && Number.isFinite(line.currentStock) ? line.currentStock : null;
  return { ...line, currentStock: value, stockObservation: line.stockObservation ?? (value == null ? "unfilled" as const : "legacy_unclassified" as const) };
}
