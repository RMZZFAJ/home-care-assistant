"use client";

import { useState } from "react";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { environmentLabels, incidentLabels, operationLabels, type Diagnostics } from "@/lib/operations/contracts";
import { formatBrazilDate } from "@/lib/receipt";

export function TechnicalEvents({ data }: { data: Diagnostics }) {
  const [selected, setSelected] = useState<{ id: string; opener: HTMLButtonElement } | null>(null);
  const event = data.events.find(item => item.id === selected?.id);
  const close = () => setSelected(null);

  return <section className="ui-card hca-technical-list" aria-label="Eventos recentes">
    <header className="hca-technical-cardhead"><h3>Eventos recentes</h3></header>
    {data.events.length ? <ul>{data.events.map(item => <li key={item.id}>
      <button type="button" className="hca-guide-row" onClick={click => setSelected({ id: item.id, opener: click.currentTarget })}>
        <span className="hca-guide-row-icon"><Icon name={item.severity === "info" ? "clock" : "history"} /></span>
        <span className="hca-guide-row-label"><strong>{incidentLabels[item.code]}</strong>
          <small>{formatBrazilDate(item.at)} · {operationLabels[item.component]}</small>
        </span>
        <Icon name="chevron" width={16} />
      </button>
    </li>)}</ul> : <p className="hca-technical-card-hint">Nenhum evento registrado neste ambiente.</p>}
    {event && selected && <Dialog open title={incidentLabels[event.code]} headingIcon="history" keyboardScrollable onClose={close}
      finalFocus={() => selected.opener.isConnected ? selected.opener : false}
      footer={<ActionButton variant="primary" onClick={close}>Voltar aos eventos</ActionButton>}>
      <div className="hca-form">
        <DefinitionGrid items={[
          { label: "Ambiente", value: environmentLabels[data.environment] }, { label: "Componente", value: operationLabels[event.component] },
          { label: "Observação", value: formatBrazilDate(event.at) }, { label: "Correlação", value: event.correlationId, wide: true },
        ]} />
        <p className="hca-field-hint">Este evento registra uma observação pontual. Consulte o histórico do ambiente para acompanhar sua evolução.</p>
      </div>
    </Dialog>}
  </section>;
}
