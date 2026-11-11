import { ActionButton, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
import { formatBrazilDate } from "@/lib/receipt";
import type { ConsumptionSummary } from "@/types/consumption";

export function ConsumptionRecord({ row, onOpen }: { row: ConsumptionSummary; onOpen: (target: HTMLElement) => void }) {
  return <li className="hca-consumption-record" data-consumption-id={row.id}>
    <span className="hca-consumption-icon"><Icon name="note" /></span>
    <div className="hca-consumption-main">
      <strong>{row.kind === "shortage" ? "Falta" : "Consumo"} · {row.location === "FAMILY" ? "Família" : "Equipe"}</strong>
      <p className="whitespace-pre-wrap wrap-break-word">{row.body}</p>
      <small>{row.reported_name ?? "Nome original não preservado"} · {formatBrazilDate(row.created_at)} · versão {row.version}</small>
    </div>
    <div className="hca-consumption-end">
      <Pill tone={row.status === "reported" ? "warning" : row.status === "confirmed" ? "success" : "danger"}>{row.status === "reported" ? "Aguardando conferência" : row.status === "confirmed" ? "Confirmado" : "Rejeitado"}</Pill>
      <ActionButton onClick={event => onOpen(event.currentTarget)}>Abrir relato <span className="sr-only">{row.id}</span></ActionButton>
    </div>
  </li>;
}
