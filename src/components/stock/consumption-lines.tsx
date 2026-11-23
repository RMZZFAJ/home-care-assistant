import type { ReactNode } from "react";
import { formatQuantity } from "@/lib/quantity";
import type { ConsumptionLine } from "@/types/consumption";
import { MaterialReview } from "@/components/documents/material-review";
export function ConsumptionLines({ lines, renderConsult, emptyMessage }: {
  lines: ConsumptionLine[];
  renderConsult?: (line: ConsumptionLine) => ReactNode;
  emptyMessage?: string;
}) {
  return lines.length ? (
    <MaterialReview rows={lines.map(line => ({ id: line.productId, name: line.name ?? "Nome não preservado no relato",
      consult: renderConsult?.(line), details: <>
          <small>{line.quantity === null ? "Quantidade não informada" : formatQuantity(line.quantity, line.unit)}</small>
          {!line.name ? (
            <span className="block text-xs text-(--muted) break-all">
              Referência preservada: {line.productId}
            </span>
          ) : null}</> }))} />
  ) : (
    <p className="my-3 text-sm">
      {emptyMessage ?? "Sem materiais e quantidades estruturados. O texto permanece registrado; consumo precisa de complemento antes do desconto."}
    </p>
  );
}
