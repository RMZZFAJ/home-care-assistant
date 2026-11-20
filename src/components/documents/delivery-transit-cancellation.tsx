"use client";

import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { cancelledTransitReturn } from "@/lib/documents/delivery-receipt";
import { deliveryTransit } from "@/lib/documents/family-fulfillment";
import { formatQuantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";

function origin(data: SupplyDocument) {
  return data.payload.source === "CARE_TEAM" ? "da equipe" : "da família";
}

export function DeliveryTransitCancellationFacts({ data }: { data: SupplyDocument }) {
  const lines = data.lines.filter(line => deliveryTransit(line).gt(0));
  return <>
    <ul className="hca-cancellation-checklist">
      <li><Icon name="check" /><div><strong>Vínculos e histórico</strong><p>Os registros anteriores serão preservados.</p></div></li>
      <li><Icon name="check" /><div><strong>Ainda sem recebimento</strong><p>{lines.length === 1 ? "Um material ainda está em trânsito." : `${lines.length} materiais ainda estão em trânsito.`}</p></div></li>
    </ul>
    {lines.map(line => {
      const amount = formatQuantity(deliveryTransit(line).toFixed(), line.unit_snapshot);
      return <article key={line.id} className="hca-receipt-line">
        <header><div><h3>{line.name_snapshot}</h3><p>{line.unit_snapshot}</p></div></header>
        <DefinitionGrid className="hca-transit-quantities" items={[
          { label: "Em trânsito", value: amount },
          { label: "Após cancelar", value: "0 em trânsito" },
          { label: "Retorno à origem", value: amount + " ao estoque " + origin(data) },
        ]} />
      </article>;
    })}
    <p className="hca-muted">Confirme somente se a expedição foi interrompida e os materiais estão novamente com a origem.</p>
  </>;
}

export function DeliveryTransitCancellationResult({ data, onClose }: { data: SupplyDocument; onClose: () => void }) {
  return <Dialog open success title="Ficha cancelada" subtitle={`Os materiais retornaram ao estoque ${origin(data)}. O trânsito foi encerrado.`}
    onClose={onClose} footer={<ActionButton variant="primary" onClick={onClose}>Voltar à ficha</ActionButton>}>
    <div className="hca-delivery-receipt">
      {data.lines.map(line => {
        const returned = cancelledTransitReturn(line.metadata);
        return returned ? <article className="hca-receipt-line" key={line.id}>
          <h3>{line.name_snapshot}</h3><p>{formatQuantity(returned, line.unit_snapshot)} retornaram à origem.</p>
        </article> : null;
      })}
    </div>
  </Dialog>;
}
