"use client";

import { Menu } from "@base-ui/react/menu";
import { useState } from "react";
import { DefinitionGrid } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { formatQuantity } from "@/lib/quantity";
import type { SupplyDocument, SupplyLine } from "@/types/documents";
import { RelatedDocument } from "./related-document";

export function DeliveryMaterialMenu({ data, line, disabled }: {
  data: SupplyDocument; line: SupplyLine; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Menu.Root>
      <Menu.Trigger className="hca-control hca-control-icon" aria-label={"Opções de " + line.name_snapshot} disabled={disabled}><Icon name="more" /></Menu.Trigger>
      <MenuPopup>
        <Menu.Item className="hca-menu-item" onClick={() => setOpen(true)}><Icon name="info" />Ver material e vínculos</Menu.Item>
      </MenuPopup>
    </Menu.Root>
    {open ? <Dialog open title={line.name_snapshot} onClose={() => setOpen(false)}>
      <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Categoria", value: line.category_snapshot },
          { label: "Expedidas", value: formatQuantity(line.quantity, line.unit_snapshot) },
          { label: "Recebidas", value: formatQuantity(line.accepted_quantity, line.unit_snapshot) },
        ]} />
        <RelatedDocument id={data.id} type="ENT" label={data.kind === "DEV" ? "Ver devolução" : "Ver entrega"} compact />
        {data.transfer?.originDocumentId ? <RelatedDocument id={data.transfer.originDocumentId} type="ENT" label="Abrir entrega de origem" compact /> : null}
        {data.originDocuments?.filter(origin => origin.productIds.includes(line.product_id)).map(origin => (
          <RelatedDocument key={origin.documentId} id={origin.documentId} type={origin.type} label={origin.code} compact />
        ))}
        {data.linkedRequisitions?.filter(req => req.itemIds.some(id => line.requisitionItemIds.includes(id))).map(req => (
          <RelatedDocument key={req.id} id={req.id} label={"Ver requisição " + req.code} compact />
        ))}
      </div>
    </Dialog> : null}
  </>;
}
