import { DefinitionGrid } from "@/components/ui/controls";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { ConsumptionLine, ConsumptionReport } from "@/types/consumption";

const movementLabels = {
  issue: "Baixa do consumo",
  correct: "Correção do consumo",
  cancel: "Compensação do cancelamento",
  shortage: "Movimento vinculado",
};

export function ConsumptionMaterialFacts({ report, material }: {
  report: ConsumptionReport;
  material: ConsumptionLine;
}) {
  const line = report.current_lines.find(item => item.productId === material.productId);
  const movements = report.movements.filter(item => item.productId === material.productId);
  const acts = new Map(report.acts?.map(act => [act.id, act]));
  const quantityLabel = report.kind === "shortage" ? "Quantidade informada no aviso"
    : report.status === "cancelled" ? "Quantidade no registro cancelado"
      : report.status === "recorded" || report.status === "confirmed" ? "Quantidade contabilizada"
        : "Quantidade declarada";
  const displayQuantity = (value?: string | null) =>
    value == null ? "Não informado" : formatQuantity(value, material.unit);

  return <div className="hca-form-stack">
    <DefinitionGrid items={[{
      label: quantityLabel,
      value: line ? displayQuantity(line.quantity) : "Material fora da versão atual",
    }]} />
    {movements.length ? <div className="hca-form-stack">
      {movements.map(movement => {
        const act = movement.actId ? acts.get(movement.actId) : undefined;
        const sign = movement.source === report.location ? "−"
          : movement.destination === report.location ? "+" : "";
        return <section key={movement.id}>
          <h4>{act ? movementLabels[act.action] : "Movimento da conferência"}
            {act ? " · versão " + act.version : ""}</h4>
          <p className="hca-muted">{formatBrazilDate(movement.createdAt)}</p>
          <DefinitionGrid items={[
            { label: "Saldo anterior", value: displayQuantity(movement.balanceBefore) },
            { label: "Efeito no saldo", value: sign ? sign + displayQuantity(movement.quantity) : "Não informado" },
            { label: "Saldo após o registro", value: displayQuantity(movement.balanceAfter) },
          ]} />
        </section>;
      })}
    </div> : <p>{report.kind === "shortage"
      ? "O aviso de falta comunica a necessidade à família sem alterar o estoque."
      : "Nenhum movimento de estoque está vinculado a este material nesta consulta."}</p>}
  </div>;
}
