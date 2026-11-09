import { formatQuantity } from "@/lib/quantity";
import type { ConsumptionLine } from "@/types/consumption";
export function ConsumptionLines({ lines }: { lines: ConsumptionLine[] }) {
  return lines.length ? (
    <ul className="my-3 space-y-2">
      {lines.map((line) => (
        <li key={line.productId} className="wrap-break-word">
          <strong>{line.name ?? "Nome não preservado no relato"}</strong> ·{" "}
          {formatQuantity(line.quantity, line.unit)}
          {!line.name ? (
            <span className="block text-xs text-(--muted) break-all">
              Referência preservada: {line.productId}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  ) : (
    <p className="my-3 text-sm">
      Sem materiais e quantidades estruturados. O texto permanece registrado;
      consumo precisa de complemento antes do desconto.
    </p>
  );
}
