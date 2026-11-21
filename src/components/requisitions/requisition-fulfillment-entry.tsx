"use client";

import { useCallback, useState, type RefObject } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { activeDocumentArchive } from "@/lib/documents/document-archive";
import { awaitsDeliveryNeed, linkedDeliveryNeed } from "@/lib/documents/family-fulfillment";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { RequisitionDelivery } from "@/lib/requisitions/follow-up";
import { useScopedRead } from "@/lib/use-scoped-read";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { FamilyFulfillmentReview } from "@/components/documents/family-fulfillment-review";

export function RequisitionFulfillmentEntry({ context, patientId, itemId, name, deliveries, opener, onClose, onReviewed }: {
  context: WorkspaceContext;
  patientId: string;
  itemId: string;
  name: string;
  deliveries: RequisitionDelivery[];
  opener: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [deliveryId, setDeliveryId] = useState(deliveries.length === 1 ? deliveries[0].id : null);
  const [lineId, setLineId] = useState<string | null>(null);
  const decode = useCallback((raw: unknown) => {
    const data = raw && typeof raw === "object" && "data" in raw ? raw.data : null;
    return requireSupplyConfirmation({ data, persistence: "confirmed" }, { id: deliveryId ?? undefined, patientId, type: "ENT" });
  }, [deliveryId, patientId]);
  const read = useScopedRead(deliveryId ? `/api/documents/${deliveryId}` : null, context.userId, decode);
  const data = read.loading || read.error ? null : read.data;
  const eligible = data?.kind === "ENT" && data.workflow_data.acceptedAt &&
    ["confirmed", "disputed"].includes(data.status) && !activeDocumentArchive(data.workflow_data.documentArchive);
  const lines = data && eligible ? data.lines.filter(line => line.requisitionItemIds.includes(itemId) && linkedDeliveryNeed(data, line) &&
    (awaitsDeliveryNeed(data, line) || quantity(line.accepted_quantity).gt(0))) : [];
  const selected = lines.length === 1 ? lines[0] : lines.find(line => line.id === lineId);

  if (data && selected) return <FamilyFulfillmentReview key={selected.id} data={data} context={context}
    opening={{ lineId: selected.id, onClose, opener }} onReviewed={onReviewed} />;

  return <Dialog open title="Avaliar suficiência" subtitle={name} finalFocus={opener} onClose={onClose} footer={<>
    <ActionButton onClick={onClose}>Voltar</ActionButton>
    {deliveryId && deliveries.length > 1 ? <ActionButton onClick={() => { setDeliveryId(null); setLineId(null); }}>Escolher outra entrega</ActionButton> : null}
  </>}>
    <div className="hca-form-stack">
      {!deliveryId ? <>{deliveries.map(delivery => <ActionButton key={delivery.id} onClick={() => setDeliveryId(delivery.id)}>
        {delivery.code ?? "Entrega vinculada"}{delivery.acceptedQuantity !== null ? ` · ${formatQuantity(delivery.acceptedQuantity)} recebidos` : ""}
      </ActionButton>)}</> : read.loading ? <p role="status">Consultando a entrega vinculada…</p> : read.error ? <>
        <Notice error>{read.error}</Notice><ActionButton onClick={read.refresh}>Tentar novamente</ActionButton>
      </> : lines.length ? <>{lines.map(line => <ActionButton key={line.id} onClick={() => setLineId(line.id)}>
        {line.name_snapshot} · {formatQuantity(line.accepted_quantity, line.unit_snapshot)} recebidos
      </ActionButton>)}</> : <p>A entrega vinculada está indisponível para avaliação.</p>}
    </div>
  </Dialog>;
}
