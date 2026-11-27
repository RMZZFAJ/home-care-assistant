import { Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { consumptionStateLabels } from "@/lib/consumption/follow-up";
import type { ConsumptionSummary } from "@/types/consumption";

export function ConsumptionRecord({ row, onOpen }: { row: ConsumptionSummary; onOpen: (target: HTMLElement) => void }) {
  const shortage = row.kind === "shortage";
  const custody = row.location === "FAMILY" ? "Família" : "Equipe";
  const type = shortage ? "Aviso de falta" : row.workflow_mode === "direct" ? "Consumo do plantão" : "Relato de consumo";
  const materials = row.materials ?? [];
  const summary = materials.slice(0, 3).map(material => shortage
    ? material.name
    : `${formatQuantity(material.quantity, material.unit ?? undefined)} de ${material.name}`).join(" · ");
  const extra = materials.length - 3;
  const recordContent = `consumption-card-${row.id}`;
  return <li className="hca-consumption-record" data-consumption-id={row.id}>
    <button type="button" className="hca-consumption-card" onClick={event => onOpen(event.currentTarget)}
      aria-label={"Abrir relato " + row.id} aria-describedby={recordContent}>
      <span className="sr-only">{row.id}</span>
      <span id={recordContent} className="hca-consumption-card-content">
        <span className="hca-consumption-card-top">
          <strong>{row.code ?? custody}</strong>
          <Pill tone={row.status === "reported" ? "warning" : row.status === "rejected" || row.status === "cancelled" ? "danger" : "success"}>
            {consumptionStateLabels[row.status]}
          </Pill>
        </span>
        <strong className="hca-consumption-card-title">
          <Icon name={shortage ? "bell" : "note"} width={17} height={17} /> {type}
        </strong>
        {summary ? <span className="hca-consumption-card-materials">
          {summary}{extra > 0 ? ` · mais ${extra} ${extra === 1 ? "material" : "materiais"}` : ""}
        </span> : null}
        {row.body.trim() ? <span className="hca-consumption-card-note">{row.body}</span> : null}
        <span className="hca-consumption-card-footer">
          <span>
            {row.reported_name ?? "Nome original não preservado"}
            <small>{row.code ? <><span>{custody}</span> · </> : null}{formatBrazilDate(row.created_at)} · versão {row.version}</small>
          </span>
          <Icon name="chevron" width={17} height={17} />
        </span>
      </span>
    </button>
  </li>;
}
