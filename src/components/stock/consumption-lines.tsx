import { formatQuantity } from "@/lib/quantity";
import type { ConsumptionLine } from "@/types/consumption";
import { MaterialReview } from "@/components/documents/material-review";
export function ConsumptionLines({ lines }: { lines: ConsumptionLine[] }) {
  return lines.length ? (
    <MaterialReview rows={lines.map(line => ({ id: line.productId, name: line.name ?? "Nome não preservado no relato", details: <>
          <small>{formatQuantity(line.quantity, line.unit)}</small>
          {!line.name ? (
            <span className="block text-xs text-(--muted) break-all">
              Referência preservada: {line.productId}
            </span>
          ) : null}</> }))} />
  ) : (
    <p className="my-3 text-sm">
      Sem materiais e quantidades estruturados. O texto permanece registrado;
      consumo precisa de complemento antes do desconto.
    </p>
  );
}
