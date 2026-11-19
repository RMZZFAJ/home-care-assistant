import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { formatStockObservation } from "@/lib/stock-observation";
import { materialHistoryObservation, type MaterialHistoryRow } from "@/lib/validation/document-material-context";

const decisionLabels: Record<string, { title: string; icon: IconName }> = {
  "req.issued": { title: "Contagem informada na requisição", icon: "note" },
  "req.item_resolved": { title: "Material extra identificado", icon: "link" },
  "com.approve": { title: "Compra autorizada", icon: "check-circle" },
  "com.purchase": { title: "Compra registrada", icon: "box" },
  "com.receive": { title: "Chegada informada", icon: "clock" },
  "com.validate_receipt": { title: "Chegada aprovada", icon: "check-circle" },
  "com.reject_receipt": { title: "Chegada recusada", icon: "close" },
  "com.request_receipt_correction": { title: "Correção solicitada", icon: "note" },
  "com.resubmit_receipt": { title: "Chegada corrigida e reenviada", icon: "refresh" },
  "com.arrival_coverage": { title: "Planejamento anterior coberto", icon: "link" },
  "ent.receive": { title: "Recebimento conferido", icon: "check-circle" },
  "ent.resolve": { title: "Divergência conciliada", icon: "check-circle" },
  "ent.request_fulfillment_review": { title: "Equipe pediu reavaliação da necessidade", icon: "note" },
  "ent.fulfillment_reviewed": { title: "Avaliação da necessidade atualizada", icon: "note" },
  "arrival.reported": { title: "Chegada avulsa informada", icon: "clock" },
  "arrival.approved": { title: "Chegada avulsa aprovada", icon: "check-circle" },
  "arrival.rejected": { title: "Chegada avulsa recusada", icon: "close" },
  "arrival.correction": { title: "Correção de chegada avulsa solicitada", icon: "note" },
  "arrival.resubmitted": { title: "Chegada avulsa corrigida e reenviada", icon: "refresh" },
};
const custody: Record<string, string> = { FAMILY: "Família", CARE_TEAM: "Equipe", TRANSIT: "Em trânsito" };
const resolutions: Record<string, string> = {
  received: "Recebimento complementar", missing: "Falta confirmada",
  returned: "Material devolvido à origem", not_sent: "Material não enviado",
};

function present(row: MaterialHistoryRow, defaultUnit: string | null) {
  const amount = row.quantity === null ? null : formatQuantity(row.quantity, (row.kind === "decision" ? row.unit : defaultUnit) ?? undefined);
  if (row.kind === "movement") {
    const label = row.type === "adjustment" ? "Ajuste de estoque"
      : row.type === "consumption" ? "Consumo registrado"
        : row.destination === "TRANSIT" ? "Materiais expedidos"
          : row.destination ? "Entrada no estoque" : "Saída do estoque";
    const icon = row.destination === "TRANSIT" ? "truck" : "history";
    return { title: label, icon, text: `${amount} · ${custody[row.source ?? ""] ?? "Entrada"} → ${custody[row.destination ?? ""] ?? "Retirada"}` } as const;
  }
  const label = decisionLabels[row.type] ?? { title: documentEventLabel(row.type), icon: "history" as const };
  switch (row.type) {
    case "req.issued": {
      const mode = materialHistoryObservation.safeParse(row.detail);
      return { ...label, text: formatStockObservation(row.quantity, mode.data, row.unit ?? undefined) };
    }
    case "ent.fulfillment_reviewed":
      return { ...label, text: [row.detail === "complete" ? "Atendimento completo" : "Atendimento parcial",
        amount ? `Quantidade aceita: ${amount}` : null].filter(Boolean).join(" · ") };
    case "ent.resolve":
      return { ...label, text: [row.detail ? resolutions[row.detail] : null, amount].filter(Boolean).join(" · ") };
    case "ent.receive":
      return { ...label, text: amount ? `Quantidade aceita: ${amount}` : null };
    default:
      return { ...label, text: amount };
  }
}

export function DocumentMaterialHistory({ rows, movementsAvailable, unit, reference }: {
  rows: MaterialHistoryRow[];
  movementsAvailable: boolean;
  unit: string | null;
  reference: (row: MaterialHistoryRow) => ReactNode;
}) {
  return <section>
    <h3>Movimentações e decisões</h3>
    {!movementsAvailable ? <p>Os movimentos de estoque dependem do acesso à custódia.</p> : null}
    {rows.length ? <ol className="hca-material-timeline">{rows.map(item => {
      const entry = present(item, unit);
      return <li key={item.id}>
        <span className="hca-material-timeline-icon"><Icon name={entry.icon} width={15} height={15} /></span>
        <div className="hca-material-timeline-main"><strong>{entry.title}</strong>
          {entry.text ? <p>{entry.text}</p> : null}
          {item.kind === "decision" && item.reason ? <p className="whitespace-pre-wrap">{item.reason}</p> : null}
          {reference(item)}
          <small>{item.author ?? "Autoria indisponível"} · {formatBrazilDate(item.createdAt)}</small>
        </div>
      </li>;
    })}</ol> : <p>Nenhum registro disponível para este material.</p>}
  </section>;
}
